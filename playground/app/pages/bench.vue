<template>
  <!-- bench:渲染管线基准(sync position() vs defer requestPosition()) -->
  <main class="demo-page">
    <h1>bench</h1>
    <p>N 条线拖动:同步 position()(N 次 reflow/帧)vs 调度 requestPosition()(≤1 次/帧)</p>

    <p class="controls">
      <label>线数:
        <select v-model.number="lineCount" data-testid="line-count" @change="rebuild">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </label>
      <button data-testid="run-sync" :disabled="running" @click="runSync">跑 sync</button>
      <button data-testid="run-defer" :disabled="running" @click="runDefer">跑 defer</button>
      <button data-testid="run-both" :disabled="running" @click="runBoth">对比</button>
    </p>

    <div ref="stageRef" class="stage"></div>

    <section v-if="report" class="report" data-testid="report">
      <h3>结果({{ lineCount }} 线 × {{ frames }} 帧)</h3>
      <p class="note">
        口径:sync = N 次 position() 同步耗时(含 N 次强制 reflow);
        defer = 调度器 flush 实际执行耗时(来自调度器内部打点,≤1 次 reflow,不含帧对齐等待)。
        机制性指标(reflow 次数 N→1)见 <code>pnpm test:bench</code> 的 CDP LayoutCount。
      </p>
      <table>
        <thead><tr><th></th><th>mean</th><th>p95</th></tr></thead>
        <tbody>
          <tr v-if="report.sync"><td>sync position()</td><td>{{ report.sync.mean }}ms</td><td>{{ report.sync.p95 }}ms</td></tr>
          <tr v-if="report.defer"><td>defer flush 执行</td><td>{{ report.defer.mean }}ms</td><td>{{ report.defer.p95 }}ms</td></tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import LeaderLine from 'leader-line';

const stageRef = ref<HTMLElement>();
const lineCount = ref(50);
const frames = 30;
const running = ref(false);

interface Stat { mean: string; p95: string }
const report = ref<{ sync?: Stat; defer?: Stat } | null>(null);

let lines: InstanceType<typeof LeaderLine>[] = [];
let anchors: Array<[HTMLElement, HTMLElement]> = [];

function clearLines() {
  lines.forEach(l => l.remove());
  lines = [];
  anchors = [];
  if (stageRef.value) {
    stageRef.value.querySelectorAll('.bench-anchor').forEach(el => el.remove());
  }
}

function rebuild() {
  clearLines();
  const stage = stageRef.value!;
  for (let i = 0; i < lineCount.value; i++) {
    const a = document.createElement('div');
    const b = document.createElement('div');
    a.className = b.className = 'bench-anchor';
    a.style.left = (10 + (i % 10) * 55) + 'px';
    a.style.top = (10 + Math.floor(i / 10) * 55) + 'px';
    b.style.left = (60 + (i % 10) * 55) + 'px';
    b.style.top = (260 + Math.floor(i / 10) * 55) + 'px';
    stage.append(a, b);
    lines.push(new LeaderLine(a, b));
    anchors.push([a, b]);
  }
}

function moveAnchors(frame: number) {
  anchors.forEach(([a, b], i) => {
    a.style.top = (10 + Math.floor(i / 10) * 55 + Math.sin(frame / 5 + i) * 4) + 'px';
    b.style.top = (260 + Math.floor(i / 10) * 55 + Math.cos(frame / 5 + i) * 4) + 'px';
  });
}

function stats(samples: number[]): Stat {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    mean: (samples.reduce((s, v) => s + v, 0) / samples.length).toFixed(2),
    p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2)
  };
}

async function measure(mode: 'sync' | 'defer'): Promise<Stat> {
  const samples: number[] = [];
  for (let f = 0; f < frames; f++) {
    moveAnchors(f);
    if (mode === 'sync') {
      const t0 = performance.now();
      lines.forEach(l => l.position());
      samples.push(performance.now() - t0);
    } else {
      lines.forEach(l => l.requestPosition());
      // 调度器先注册 rAF(flush);本 promise 的 rAF 在其后,resolve 时 flush 已完成
      await new Promise(r => requestAnimationFrame(r));
      // 读调度器内部打点的真实 flush 耗时(不含帧对齐等待)
      const stats = (window as unknown as { positionScheduler: { stats: { lastFlushMs: number } } })
        .positionScheduler.stats;
      samples.push(stats.lastFlushMs);
    }
  }
  return stats(samples);
}

async function runSync() {
  running.value = true;
  report.value = { ...report.value, sync: await measure('sync') };
  running.value = false;
}

async function runDefer() {
  running.value = true;
  report.value = { ...report.value, defer: await measure('defer') };
  running.value = false;
}

async function runBoth() {
  running.value = true;
  const sync = await measure('sync');
  const defer = await measure('defer');
  report.value = { sync, defer };
  running.value = false;
}

onMounted(rebuild);
onBeforeUnmount(clearLines);
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.controls { display: flex; gap: 12px; align-items: center; }
.stage { position: relative; width: 620px; height: 460px; border: 1px dashed #ccc; border-radius: 8px; overflow: hidden; }
.report table { border-collapse: collapse; }
.report td, .report th { border: 1px solid #ddd; padding: 4px 12px; text-align: left; }
button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
button:disabled { opacity: 0.5; }
</style>

<style>
.bench-anchor {
  position: absolute; width: 40px; height: 20px;
  background: rgba(150, 255, 127, 0.5); border-radius: 4px;
}
</style>
