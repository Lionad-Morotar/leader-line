import { describe, it, expect, afterEach } from 'vitest';
import { nextTick, ref, type Ref } from 'vue';
import { useLeaderLines, type EdgeInput } from '../../src/use-leader-lines';
import { cleanupEls, lineSvgs, makeEl, mountSetup } from './helpers';

// LIFO:先 unmount 再摘元素(理由同 use-leader-line.test.ts)
let cleanups: Array<() => void> = [];
afterEach(() => {
  let fn;
  while ((fn = cleanups.pop())) fn();
  cleanups = [];
});
const track = (...fns: Array<() => void>) => cleanups.push(...fns);

const setup = (edges: Ref<EdgeInput[]>, config?: object) => {
  const mounted = mountSetup(() => useLeaderLines(edges, config));
  track(mounted.unmount);
  return mounted.result;
};

describe('useLeaderLines', () => {
  it('数组驱动创建:3 条边 3 条线', async () => {
    const [a, b, c, d] = [makeEl(), makeEl(), makeEl(), makeEl()];
    track(() => cleanupEls(a, b, c, d));

    const edges = ref<EdgeInput[]>([
      { key: 'a→b', start: a, end: b },
      { key: 'a→c', start: a, end: c, color: 'coral' },
      { key: 'a→d', start: a, end: d }
    ]);
    const result = setup(edges);
    await nextTick();

    expect(result.size.value).toBe(3);
    expect(result.lines.value).toHaveLength(3);
    expect(lineSvgs()).toHaveLength(3);
  });

  it('push 新增、splice 移除,SVG 同步增减', async () => {
    const [a, b, c] = [makeEl(), makeEl(), makeEl()];
    track(() => cleanupEls(a, b, c));

    const edges = ref<EdgeInput[]>([{ key: 'a→b', start: a, end: b }]);
    const result = setup(edges);
    await nextTick();

    edges.value.push({ key: 'a→c', start: a, end: c });
    await nextTick();
    expect(result.size.value).toBe(2);
    expect(lineSvgs()).toHaveLength(2);

    edges.value.splice(0, 1);
    await nextTick();
    expect(result.size.value).toBe(1);
    expect(lineSvgs()).toHaveLength(1);
    expect(result.getLine('a→b')).toBeUndefined();
    expect(result.getLine('a→c')).toBeDefined();
  });

  it('同 key 改 options:实例不变,color 就地更新', async () => {
    const [a, b] = [makeEl(), makeEl()];
    track(() => cleanupEls(a, b));

    const edges = ref<EdgeInput[]>([{ key: 'k', start: a, end: b, color: 'coral' }]);
    const result = setup(edges);
    await nextTick();
    const prev = result.getLine('k')!;

    edges.value[0]!.color = 'red';
    await nextTick();
    expect(result.getLine('k')).toBe(prev);
    expect(prev.color).toBe('red');
  });

  it('同 key 换锚点:实例不变,line.end 直接换指', async () => {
    const [a, b, c] = [makeEl(), makeEl(), makeEl()];
    track(() => cleanupEls(a, b, c));

    const edges = ref<EdgeInput[]>([{ key: 'k', start: a, end: b }]);
    const result = setup(edges);
    await nextTick();
    const prev = result.getLine('k')!;

    edges.value[0]!.end = c;
    await nextTick();
    expect(result.getLine('k')).toBe(prev);
    expect(prev.end).toBe(c);
    expect(lineSvgs()).toHaveLength(1);
  });

  it('数组重排:零重建', async () => {
    const [a, b, c] = [makeEl(), makeEl(), makeEl()];
    track(() => cleanupEls(a, b, c));

    const edges = ref<EdgeInput[]>([
      { key: '1', start: a, end: b },
      { key: '2', start: a, end: c }
    ]);
    const result = setup(edges);
    await nextTick();
    const [l1, l2] = [result.getLine('1'), result.getLine('2')];

    edges.value.reverse();
    await nextTick();
    expect(result.getLine('1')).toBe(l1);
    expect(result.getLine('2')).toBe(l2);
  });

  it('preventSame:同锚点对的重复边不建第二条线', async () => {
    const [a, b] = [makeEl(), makeEl()];
    track(() => cleanupEls(a, b));

    const edges = ref<EdgeInput[]>([{ key: '1', start: a, end: b }]);
    const result = setup(edges, { preventSame: true });
    await nextTick();

    edges.value.push({ key: '2', start: a, end: b, color: 'red' });
    await nextTick();
    expect(result.size.value).toBe(1);
    expect(lineSvgs()).toHaveLength(1);
  });

  it('findWhere/removeWhere 按领域数据查询与删除', async () => {
    const [a, b, c] = [makeEl(), makeEl(), makeEl()];
    track(() => cleanupEls(a, b, c));

    const edges = ref<EdgeInput[]>([
      { key: '1', start: a, end: b, data: { fieldId: 'x' } },
      { key: '2', start: a, end: c, data: { fieldId: 'y' } }
    ]);
    const result = setup(edges);
    await nextTick();

    const hits = result.findWhere(e => (e.data as { fieldId: string }).fieldId === 'x');
    expect(hits.map(h => h.key)).toEqual(['1']);

    const n = result.removeWhere(e => (e.data as { fieldId: string }).fieldId === 'x');
    expect(n).toBe(1);
    expect(result.size.value).toBe(1);
    expect(lineSvgs()).toHaveLength(1);
  });

  it('锚点未就绪的边:跳过创建,不就绪恢复后补建', async () => {
    const [a, b] = [makeEl(), makeEl()];
    track(() => cleanupEls(a, b));

    const endRef = ref<Element | null>(null);
    const edges = ref<EdgeInput[]>([{ key: 'k', start: a, end: endRef }]);
    const result = setup(edges);
    await nextTick();
    expect(result.size.value).toBe(0);

    endRef.value = b;
    await nextTick();
    expect(result.size.value).toBe(1);
    expect(result.getLine('k')).toBeDefined();
  });

  it('scope dispose → clear 全部线', async () => {
    const [a, b, c] = [makeEl(), makeEl(), makeEl()];
    track(() => cleanupEls(a, b, c));

    const edges = ref<EdgeInput[]>([
      { key: '1', start: a, end: b },
      { key: '2', start: a, end: c }
    ]);
    const { result, unmount } = mountSetup(() => useLeaderLines(edges));
    await nextTick();
    expect(lineSvgs()).toHaveLength(2);

    unmount();
    expect(result.size.value).toBe(0);
    expect(lineSvgs()).toHaveLength(0);
  });

  it('key 提取函数:from→to 复合 key', async () => {
    const [a, b, c] = [makeEl('ka'), makeEl('kb'), makeEl('kc')];
    track(() => cleanupEls(a, b, c));

    const edges = ref<EdgeInput[]>([
      { start: a, end: b, data: { from: 'ka', to: 'kb' } },
      { start: a, end: c, data: { from: 'ka', to: 'kc' } }
    ]);
    const result = setup(edges, {
      key: (e: EdgeInput) => {
        const d = e.data as { from: string; to: string };
        return `${d.from}→${d.to}`;
      }
    });
    await nextTick();
    expect(result.getLine('ka→kb')).toBeDefined();
    expect(result.getLine('ka→kc')).toBeDefined();
  });
});
