import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, nextTick, reactive, ref } from 'vue';
import { LeaderLineComponent } from '../../src/leader-line';
import type LeaderLine from '@lionad/leader-line';
import { cleanupEls, lineSvgs, makeEl } from './helpers';

let cleanups: Array<() => void> = [];
afterEach(() => {
  let fn;
  while ((fn = cleanups.pop())) fn();
  cleanups = [];
});
const track = (...fns: Array<() => void>) => cleanups.push(...fns);

/** 挂载一个渲染 LeaderLine 组件的宿主应用 */
const mountComponent = (render: () => unknown) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const app = createApp({ render: render as () => ReturnType<typeof h> });
  app.mount(host);
  track(() => {
    app.unmount();
    host.remove();
  });
  return app;
};

interface ExposedLL {
  line: LeaderLine | null;
  position: () => void;
}

describe('<LeaderLine> 组件', () => {
  it('挂载成线,自身不产生 DOM', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    mountComponent(() => h(LeaderLineComponent, { start: a, end: b }));
    await nextTick();

    expect(lineSvgs()).toHaveLength(1);
  });

  it('props 响应:color 变化自动 setOptions', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const state = reactive({ color: 'coral' });
    const llRef = ref<ExposedLL | null>(null);
    mountComponent(() =>
      h(LeaderLineComponent, { ref: llRef, start: a, end: b, color: state.color }));
    await nextTick();

    expect(llRef.value?.line?.color).toBe('coral');
    state.color = 'red';
    await nextTick();
    expect(llRef.value?.line?.color).toBe('red');
  });

  it('kebab 风格 props(end-plug)映射 camelCase', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const llRef = ref<ExposedLL | null>(null);
    // h() 里直接写 camelCase;模板编译器才会做 kebab→camel,这里验证 prop 名本身生效
    mountComponent(() =>
      h(LeaderLineComponent, { ref: llRef, start: a, end: b, endPlug: 'arrow2' }));
    await nextTick();

    expect(llRef.value?.line?.endPlug).toBe('arrow2');
  });

  it('v-for + key:删一项只移除对应线', async () => {
    const [a, b, c] = [makeEl(), makeEl(), makeEl()];
    track(() => cleanupEls(a, b, c));

    const state = reactive({
      edges: [
        { key: '1', start: a, end: b },
        { key: '2', start: a, end: c }
      ] as Array<{ key: string; start: Element; end: Element }>
    });
    mountComponent(() =>
      state.edges.map(e =>
        h(LeaderLineComponent, { key: e.key, start: e.start, end: e.end })));
    await nextTick();
    expect(lineSvgs()).toHaveLength(2);

    state.edges.splice(0, 1);
    await nextTick();
    expect(lineSvgs()).toHaveLength(1);
  });

  it('watchOptions:false 时 props 变化不更新线', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const state = reactive({ color: 'coral' });
    const llRef = ref<ExposedLL | null>(null);
    mountComponent(() =>
      h(LeaderLineComponent, {
        ref: llRef,
        start: a,
        end: b,
        color: state.color,
        watchOptions: false
      }));
    await nextTick();

    state.color = 'red';
    await nextTick();
    expect(llRef.value?.line?.color).toBe('coral');
  });

  it('组件卸载 → 线移除', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const state = reactive({ show: true });
    mountComponent(() =>
      state.show ? h(LeaderLineComponent, { start: a, end: b }) : null);
    await nextTick();
    expect(lineSvgs()).toHaveLength(1);

    state.show = false;
    await nextTick();
    expect(lineSvgs()).toHaveLength(0);
  });
});
