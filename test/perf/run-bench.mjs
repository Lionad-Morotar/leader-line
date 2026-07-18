// 渲染管线性能基准:N=50 线拖动
// 硬指标:CDP LayoutCount(每帧强制 layout 次数)——直接验证"N 次 reflow → ≤1 次"
// 辅助指标:帧耗时。用法:先起 vite dev server,再 node test/perf/run-bench.mjs
import { chromium } from 'playwright';

const PORT = process.env.BENCH_PORT || 5199;
const FRAMES = 40;
const WARMUP = 10;

// server 存活检测:无 server 时给出可操作提示而非误导性超时
{
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`http://localhost:${PORT}/test/perf/bench.html`, { signal: controller.signal });
    if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
  } catch (err) {
    console.error(`BENCH FAILED: vite dev server not reachable at :${PORT} (${err.message || err}).`);
    console.error(`Start one first:  pnpm exec vite --port ${PORT}`);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/test/perf/bench.html`);
await page.waitForFunction(() => window.benchReady, { timeout: 15000 });

const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');

async function getLayoutCount() {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = metrics.find(x => x.name === 'LayoutCount');
  return m ? m.value : 0;
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  return {
    mean: +mean.toFixed(2),
    p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2)
  };
}

// warmup
await page.evaluate(async n => {
  for (let i = 0; i < n; i++) { window.bench.syncFrame(i); await window.bench.deferFrame(i); }
}, WARMUP);

// 同步基线:逐帧记录耗时与 LayoutCount 增量
const syncResult = await page.evaluate(async n => {
  const times = [];
  for (let i = 0; i < n; i++) { times.push(window.bench.syncFrame(i)); }
  return times;
}, FRAMES);
// LayoutCount 需在浏览器侧逐帧采样——改在浏览器内读?CDP 只能 node 侧。
// 分两步:sync 帧前后各取一次(帧是同步循环,layout 全部发生在期间)
const layoutsBeforeSync = await getLayoutCount();
await page.evaluate(async n => {
  for (let i = 0; i < n; i++) { window.bench.syncFrame(i); }
}, FRAMES);
const layoutsAfterSync = await getLayoutCount();

const deferResult = await page.evaluate(async n => {
  const times = [];
  for (let i = 0; i < n; i++) { times.push(await window.bench.deferFrame(i)); }
  return times;
}, FRAMES);
const layoutsBeforeDefer = await getLayoutCount();
await page.evaluate(async n => {
  // 仅为产生 layout 负载;耗时采集已在上方 deferResult 完成
  for (let i = 0; i < n; i++) { await window.bench.deferFrame(i); }
}, FRAMES);
const layoutsAfterDefer = await getLayoutCount();

await browser.close();

const syncLayoutsPerFrame = (layoutsAfterSync - layoutsBeforeSync) / FRAMES;
const deferLayoutsPerFrame = (layoutsAfterDefer - layoutsBeforeDefer) / FRAMES;

const report = {
  lines: 50,
  frames: FRAMES,
  layouts_per_frame: {
    sync_position: +syncLayoutsPerFrame.toFixed(1),
    defer_requestPosition: +deferLayoutsPerFrame.toFixed(1)
  },
  frame_time_ms: {
    sync_position: stats(syncResult),
    defer_requestPosition: stats(deferResult)
  }
};
console.log(JSON.stringify(report, null, 2));

// A3 验收:调度路径每帧 layout 次数 ≤ 2(同步基线为 N 次量级)
if (deferLayoutsPerFrame > 2) {
  console.error(`BENCH FAILED: defer path has ${deferLayoutsPerFrame.toFixed(1)} layouts/frame (> 2)`);
  process.exit(1);
}
if (deferLayoutsPerFrame >= syncLayoutsPerFrame) {
  console.error('BENCH FAILED: defer path is not better than sync path on layout count');
  process.exit(1);
}
console.log('BENCH PASS');
