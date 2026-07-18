<template>
  <!-- reflow:引擎 forceReflow workaround 场景演示 -->
  <main class="demo-page">
    <h1>reflow</h1>
    <p>引擎渲染 workaround:plug/line 变化时的 forceReflow 行为(BLINK/WEBKIT/GECKO 分支)</p>

    <p class="controls">
      <button v-for="step in steps" :key="step.title" :data-testid="step.id" @click="step.run">
        {{ step.title }}
      </button>
      <button data-testid="reset" @click="reset">重置</button>
    </p>

    <div class="stage">
      <div ref="a0" class="anchor">anchor-0</div>
      <div ref="a1" class="anchor end">anchor-1</div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import LeaderLine from 'leader-line';

const a0 = ref<HTMLElement>();
const a1 = ref<HTMLElement>();

let line: InstanceType<typeof LeaderLine> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function later(ms: number, fn: () => void) {
  if (timer) { clearTimeout(timer); }
  timer = setTimeout(fn, ms);
}

const steps = [
  {
    id: 'plug-size', title: 'arrow2+outline → size+2',
    run() {
      line?.setOptions({ startPlug: 'arrow2', outline: true, outlineColor: 'rgba(255, 0, 0, 0.5)' });
      // [TRIDENT] plugsFace is not updated when lineSize is changed
      later(500, () => { if (line) { line.size += 2; } });
    }
  },
  {
    id: 'square-size', title: 'square plugs → size+10',
    run() {
      line?.setOptions({ startPlug: 'square', endPlug: 'square' });
      // [BLINK], [WEBKIT] lineSize is not updated when path is not changed
      later(500, () => { if (line) { line.size += 10; } });
    }
  },
  {
    id: 'outline-color', title: 'arrow2+outline 彩色',
    run() {
      // [TRIDENT] lineColor is ignored / lineOutlineColor is ignored; [GECKO] plugsFace is ignored
      line?.setOptions({ startPlug: 'arrow2', outline: true, outlineColor: 'rgba(255, 0, 0, 0.5)' });
    }
  },
  {
    id: 'plug-outline-color', title: 'plugOutline 变色',
    run() {
      // [TRIDENT] lineMaskCaps is not updated when plugOutline_colorTraSE is changed
      line?.setOptions({ startPlug: 'arrow2', startPlugOutline: true, startPlugOutlineColor: 'rgba(0, 0, 255, 0.8)' });
      later(500, () => line?.setOptions({ startPlugOutlineColor: 'rgba(255, 0, 0, 0.8)' }));
    }
  },
  {
    id: 'transparent', title: '透明色 → 实色',
    run() {
      // [BLINK][WEBKIT][TRIDENT] forceReflow for transparent colors
      line?.setOptions({ color: 'rgba(255, 0, 0, 0)' });
      later(800, () => line?.setOptions({ color: 'rgba(255, 0, 0, 0.6)' }));
    }
  }
];

function reset() {
  if (timer) { clearTimeout(timer); }
  line?.remove();
  line = new LeaderLine(a0.value!, a1.value!, { size: 16, color: 'rgba(255, 0, 0, 0.5)' });
}

onMounted(reset);
onBeforeUnmount(() => { if (timer) { clearTimeout(timer); } line?.remove(); });
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.controls { display: flex; gap: 8px; flex-wrap: wrap; }
.stage { position: relative; width: 560px; height: 300px; border: 1px dashed #ccc; border-radius: 8px; }
.anchor {
  position: absolute; width: 100px; height: 40px; left: 40px; top: 40px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.anchor.end { left: 360px; top: 200px; }
button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
</style>
