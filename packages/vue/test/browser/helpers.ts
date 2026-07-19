/**
 * 浏览器测试公共设施。
 * - traceLog stub:库 [DEBUG] 区域在 test 模式不剥除,运行时依赖全局 traceLog(仅读/调 add)
 * - makeEl:绝对定位的测试锚点元素(有真实盒模型,LeaderLine 才能算出坐标)
 * - mountSetup:把 composable 挂进真实组件 scope,拿到真实的 mounted/dispose 生命周期
 */
import { createApp } from 'vue';

declare global {
  interface Window {
    traceLog?: ((...args: unknown[]) => void) & { add?: (...args: unknown[]) => void };
  }
}

if (typeof window !== 'undefined' && !window.traceLog) {
  window.traceLog = Object.assign(() => {}, { add: () => {} });
}

export function makeEl(id?: string): HTMLElement {
  const el = document.createElement('div');
  if (id) el.id = id;
  el.style.cssText = 'position:absolute;top:0;left:0;width:20px;height:20px;';
  document.body.appendChild(el);
  return el;
}

export function cleanupEls(...els: Element[]): void {
  els.forEach(el => el.remove());
}

export function lineSvgs(): SVGSVGElement[] {
  return [...document.querySelectorAll('svg.leader-line')] as SVGSVGElement[];
}

export function mountSetup<T>(fn: () => T): { result: T; unmount: () => void } {
  let result!: T;
  let unmounted = false;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      result = fn();
      return () => null;
    }
  });
  app.mount(host);
  return {
    result,
    unmount: () => {
      // 幂等:用例内显式 unmount 后,afterEach 的兜底 unmount 不再触发第二次 dispose
      if (unmounted) return;
      unmounted = true;
      app.unmount();
      host.remove();
    }
  };
}
