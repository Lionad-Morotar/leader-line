<template>
  <!-- tracer 场景:最小连线验证库引用链路(alias + defs 插件) -->
  <main class="demo-page">
    <h1>hello-line</h1>
    <p>最小连线:两个锚点 + 一条 fluid 曲线 + arrow2 端头</p>
    <div class="stage">
      <div id="anchor-a" class="anchor" :style="{ left: posA.left, top: posA.top }">A</div>
      <div id="anchor-b" class="anchor" :style="{ left: posB.left, top: posB.top }">B</div>
    </div>
    <p class="controls">
      <button data-testid="redraw" @click="redraw">重绘(position)</button>
      <button data-testid="toggle-color" @click="toggleColor">换色</button>
    </p>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue';
import LeaderLine from 'leader-line';

const posA = reactive({ left: '40px', top: '60px' });
const posB = reactive({ left: '320px', top: '220px' });
const lineColor = ref('coral');

let line: InstanceType<typeof LeaderLine> | null = null;

function create() {
  const a = document.getElementById('anchor-a')!;
  const b = document.getElementById('anchor-b')!;
  line = new LeaderLine(a, b, {
    color: lineColor.value,
    endPlug: 'arrow2',
    path: 'fluid'
  });
}

function redraw() {
  line?.position();
}

function toggleColor() {
  lineColor.value = lineColor.value === 'coral' ? 'steelblue' : 'coral';
  if (line) { line.color = lineColor.value; }
}

onMounted(create);
onBeforeUnmount(() => { line?.remove(); line = null; });
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.stage { position: relative; width: 560px; height: 320px; border: 1px dashed #ccc; border-radius: 8px; }
.anchor {
  position: absolute; width: 80px; height: 40px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-weight: 600;
}
.controls { display: flex; gap: 8px; margin-top: 12px; }
button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
</style>
