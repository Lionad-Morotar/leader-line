import { describe, it, expect, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { useDragConnect } from '../../src/use-drag-connect';
import { cleanupEls, lineSvgs, makeEl, mountSetup } from './helpers';

// LIFO:先 unmount 再摘元素
let cleanups: Array<() => void> = [];
afterEach(() => {
  let fn;
  while ((fn = cleanups.pop())) fn();
  cleanups = [];
});
const track = (...fns: Array<() => void>) => cleanups.push(...fns);

const mdown = (x = 0, y = 0) => new MouseEvent('mousedown', { clientX: x, clientY: y });
const mmove = (x: number, y: number) =>
  window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
const mup = (target: Element, x = 0, y = 0) =>
  target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));

/** 等 onConnect 异步门禁与后续同步注册走完 */
const settle = async () => {
  await Promise.resolve();
  await nextTick();
};

describe('useDragConnect', () => {
  it('拖拽命中合法落点 → 落成正式线', async () => {
    const a = makeEl();
    const b = makeEl();
    b.classList.add('field-node');
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: '.field-node' }));
    track(unmount);

    result.startConnect(mdown(), a);
    expect(result.isDragging.value).toBe(true);
    expect(lineSvgs()).toHaveLength(1); // 预览线

    mmove(50, 50);
    mup(b);
    await settle();

    expect(result.isDragging.value).toBe(false);
    expect(result.size.value).toBe(1);
    expect(lineSvgs()).toHaveLength(1); // 预览线已清理,只剩正式线
  });

  it('落点不合法 → 预览清理,无线残留', async () => {
    const a = makeEl();
    const outsider = makeEl();
    track(() => cleanupEls(a, outsider));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: '.field-node' }));
    track(unmount);

    result.startConnect(mdown(), a);
    mup(outsider);
    await settle();

    expect(result.isDragging.value).toBe(false);
    expect(result.size.value).toBe(0);
    expect(lineSvgs()).toHaveLength(0);
  });

  it('onConnect 返回 false → 拦截成线;异步放行 → 成线', async () => {
    const a = makeEl();
    const b = makeEl();
    const c = makeEl();
    b.classList.add('field-node');
    c.classList.add('field-node');
    track(() => cleanupEls(a, b, c));

    let verdict: boolean = false;
    const { result, unmount } = mountSetup(() =>
      useDragConnect({
        validTarget: '.field-node',
        onConnect: async () => {
          await Promise.resolve();
          return verdict;
        }
      }));
    track(unmount);

    result.startConnect(mdown(), a);
    mup(b);
    await settle();
    expect(result.size.value).toBe(0);

    verdict = true;
    result.startConnect(mdown(), a);
    mup(c);
    await settle();
    expect(result.size.value).toBe(1);
  });

  it('谓词形态 validTarget:从 target 向上匹配', async () => {
    const a = makeEl();
    const b = makeEl();
    const inner = document.createElement('span');
    inner.dataset.node = '1';
    b.appendChild(inner);
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: el => el === b }));
    track(unmount);

    result.startConnect(mdown(), a);
    // 落在子元素上,谓词沿父链找到 b
    mup(inner);
    await settle();
    expect(result.size.value).toBe(1);
  });

  it('preventSame:同锚点对重复拖拽只保留一条', async () => {
    const a = makeEl();
    const b = makeEl();
    b.classList.add('field-node');
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: '.field-node', preventSame: true }));
    track(unmount);

    result.startConnect(mdown(), a);
    mup(b);
    await settle();
    result.startConnect(mdown(), a);
    mup(b);
    await settle();

    expect(result.size.value).toBe(1);
    expect(lineSvgs()).toHaveLength(1);
  });

  it('自连恒定拦截(库层不支持 start === end)', async () => {
    const a = makeEl();
    a.classList.add('field-node');
    track(() => cleanupEls(a));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: '.field-node' }));
    track(unmount);
    result.startConnect(mdown(), a);
    mup(a);
    await settle();
    expect(result.size.value).toBe(0);
    expect(lineSvgs()).toHaveLength(0);
  });

  it('cancel 与 Esc 中断拖拽,无残留', async () => {
    const a = makeEl();
    track(() => cleanupEls(a));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: '.field-node' }));
    track(unmount);

    result.startConnect(mdown(), a);
    expect(result.isDragging.value).toBe(true);
    result.cancel();
    expect(result.isDragging.value).toBe(false);
    expect(lineSvgs()).toHaveLength(0);

    result.startConnect(mdown(), a);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(result.isDragging.value).toBe(false);
    expect(lineSvgs()).toHaveLength(0);
  });

  it('data 随成线透出,removeWhere 按 data 删线', async () => {
    const a = makeEl();
    const b = makeEl();
    b.classList.add('field-node');
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: '.field-node' }));
    track(unmount);

    result.startConnect(mdown(), a, { fieldId: 'x' });
    mup(b);
    await settle();

    const hits = result.findWhere(e => (e.data as { fieldId: string }).fieldId === 'x');
    expect(hits).toHaveLength(1);

    const n = result.removeWhere(e => (e.data as { fieldId: string }).fieldId === 'x');
    expect(n).toBe(1);
    expect(result.size.value).toBe(0);
    expect(lineSvgs()).toHaveLength(0);
  });

  it('scope dispose:拖拽中卸载 → 预览与注册表全清', async () => {
    const a = makeEl();
    const b = makeEl();
    b.classList.add('field-node');
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() =>
      useDragConnect({ validTarget: '.field-node' }));

    result.startConnect(mdown(), a);
    mup(b);
    await settle();
    expect(lineSvgs()).toHaveLength(1);

    result.startConnect(mdown(), a); // 再来一段进行中的拖拽
    unmount();
    expect(result.isDragging.value).toBe(false);
    expect(result.size.value).toBe(0);
    expect(lineSvgs()).toHaveLength(0);
  });
});
