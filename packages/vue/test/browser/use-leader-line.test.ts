import { describe, it, expect, afterEach } from 'vitest';
import { nextTick, ref } from 'vue';
import { useLeaderLine } from '../../src/use-leader-line';
import { useAreaAnchor, useCaptionLabel } from '../../src/use-attachment';
import { LEADER_LINE_DEFAULTS } from '../../src/defaults';
import { cleanupEls, lineSvgs, makeEl, mountSetup } from './helpers';

// 每个用例的挂载与元素统一登记,afterEach 兜底清理
// LIFO:必须先 unmount(dispose 线)再摘元素,否则 line.remove() 重定位时读不到锚点盒模型
let cleanups: Array<() => void> = [];
afterEach(() => {
  let fn;
  while ((fn = cleanups.pop())) fn();
  cleanups = [];
});

const track = (...fns: Array<() => void>) => cleanups.push(...fns);

describe('useLeaderLine', () => {
  it('双锚点就绪后创建线(flush post)', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() => useLeaderLine(ref(a), ref(b)));
    track(unmount);
    await nextTick();

    expect(result.isReady.value).toBe(true);
    expect(result.line.value).not.toBeNull();
    expect(lineSvgs()).toHaveLength(1);
  });

  it('options 字段为 ref 时深度响应:改 color 自动 setOptions', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const color = ref('coral');
    const { result, unmount } = mountSetup(() => useLeaderLine(ref(a), ref(b), { color }));
    track(unmount);
    await nextTick();
    expect(result.line.value?.color).toBe('coral');

    color.value = 'red';
    await nextTick();
    expect(result.line.value?.color).toBe('red');
    // 响应式更新走 setOptions,不重建实例
  });

  it('watchOptions:false 时不自动更新,手动 setOptions 生效', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const color = ref('coral');
    const { result, unmount } = mountSetup(() =>
      useLeaderLine(ref(a), ref(b), { color }, { watchOptions: false }));
    track(unmount);
    await nextTick();

    color.value = 'red';
    await nextTick();
    expect(result.line.value?.color).toBe('coral');

    result.setOptions({ color: 'green' });
    expect(result.line.value?.color).toBe('green');
  });

  it('锚点 ref 换指 → 旧线移除、新线重建', async () => {
    const a = makeEl();
    const b = makeEl();
    const c = makeEl();
    track(() => cleanupEls(a, b, c));

    const end = ref<Element>(b);
    const { result, unmount } = mountSetup(() => useLeaderLine(ref(a), end));
    track(unmount);
    await nextTick();
    const prev = result.line.value;
    expect(lineSvgs()).toHaveLength(1);

    end.value = c;
    await nextTick();
    expect(result.line.value).not.toBe(prev);
    expect(result.line.value).not.toBeNull();
    expect(lineSvgs()).toHaveLength(1); // 旧线已清理,全程只有一条
  });

  it('锚点延迟就绪:ref 从 null 变为元素后补建线', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const end = ref<Element | null>(null);
    const { result, unmount } = mountSetup(() => useLeaderLine(ref(a), end));
    track(unmount);
    await nextTick();
    expect(result.isReady.value).toBe(false);
    expect(lineSvgs()).toHaveLength(0);

    end.value = b;
    await nextTick();
    expect(result.isReady.value).toBe(true);
    expect(lineSvgs()).toHaveLength(1);
  });

  it('支持 selector 字符串锚点', async () => {
    const a = makeEl('ll-sel-a');
    const b = makeEl('ll-sel-b');
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() => useLeaderLine('#ll-sel-a', '#ll-sel-b'));
    track(unmount);
    await nextTick();

    expect(result.isReady.value).toBe(true);
    expect(lineSvgs()).toHaveLength(1);
  });

  it('scope dispose → remove,SVG 从 DOM 消失', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() => useLeaderLine(ref(a), ref(b)));
    await nextTick();
    expect(lineSvgs()).toHaveLength(1);

    unmount();
    expect(result.line.value).toBeNull();
    expect(lineSvgs()).toHaveLength(0);
  });

  it('provide 默认值:调用处 > 注入默认 > 库默认', async () => {
    const a = makeEl();
    const b = makeEl();
    const c = makeEl();
    track(() => cleanupEls(a, b, c));

    const { result, unmount } = mountSetup(
      () => {
        const inherited = useLeaderLine(ref(a), ref(b));
        const overridden = useLeaderLine(ref(a), ref(c), { color: 'coral' });
        return { inherited, overridden };
      },
      // inject 读父级 provides:同组件内 provide 不可见,应用级提供(Nuxt 插件同层)
      { provides: [[LEADER_LINE_DEFAULTS, { color: 'teal', size: 4 }]] }
    );
    track(unmount);
    await nextTick();

    // 注入默认生效
    expect(result.inherited.line.value?.color).toBe('teal');
    expect(result.inherited.line.value?.size).toBe(4);
    // 调用处覆盖默认
    expect(result.overridden.line.value?.color).toBe('coral');
    expect(result.overridden.line.value?.size).toBe(4);
  });

  it('position/show/hide 代理到底层实例', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() => useLeaderLine(ref(a), ref(b)));
    track(unmount);
    await nextTick();

    expect(() => result.position()).not.toThrow();
    // hide/show 经库的 update 周期落 DOM,none 效果也需等一帧
    result.hide('none');
    await new Promise(r => requestAnimationFrame(() => r(null)));
    expect(lineSvgs()[0]!.style.visibility).toBe('hidden');
    result.show('none');
    await new Promise(r => requestAnimationFrame(() => r(null)));
    expect(lineSvgs()[0]!.style.visibility).toBe('');
  });
});

describe('useAttachment', () => {
  it('useCaptionLabel 挂载后创建,dispose 自动 remove', async () => {
    const a = makeEl();
    const b = makeEl();
    track(() => cleanupEls(a, b));

    const { result, unmount } = mountSetup(() => {
      const label = useCaptionLabel({ text: 'hello' });
      const ll = useLeaderLine(ref(a), ref(b), { startLabel: label });
      return { label, ll };
    });
    await nextTick();

    expect(result.label.value).not.toBeNull();
    expect(result.ll.isReady.value).toBe(true);
    const labelAtt = result.label.value!;
    expect(labelAtt.isRemoved).toBe(false);

    unmount();
    // attachment 的 remove 走库的 addDelayedProc 延迟队列,isRemoved 在宏任务后才翻转
    await new Promise(r => setTimeout(r, 0));
    expect(labelAtt.isRemoved).toBe(true);
  });

  it('useAreaAnchor 可作为线端点;element 接受模板 ref', async () => {
    const a = makeEl();
    const zone = makeEl();
    track(() => cleanupEls(a, zone));

    const { result, unmount } = mountSetup(() => {
      const area = useAreaAnchor({ element: ref(zone), shape: 'rect' });
      const ll = useLeaderLine(ref(a), area, { color: 'teal' });
      return { area, ll };
    });
    track(unmount);
    await nextTick();

    expect(result.area.value).not.toBeNull();
    expect(result.ll.isReady.value).toBe(true);
    expect(document.querySelectorAll('svg.leader-line-areaAnchor')).toHaveLength(1);
  });
});
