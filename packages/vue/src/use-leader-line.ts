import { computed, onScopeDispose, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import LeaderLine from '@lionad/leader-line';
import { resolveAnchor, type MaybeAnchor } from './resolve-anchor';

/**
 * useLeaderLine —— 单条连线的声明式封装。
 * 生命周期:锚点就绪(flush post 等模板提交)→ 创建;scope dispose → remove。
 * options 深度响应:字段值可为 ref/getter,变更自动 setOptions。
 */

/** 1.x 经典别名(库构造与 setOptions 原生支持,见 src/leader-line.js 别名映射表,透传即可) */
export interface LeaderLineAliases {
  color?: string;
  size?: number;
  startPlug?: LeaderLine.PlugType;
  endPlug?: LeaderLine.PlugType;
  startSocketGravity?: LeaderLine.SocketGravity;
  endSocketGravity?: LeaderLine.SocketGravity;
  startPlugColor?: string;
  endPlugColor?: string;
  startPlugSize?: number;
  endPlugSize?: number;
  outline?: boolean;
  outlineColor?: string;
  outlineSize?: number;
  startPlugOutline?: boolean;
  endPlugOutline?: boolean;
  startPlugOutlineColor?: string;
  endPlugOutlineColor?: string;
  startPlugOutlineSize?: number;
  endPlugOutlineSize?: number;
}

/** options 每个字段都允许 ref/getter 形态;值可为 null(如 attachment 挂载前的空窗) */
export type MaybeRefOptions<T> = { [K in keyof T]?: MaybeRefOrGetter<T[K] | null> };

export type LeaderLineVueOptions = MaybeRefOptions<LeaderLine.Options> & MaybeRefOptions<LeaderLineAliases>;

export interface UseLeaderLineConfig {
  /** 关闭 options 深度响应(默认开启),关闭后仅创建时读取一次 */
  watchOptions?: boolean;
}

/** 解包 options 各字段的 ref/getter,产出库可消费的纯值对象 */
export function resolveOptions(options: LeaderLineVueOptions): LeaderLine.Options {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(options)) {
    // undefined/null 键值不透传:库语义里缺省 ≈ 取默认,显式传反而干扰别名归并
    const value = toValue(v);
    if (value !== undefined && value !== null) out[k] = value;
  }
  return out as LeaderLine.Options;
}

export interface UseLeaderLineReturn {
  /** shallowRef(仅类型层只读):LeaderLine 实例是 DOM 操作对象,绝不允许 deep reactive 代理 */
  line: Readonly<Ref<LeaderLine | null>>;
  isReady: Readonly<Ref<boolean>>;
  setOptions: (options: LeaderLineVueOptions) => void;
  position: () => void;
  requestPosition: () => void;
  show: (effectName?: LeaderLine.ShowEffectName, animOptions?: LeaderLine.AnimOptions) => void;
  hide: (effectName?: LeaderLine.ShowEffectName, animOptions?: LeaderLine.AnimOptions) => void;
  remove: () => void;
}

export function useLeaderLine(
  start: MaybeAnchor,
  end: MaybeAnchor,
  options: LeaderLineVueOptions = {},
  config: UseLeaderLineConfig = {}
): UseLeaderLineReturn {
  const line = shallowRef<LeaderLine | null>(null);
  const isReady = computed(() => line.value !== null);

  const remove = () => {
    line.value?.remove();
    line.value = null;
  };

  const create = () => {
    // SSR 不产生线:无 DOM 可测,库一触碰 document 就会炸
    if (typeof window === 'undefined') return;
    const s = resolveAnchor(start);
    const e = resolveAnchor(end);
    // 锚点未就绪(v-if 延迟/selector 未命中)不报错,留给下次 watch 触发重试
    if (!s || !e) return;
    remove();
    line.value = new LeaderLine(s, e, resolveOptions(options));
  };

  // flush post:等模板渲染提交后再解析锚点;锚点换位(如 v-for 重排后 ref 换指)整体重建,
  // 不做 line.start/end 就地赋值——单线场景重建心智最简单,批量场景请用 useLeaderLines
  watch(() => [toValue(start), toValue(end)], create, { immediate: true, flush: 'post' });

  if (config.watchOptions !== false) {
    // 源是同一对象,靠 deep 遍历跟踪内部字段(含 ref 字段的 .value 变化)
    watch(
      () => options,
      () => line.value?.setOptions(resolveOptions(options)),
      { deep: true }
    );
  }

  onScopeDispose(remove);

  return {
    line,
    isReady,
    setOptions: opts => line.value?.setOptions(resolveOptions(opts)),
    position: () => line.value?.position(),
    requestPosition: () => line.value?.requestPosition(),
    show: (effectName, animOptions) => line.value?.show(effectName, animOptions),
    hide: (effectName, animOptions) => line.value?.hide(effectName, animOptions),
    remove
  };
}
