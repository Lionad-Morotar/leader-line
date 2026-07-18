<template>
  <!-- bindWindow:特性矩阵(options/attachment × 主窗口/iframe 切换) -->
  <main class="demo-page">
    <h1>bindWindow</h1>
    <p>特性矩阵:dash/gradient/dropShadow/anchor/label × 主窗口与 iframe 重绑定</p>

    <p class="controls">
      <button data-testid="btn-new" @click="newWithoutOptions">new(基础)</button>
      <button data-testid="btn-options" @click="applyOptions">setOptions</button>
      <button data-testid="btn-new-options" @click="newWithOptions">new(带特性)</button>
      <button data-testid="btn-window" @click="toggleWindow">切换主窗口/iframe</button>
    </p>

    <div class="views">
      <section id="view-1" class="view">
        <h3>主窗口</h3>
        <div ref="startTargetsRef" class="targets start-targets"></div>
        <div ref="endTargetsRef" class="targets end-targets"></div>
      </section>
      <section class="view">
        <h3>iframe</h3>
        <iframe ref="iframeRef" class="child-frame" title="child"></iframe>
      </section>
    </div>

    <section id="view-2" class="mix-view">
      <h3>mix 组合(单线多特性叠加)</h3>
      <p class="controls">
        <label v-for="item in mixItems" :key="item.label">
          <input v-model="item.on" type="checkbox" @change="applyMix"> {{ item.label }}
        </label>
        <button data-testid="btn-window-mix" @click="toggleMixWindow">切换窗口</button>
      </p>
      <div class="mix-stage">
        <div ref="mixStartRef" class="anchor">start</div>
        <div ref="mixEndRef" class="anchor end">end</div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import LeaderLine from 'leader-line';

interface Item {
  label: string;
  mix?: boolean;
  separate?: boolean;
  options?: Record<string, unknown> | ((start: Element, end: Element) => Record<string, unknown>);
  on?: boolean;
  ll?: InstanceType<typeof LeaderLine>;
  start?: HTMLElement;
  end?: HTMLElement;
  startC?: HTMLElement;
  endC?: HTMLElement;
}

const BASIC: Record<string, unknown> = { color: 'rgba(255, 127, 80, 0.7)', startSocket: 'top' };
const BASIC_MIX: Record<string, unknown> = {
  color: 'rgba(255, 127, 80, 0.7)', dash: false, gradient: false, dropShadow: false,
  startLabel: '', middleLabel: '', endLabel: ''
};

const startTargetsRef = ref<HTMLElement>();
const endTargetsRef = ref<HTMLElement>();
const iframeRef = ref<HTMLIFrameElement>();
const mixStartRef = ref<HTMLElement>();
const mixEndRef = ref<HTMLElement>();

const items: Item[] = [
  { label: 'dash', mix: true, options: { dash: true } },
  { label: 'dash(anim)', mix: true, options: { dash: { animation: true } } },
  { label: 'gradient', mix: true,
    options: { gradient: { startColor: 'rgba(77, 157, 244, 0.7)', endColor: 'rgba(226, 244, 77, 0.7)' } } },
  { label: 'dropShadow', mix: true, options: { dropShadow: true } },
  { label: 'pointAnchor', separate: true, mix: true,
    options: (_s, end) => ({ end: LeaderLine.pointAnchor({ element: end }) }) },
  { label: 'areaAnchor', separate: true,
    options: (_s, end) => ({ end: LeaderLine.areaAnchor({ element: end }) }) },
  { label: 'mouseHoverAnchor', separate: true, mix: true,
    options: start => ({ start: LeaderLine.mouseHoverAnchor({ element: start }) }) },
  { label: 'captionLabel', separate: true,
    options: { startLabel: 'start', middleLabel: 'middle', endLabel: 'end' } },
  { label: 'pathLabel', separate: true, mix: true,
    options: () => ({
      startLabel: LeaderLine.pathLabel({ text: 'start' }),
      middleLabel: LeaderLine.pathLabel({ text: 'middle' }),
      endLabel: LeaderLine.pathLabel({ text: 'end' })
    }) }
];

const mixItems = ref(items.filter(i => i.mix).map(i => ({ ...i, on: false })));
const inChild = ref(false);
let llMix: InstanceType<typeof LeaderLine> | null = null;
let childDoc: Document | null = null;

function opts(item: Item, s: Element, e: Element) {
  return typeof item.options === 'function' ? item.options(s, e) : (item.options ?? {});
}

