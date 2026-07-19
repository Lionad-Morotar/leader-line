import { describe, it, expect, afterEach } from 'vitest';
import { ref } from 'vue';
import { resolveAnchor, isAttachment, isElement } from './resolve-anchor';

// node 环境无 DOM:用鸭子类型伪造最小 Element/attachment
const fakeEl = () => ({ nodeType: 1 }) as unknown as Element;
const fakeAttachment = (_id = 1) => ({
  _id,
  isRemoved: false,
  remove: () => {}
});

describe('isElement / isAttachment', () => {
  it('鸭子类型判定', () => {
    expect(isElement(fakeEl())).toBe(true);
    expect(isElement({ nodeType: 3 })).toBe(false); // 文本节点不是元素
    expect(isElement(null)).toBe(false);
    expect(isElement('div')).toBe(false);

    expect(isAttachment(fakeAttachment())).toBe(true);
    expect(isAttachment(fakeEl())).toBe(false);
    expect(isAttachment({ _id: '1', isRemoved: false, remove() {} })).toBe(false); // _id 必须为数值
  });
});

describe('resolveAnchor', () => {
  afterEach(() => {
    // 每个用例独立 mock document,避免泄漏
    delete (globalThis as Record<string, unknown>).document;
  });

  it('空值输入返回 null', () => {
    expect(resolveAnchor(null)).toBe(null);
    expect(resolveAnchor(undefined)).toBe(null);
    expect(resolveAnchor(() => null)).toBe(null);
  });

  it('Element 原样返回', () => {
    const el = fakeEl();
    expect(resolveAnchor(el)).toBe(el);
  });

  it('attachment 原样返回(优先于 Element 判定)', () => {
    const att = fakeAttachment();
    expect(resolveAnchor(att as never)).toBe(att);
  });

  it('解包 ref 与 getter', () => {
    const el = fakeEl();
    expect(resolveAnchor(ref(el))).toBe(el);
    expect(resolveAnchor(() => el)).toBe(el);
    // 嵌套:ref 包组件实例
    expect(resolveAnchor(ref({ $el: el }))).toBe(el);
  });

  it('组件实例取 $el;$el 未挂载时返回 null', () => {
    const el = fakeEl();
    expect(resolveAnchor({ $el: el })).toBe(el);
    expect(resolveAnchor({ $el: null })).toBe(null);
  });

  it('字符串走 querySelector;无 document(SSR)返回 null', () => {
    const el = fakeEl();
    (globalThis as Record<string, unknown>).document = {
      querySelector: (s: string) => (s === '#hit' ? el : null)
    };
    expect(resolveAnchor('#hit')).toBe(el);
    expect(resolveAnchor('#miss')).toBe(null);

    delete (globalThis as Record<string, unknown>).document;
    expect(resolveAnchor('#hit')).toBe(null);
  });

  it('无法识别的输入返回 null 而非抛错', () => {
    expect(resolveAnchor(42 as never)).toBe(null);
    expect(resolveAnchor({} as never)).toBe(null);
  });
});
