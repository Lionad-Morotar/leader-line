<template>
  <!-- effect-show:show/hide 效果与运行中切换 -->
  <main class="demo-page">
    <h1>effect-show</h1>
    <p>show/hide 效果(none/fade/draw)与运行中切换效果/选项/窗口</p>

    <p class="controls">
      <button v-for="step in steps" :key="step.title" :data-testid="step.id" @click="step.run">
        {{ step.title }}
      </button>
      <button data-testid="reset" @click="reset">重置</button>
    </p>

    <div class="views">
      <div class="stage">
        <div ref="a0" class="anchor">anchor-0</div>
        <div ref="a1" class="anchor end">anchor-1</div>
      </div>
      <iframe ref="frameRef" class="child-frame" title="child"></iframe>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import LeaderLine from 'leader-line';

const a0 = ref<HTMLElement>();
const a1 = ref<HTMLElement>();
const frameRef = ref<HTMLIFrameElement>();

let line: InstanceType<typeof LeaderLine> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let childAnchors: [HTMLElement, HTMLElement] | null = null;

function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
function later(ms: number, fn: () => void) { clearTimer(); timer = setTimeout(fn, ms); }

const steps = [
  {
    id: 'fade-then-show', title: 'hide fade → show',
    run() {
      line?.hide('fade', { duration: 2000 });
      later(3000, () => line?.show());
    }
  },
  {
    id: 'draw-then-show', title: 'hide draw 中 show',
    run() {
      line?.hide('draw', { duration: 2000 });
      later(1000, () => line?.show());
    }
  },
  {
    id: 'switch-effect', title: '运行中切换效果',
    run() {
      line?.hide('fade', { duration: 2000 });
      later(1000, () => line?.hide('draw', { duration: 2000, timing: 'linear' }));
    }
  },
  {
    id: 'switch-options', title: '运行中改选项',
    run() {
      line?.hide('draw', { duration: 2000, timing: 'linear' });
      later(1000, () => line?.hide('draw', { duration: 8000, timing: 'linear' }));
    }
  },
  {
    id: 'switch-both', title: '运行中换效果+选项',
    run() {
      line?.hide('fade', { duration: 2000, timing: 'linear' });
      later(1000, () => line?.show('draw', { duration: 8000, timing: 'linear' }));
    }
  },
  {
    id: 'switch-window', title: '运行中跨窗口',
    run() {
      line?.hide('none');
      line?.show('draw', { duration: 2000 });
      later(1000, () => {
        if (childAnchors) { line?.setOptions({ start: childAnchors[0], end: childAnchors[1] }); }
      });
    }
  }
];

function reset() {
  clearTimer();
  line?.remove();
  line = new LeaderLine(a0.value!, a1.value!, { size: 16, color: 'rgba(255, 0, 0, 0.5)' });
}

onMounted(() => {
  const doc = frameRef.value!.contentDocument!;
  doc.body.innerHTML =
    '<style>.anchor{position:absolute;width:100px;height:36px;background:rgba(127,200,255,.5);border-radius:6px;display:flex;align-items:center;justify-content:center;font:12px system-ui}</style>' +
    '<div class="anchor" id="c0" style="left:20px;top:30px">child-0</div>' +
    '<div class="anchor" id="c1" style="left:220px;top:120px">child-1</div>';
  childAnchors = [doc.getElementById('c0')!, doc.getElementById('c1')!];
  reset();
});

onBeforeUnmount(() => { clearTimer(); line?.remove(); });
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.controls { display: flex; gap: 8px; flex-wrap: wrap; }
.views { display: flex; gap: 16px; }
.stage { position: relative; width: 480px; height: 280px; border: 1px dashed #ccc; border-radius: 8px; }
.anchor {
  position: absolute; width: 100px; height: 40px; left: 40px; top: 40px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.anchor.end { left: 300px; top: 180px; }
.child-frame { width: 380px; height: 280px; border: 1px dashed #ccc; border-radius: 6px; }
button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
</style>