function makeAnchor(doc: Document, container: HTMLElement, label?: string) {
  const el = doc.createElement('div');
  el.className = 'anchor';
  if (label) { el.textContent = label; }
  return container.appendChild(el) as HTMLElement;
}

function repositionAll() {
  setTimeout(() => items.forEach(item => item.ll?.position()), 0);
}

function newWithoutOptions() {
  items.forEach(item => {
    item.ll?.remove();
    item.ll = new LeaderLine(item.start!, item.end!, BASIC);
  });
  repositionAll();
}

function applyOptions() {
  items.forEach(item => {
    item.ll?.setOptions(opts(item, item.start!, item.end!));
  });
  repositionAll();
}

function newWithOptions() {
  items.forEach(item => {
    item.ll?.remove();
    item.ll = new LeaderLine({ ...BASIC, start: item.start, end: item.end, ...opts(item, item.start!, item.end!) } as never);
  });
  repositionAll();
}

function toggleWindow() {
  items.forEach(item => {
    if (!item.ll || !item.startC || !item.endC) { return; }
    item.ll.setOptions({ start: item.startC, end: item.endC, ...opts(item, item.startC, item.endC) } as never);
  });
  repositionAll();
}

function applyMix() {
  const options: Record<string, unknown> = {
    ...BASIC_MIX,
    start: inChild.value && childDoc ? childDoc.getElementById('mix-start-c') : mixStartRef.value,
    end: inChild.value && childDoc ? childDoc.getElementById('mix-end-c') : mixEndRef.value
  };
  mixItems.value.forEach(item => {
    if (item.on) { Object.assign(options, opts(item, options.start as Element, options.end as Element)); }
  });
  llMix?.setOptions(options as never);
}

function toggleMixWindow() {
  inChild.value = !inChild.value;
  applyMix();
}

onMounted(() => {
  // iframe 内联文档:与主窗口同构的锚点容器
  childDoc = iframeRef.value!.contentDocument;
  childDoc!.body.innerHTML =
    '<style>.anchor{position:relative;width:120px;height:32px;margin:4px;background:rgba(150,255,127,.5);border-radius:6px;display:flex;align-items:center;justify-content:center;font:12px system-ui}</style>' +
    '<div id="view-1"><div class="start-targets"></div><div class="end-targets"></div></div>' +
    '<div class="anchor" id="mix-start-c">start-c</div><div class="anchor" id="mix-end-c" style="margin-left:160px">end-c</div>';

  const startC = childDoc!.querySelector('.start-targets') as HTMLElement;
  const endC = childDoc!.querySelector('.end-targets') as HTMLElement;

  let lastEnd: HTMLElement | null = null;
  let lastEndC: HTMLElement | null = null;
  items.forEach((item, i) => {
    item.start = makeAnchor(document, startTargetsRef.value!, item.label);
    item.startC = makeAnchor(childDoc!, startC, item.label);
    if (!lastEnd || item.separate || items[i - 1]?.separate) {
      lastEnd = makeAnchor(document, endTargetsRef.value!);
      lastEndC = makeAnchor(childDoc!, endC);
    }
    item.end = lastEnd;
    item.endC = lastEndC;
  });

  newWithoutOptions();
  llMix = new LeaderLine(mixStartRef.value!, mixEndRef.value!, BASIC_MIX as never);
});

onBeforeUnmount(() => {
  items.forEach(item => item.ll?.remove());
  llMix?.remove();
});
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.views { display: flex; gap: 16px; }
.view { flex: 1; }
.targets { display: flex; flex-wrap: wrap; gap: 4px; min-height: 44px; padding: 6px; border: 1px dashed #ddd; border-radius: 6px; }
.end-targets { margin-top: 8px; }
.child-frame { width: 100%; height: 200px; border: 1px dashed #ccc; border-radius: 6px; }
.mix-stage { position: relative; width: 640px; height: 160px; border: 1px dashed #ccc; border-radius: 8px; }
.mix-stage .anchor { position: absolute; left: 30px; top: 60px; }
.mix-stage .end { left: 420px; }
button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
</style>

<style>
/* 场景内锚点共享样式(未 scoped,供动态创建元素使用) */
#view-1 .anchor {
  position: relative; width: 120px; height: 32px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font: 12px system-ui;
}
.mix-stage .anchor {
  width: 90px; height: 40px; background: rgba(150, 255, 127, 0.5); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
</style>
