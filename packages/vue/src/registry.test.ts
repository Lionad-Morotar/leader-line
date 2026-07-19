import { describe, it, expect, vi, type Mock } from 'vitest';
import { createLineRegistry, type LineHandle } from './registry';

type FakeLine = LineHandle & { remove: Mock<() => void> };
const fakeLine = (): FakeLine => ({
  remove: vi.fn<() => void>()
});

describe('createLineRegistry', () => {
  it('set/get/has/size', () => {
    const reg = createLineRegistry();
    const line = fakeLine();
    reg.set('a→b', line, { fieldId: 'x' });

    expect(reg.size).toBe(1);
    expect(reg.has('a→b')).toBe(true);
    expect(reg.get('a→b')).toEqual({ key: 'a→b', line, data: { fieldId: 'x' } });
    expect(reg.get('missing')).toBeUndefined();
  });

  it('同 key 覆盖会先移除旧线(防泄漏)', () => {
    const reg = createLineRegistry();
    const oldLine = fakeLine();
    const newLine = fakeLine();
    reg.set('k', oldLine, null);
    reg.set('k', newLine, null);

    expect(oldLine.remove).toHaveBeenCalledOnce();
    expect(reg.get('k')?.line).toBe(newLine);
    expect(reg.size).toBe(1);
  });

  it('remove 调用 line.remove 并出表', () => {
    const reg = createLineRegistry();
    const line = fakeLine();
    reg.set('k', line, null);

    expect(reg.remove('k')).toBe(true);
    expect(line.remove).toHaveBeenCalledOnce();
    expect(reg.remove('k')).toBe(false); // 幂等
    expect(reg.size).toBe(0);
  });

  it('findWhere 按谓词返回匹配项(含 data)', () => {
    const reg = createLineRegistry<LineHandle, { from: string }>();
    reg.set('1', fakeLine(), { from: '#a' });
    reg.set('2', fakeLine(), { from: '#b' });
    reg.set('3', fakeLine(), { from: '#a' });

    const hits = reg.findWhere(e => e.data.from === '#a');
    expect(hits.map(h => h.key)).toEqual(['1', '3']);
  });

  it('removeWhere 批量删除并返回数量', () => {
    const reg = createLineRegistry<LineHandle, { from: string }>();
    const l1 = fakeLine();
    const l2 = fakeLine();
    const l3 = fakeLine();
    reg.set('1', l1, { from: '#a' });
    reg.set('2', l2, { from: '#b' });
    reg.set('3', l3, { from: '#a' });

    const n = reg.removeWhere(e => e.data.from === '#a');
    expect(n).toBe(2);
    expect(l1.remove).toHaveBeenCalledOnce();
    expect(l3.remove).toHaveBeenCalledOnce();
    expect(l2.remove).not.toHaveBeenCalled();
    expect(reg.size).toBe(1);
  });

  it('clear 移除全部', () => {
    const reg = createLineRegistry();
    const lines = [fakeLine(), fakeLine(), fakeLine()];
    lines.forEach((l, i) => reg.set(`k${i}`, l, null));

    reg.clear();
    expect(reg.size).toBe(0);
    lines.forEach(l => expect(l.remove).toHaveBeenCalledOnce());
  });

  it('迭代期 remove 不产生副作用错乱(快照语义)', () => {
    const reg = createLineRegistry<LineHandle, { n: number }>();
    for (let i = 0; i < 5; i++) reg.set(`k${i}`, fakeLine(), { n: i });
    // 谓词在迭代中查询注册表状态——removeWhere 内部先快照再删
    const n = reg.removeWhere(e => e.data.n >= 2 && reg.has(`k${e.data.n - 1}`));
    expect(n).toBe(3);
    expect(reg.size).toBe(2);
  });
});
