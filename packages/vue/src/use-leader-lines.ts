import { onScopeDispose, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import LeaderLine from '@lionad/leader-line';
import { resolveAnchor, type AnchorValue, type MaybeAnchor } from './resolve-anchor';
import { resolveOptions, type LeaderLineVueOptions } from './use-leader-line';
import { createLineRegistry, type LineRegistry } from './registry';
import { injectLeaderLineDefaults } from './defaults';

/**
 * useLeaderLines —— 响应式数组驱动的批量连线。
 * keyed diff:新 key 创建、同 key 就地更新(options setOptions / 锚点直接赋值,不重建)、
 * 消失 key 移除。数组重排零重建——语义与 v-for 的 key 对齐。
 */

/** 边描述:start/end/data/key 是保留键,其余键全部视作线 options */
export interface EdgeInput extends LeaderLineVueOptions {
  key?: string;
  start: MaybeAnchor;
  end: MaybeAnchor;
  /** 领域数据(字段映射 id 等),随注册表查询透出,不进线 options */
  data?: unknown;
}

export interface EdgeQueryEntry {
  key: string;
  line: LeaderLine;
  data: unknown;
}

export interface UseLeaderLinesConfig {
  /** key 提取;缺省取 edge.key,再退化为索引(索引语义:中间插入会导致后续线重建) */
  key?: (edge: EdgeInput, index: number) => string;
  /** 同 (start, end) 锚点对去重(字段映射场景:重复拖拽只保留一条) */
  preventSame?: boolean;
  /** 关闭 options 深度响应(默认开启) */
  watchOptions?: boolean;
}

const RESERVED_KEYS = new Set(['key', 'start', 'end', 'data']);

/** 边的非保留键即线 options */
const edgeOptions = (edge: EdgeInput): LeaderLineVueOptions => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(edge)) {
    if (!RESERVED_KEYS.has(k)) out[k] = v;
  }
  return out as LeaderLineVueOptions;
};

/** 注册表内部状态:锚点与已解析 options 用于增量比对,data 是用户领域数据 */
interface EdgeState {
  anchors: { start: AnchorValue; end: AnchorValue };
  options: LeaderLine.Options;
  userData: unknown;
}

/** 浅比对;元组类值(plugSE 等数组)逐项比对,避免每次 diff 都触发 setOptions */
const sameOptions = (a: LeaderLine.Options, b: LeaderLine.Options): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => {
    const va = (a as Record<string, unknown>)[k];
    const vb = (b as Record<string, unknown>)[k];
    if (Object.is(va, vb)) return true;
    return (
      Array.isArray(va) &&
      Array.isArray(vb) &&
      va.length === vb.length &&
      va.every((x, i) => Object.is(x, vb[i]))
    );
  });
};

export interface UseLeaderLinesReturn {
  /** 当前存活线实例的快照(每次 diff 后更新,可直接 watch) */
  lines: Readonly<Ref<LeaderLine[]>>;
  size: Readonly<Ref<number>>;
  getLine: (key: string) => LeaderLine | undefined;
  findWhere: (pred: (entry: EdgeQueryEntry) => boolean) => EdgeQueryEntry[];
  removeWhere: (pred: (entry: EdgeQueryEntry) => boolean) => number;
  clear: () => void;
}

export function useLeaderLines(
  edges: MaybeRefOrGetter<EdgeInput[]>,
  config: UseLeaderLinesConfig = {}
): UseLeaderLinesReturn {
  const registry: LineRegistry<LeaderLine, EdgeState> = createLineRegistry();
  const lines = shallowRef<LeaderLine[]>([]);
  const size = shallowRef(0);
  // 注入默认:每条边的 options 叠在其上(调用处优先)
  const defaults = injectLeaderLineDefaults();

  const keyOf = (edge: EdgeInput, index: number): string =>
    config.key?.(edge, index) ?? edge.key ?? String(index);

  const toQuery = (key: string, line: LeaderLine, state: EdgeState): EdgeQueryEntry => ({
    key,
    line,
    data: state.userData
  });

  const syncSnapshot = () => {
    lines.value = registry.findWhere(() => true).map(e => e.line);
    size.value = registry.size;
  };

  const diff = () => {
    // SSR 不产生线
    if (typeof window === 'undefined') return;
    const list = toValue(edges) ?? [];
    const seen = new Set<string>();

    list.forEach((edge, index) => {
      const key = keyOf(edge, index);
      seen.add(key);
      const start = resolveAnchor(edge.start);
      const end = resolveAnchor(edge.end);
      // 锚点未就绪的边跳过(不创建也不移除已存在的同 key 线:等下次 diff)
      if (!start || !end) return;

      const options: LeaderLine.Options = {
        ...resolveOptions(defaults),
        ...resolveOptions(edgeOptions(edge))
      };

      const existed = registry.get(key);
      if (existed) {
        const { line, data: state } = existed;
        // 同 key 就地更新:锚点可写(accessor 原生支持),重建会中断动画与标签
        if (state.anchors.start !== start) line.start = start;
        if (state.anchors.end !== end) line.end = end;
        if (!sameOptions(state.options, options)) line.setOptions(options);
        state.anchors = { start, end };
        state.options = options;
        state.userData = edge.data;
        return;
      }

      if (config.preventSame) {
        const dup = registry.findWhere(
          e => e.data.anchors.start === start && e.data.anchors.end === end
        );
        // 同锚点对已有线:跳过创建,但也不占用 key(seen 已记录,旧线不删)
        if (dup.length) return;
      }

      const line = new LeaderLine(start, end, options);
      registry.set(key, line, { anchors: { start, end }, options, userData: edge.data });
    });

    // 消失的 key 统一移除(不在本轮 seen 中且不是"锚点未就绪跳过"的)
    const unready = new Set(
      list
        .map((edge, index) => ({ edge, index }))
        .filter(({ edge }) => !resolveAnchor(edge.start) || !resolveAnchor(edge.end))
        .map(({ edge, index }) => keyOf(edge, index))
    );
    registry.removeWhere(e => !seen.has(e.key) && !unready.has(e.key));

    syncSnapshot();
  };

  // deep:跟踪数组内 edge 字段与其中的 ref 锚点;flush post 等模板提交。
  // watchOptions:false 退化为浅 watch——仅数组身份变化(整体替换)才 diff
  watch(() => toValue(edges), diff, {
    immediate: true,
    deep: config.watchOptions !== false,
    flush: 'post'
  });

  onScopeDispose(() => {
    registry.clear();
    syncSnapshot();
  });

  return {
    lines,
    size,
    getLine: key => registry.get(key)?.line,
    findWhere: pred =>
      registry
        .findWhere(e => pred(toQuery(e.key, e.line, e.data)))
        .map(e => toQuery(e.key, e.line, e.data)),
    removeWhere: pred => {
      const n = registry.removeWhere(e => pred(toQuery(e.key, e.line, e.data)));
      if (n) syncSnapshot();
      return n;
    },
    clear: () => {
      registry.clear();
      syncSnapshot();
    }
  };
}
