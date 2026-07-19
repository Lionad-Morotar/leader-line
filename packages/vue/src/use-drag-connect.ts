import { onScopeDispose, shallowRef } from 'vue';
import type { Ref } from 'vue';
import LeaderLine from '@lionad/leader-line';
import { resolveAnchor, type AnchorValue, type MaybeAnchor } from './resolve-anchor';
import { resolveOptions, type LeaderLineVueOptions } from './use-leader-line';
import { createLineRegistry, type LineRegistry } from './registry';
import { injectLeaderLineDefaults } from './defaults';

/**
 * useDragConnect —— 拖拽建连交互层。
 * startConnect(按下起点)→ 1px 隐形元素跟随光标当预览线端点(只用公开 API,
 * 不碰库内 attachProps)→ mouseup 命中 validTarget → onConnect 异步门禁 → 落成正式线。
 * 未命中/被拦截/Esc/cancel 都会清理预览,不残留。
 */

export type ValidTarget = string | ((el: Element) => boolean);

export interface DragConnectEntry {
  key: string;
  line: LeaderLine;
  data: unknown;
}

export interface UseDragConnectConfig {
  /** 合法落点:selector(closest 命中)或谓词(从 event.target 向上找) */
  validTarget: ValidTarget;
  /** 落点门禁:返回 false 拦截成线(支持异步,如类型校验) */
  onConnect?: (
    from: AnchorValue,
    to: Element,
    data: unknown,
    event: MouseEvent
  ) => void | boolean | Promise<void | boolean>;
  /** 正式线 options */
  lineOptions?: LeaderLineVueOptions;
  /** 预览线 options(默认灰色虚线、无末端插头) */
  previewOptions?: LeaderLineVueOptions;
  /** 成线 key;缺省自增 */
  key?: (from: AnchorValue, to: Element, data: unknown) => string;
  /** 同 (from, to) 锚点对去重(重复拖拽只保留一条) */
  preventSame?: boolean;
}

interface DragState {
  from: AnchorValue;
  data: unknown;
  previewLine: LeaderLine;
  cursorEl: HTMLElement;
}

const DEFAULT_PREVIEW: LeaderLineVueOptions = {
  color: '#bbb',
  size: 2,
  dash: true,
  endPlug: 'behind'
};

export interface UseDragConnectReturn {
  isDragging: Readonly<Ref<boolean>>;
  /** 绑定到起点元素的 mousedown/pointerdown;data 随 onConnect 与注册表查询透出 */
  startConnect: (event: MouseEvent, from: MaybeAnchor, data?: unknown) => void;
  cancel: () => void;
  lines: Readonly<Ref<LeaderLine[]>>;
  size: Readonly<Ref<number>>;
  getLine: (key: string) => LeaderLine | undefined;
  findWhere: (pred: (entry: DragConnectEntry) => boolean) => DragConnectEntry[];
  removeWhere: (pred: (entry: DragConnectEntry) => boolean) => number;
}

interface RegistryState {
  anchors: { start: AnchorValue; end: AnchorValue };
  userData: unknown;
}

export function useDragConnect(config: UseDragConnectConfig): UseDragConnectReturn {
  const registry: LineRegistry<LeaderLine, RegistryState> = createLineRegistry();
  const isDragging = shallowRef(false);
  const lines = shallowRef<LeaderLine[]>([]);
  const size = shallowRef(0);
  const defaults = injectLeaderLineDefaults();
  let drag: DragState | null = null;
  let autoKey = 0;

  const syncSnapshot = () => {
    lines.value = registry.findWhere(() => true).map(e => e.line);
    size.value = registry.size;
  };

  /** 从 event.target 向上找合法落点元素 */
  const resolveTarget = (target: EventTarget | null): Element | null => {
    if (!(target instanceof Element)) return null;
    if (typeof config.validTarget === 'string') return target.closest(config.validTarget);
    let el: Element | null = target;
    while (el) {
      if (config.validTarget(el)) return el;
      el = el.parentElement;
    }
    return null;
  };

  /** 1px 隐形跟随元素:fixed 定位,transform 跟随光标,库按它的盒模型画预览线 */
  const makeCursorEl = (x: number, y: number): HTMLElement => {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;';
    document.body.appendChild(el);
    moveCursorEl(el, x, y);
    return el;
  };
  const moveCursorEl = (el: HTMLElement, x: number, y: number) => {
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const cleanupDrag = () => {
    if (!drag) return;
    drag.previewLine.remove();
    drag.cursorEl.remove();
    drag = null;
    isDragging.value = false;
    window.removeEventListener('mousemove', onMousemove);
    window.removeEventListener('mouseup', onMouseup);
    window.removeEventListener('keydown', onKeydown);
  };

  const onMousemove = (ev: MouseEvent) => {
    if (!drag) return;
    moveCursorEl(drag.cursorEl, ev.clientX, ev.clientY);
    // 合帧重定位:高频 mousemove 下同一帧多次调用只 flush 一次
    drag.previewLine.requestPosition();
  };

  const onMouseup = async (ev: MouseEvent) => {
    const current = drag;
    // 先清预览再走异步门禁:门禁期间界面不留半截线
    cleanupDrag();
    if (!current) return;

    const target = resolveTarget(ev.target);
    if (!target) return;
    // 自连恒定拦截:库层就拒绝 start === end(抛 required 错),没有可放行的语义
    if (current.from === target) return;
    if (config.preventSame) {
      const dup = registry.findWhere(
        e => e.data.anchors.start === current.from && e.data.anchors.end === target
      );
      if (dup.length) return;
    }

    const verdict = await config.onConnect?.(current.from, target, current.data, ev);
    if (verdict === false) return;

    const key = config.key?.(current.from, target, current.data) ?? `dc-${++autoKey}`;
    const line = new LeaderLine(current.from, target, {
      ...resolveOptions(defaults),
      ...resolveOptions(config.lineOptions ?? {})
    });
    registry.set(key, line, {
      anchors: { start: current.from, end: target },
      userData: current.data
    });
    syncSnapshot();
  };

  const onKeydown = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') cleanupDrag();
  };

  const startConnect = (event: MouseEvent, from: MaybeAnchor, data?: unknown) => {
    if (typeof window === 'undefined') return;
    const anchor = resolveAnchor(from);
    if (!anchor) return;
    // 连续 startConnect:先清掉上一段未完成的拖拽
    cleanupDrag();

    const cursorEl = makeCursorEl(event.clientX, event.clientY);
    const previewLine = new LeaderLine(
      anchor,
      cursorEl,
      resolveOptions(config.previewOptions ?? DEFAULT_PREVIEW)
    );
    drag = { from: anchor, data, previewLine, cursorEl };
    isDragging.value = true;

    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', onMouseup);
    window.addEventListener('keydown', onKeydown);
  };

  onScopeDispose(() => {
    cleanupDrag();
    registry.clear();
    syncSnapshot();
  });

  return {
    isDragging,
    startConnect,
    cancel: cleanupDrag,
    lines,
    size,
    getLine: key => registry.get(key)?.line,
    findWhere: pred =>
      registry
        .findWhere(e => pred({ key: e.key, line: e.line, data: e.data.userData }))
        .map(e => ({ key: e.key, line: e.line, data: e.data.userData })),
    removeWhere: pred => {
      const n = registry.removeWhere(e => pred({ key: e.key, line: e.line, data: e.data.userData }));
      if (n) syncSnapshot();
      return n;
    }
  };
}
