// S1 冒烟:headless chromium 直接以 <script> 加载 IIFE 产物,验证 P0 根治与基本可用性
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', err => errors.push(String(err)));

await page.goto('about:blank');
await page.addScriptTag({ path: 'dist/leader-line.min.js' });

const result = await page.evaluate(() => {
  const a = document.createElement('div');
  const b = document.createElement('div');
  [a, b].forEach((el, i) => {
    el.style.cssText = `position:absolute;left:${10 + i * 200}px;top:10px;width:50px;height:50px;background:red;`;
    document.body.appendChild(el);
  });
  const line = new window.LeaderLine(a, b);
  const svg = document.querySelector('svg.leader-line');
  const path = svg ? svg.querySelector('path') : null;
  const r = {
    leaderLineType: typeof window.LeaderLine,
    svgExists: !!svg,
    pathD: path ? path.getAttribute('d') : null
  };
  line.remove();
  return r;
});

await browser.close();

console.log(JSON.stringify({ ...result, pageErrors: errors }, null, 2));

const pass =
  result.leaderLineType === 'function' &&
  result.svgExists &&
  typeof result.pathD === 'string' && result.pathD.length > 0 &&
  errors.length === 0;
if (!pass) {
  console.error('SMOKE FAILED');
  process.exit(1);
}
console.log('SMOKE PASS');
