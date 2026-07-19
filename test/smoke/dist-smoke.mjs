// S1 冒烟:headless chromium 直接以 <script> 加载 IIFE 产物,验证 P0 根治与基本可用性;
// 以及 ESM 产物 import 通道与 exports 目标存在性
import { chromium } from 'playwright';
import fs from 'node:fs';

// 0. exports 目标存在性(防发布断链)
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const target of [pkg.main, pkg.module, pkg.types,
    pkg.exports['.'].import, pkg.exports['.'].require, pkg.exports['.'].types]) {
  if (!fs.existsSync(target)) {
    console.error('SMOKE FAILED: missing export target', target);
    process.exit(1);
  }
}

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

// ESM 通道:data: URL import dist/leader-line.mjs
const mjsCode = fs.readFileSync('dist/leader-line.mjs', 'utf8');
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(mjsCode).toString('base64');
await page.addScriptTag({ type: 'module', content: `import LeaderLine from '${dataUrl}'; window.__LL = LeaderLine;` });
await page.waitForFunction(() => window.__LL, { timeout: 10000 });
result.esmType = await page.evaluate(() => typeof window.__LL);

// CJS 产物不得含 process.env 引用与顶层 export(P0 回归)
const cjsCode = fs.readFileSync('dist/leader-line.cjs', 'utf8');
result.cjsHasProcessEnv = /process\.env/.test(cjsCode);
result.minHasProcessEnv = /process\.env/.test(fs.readFileSync('dist/leader-line.min.js', 'utf8'));

await browser.close();

console.log(JSON.stringify({ ...result, pageErrors: errors }, null, 2));

const pass =
  result.leaderLineType === 'function' &&
  result.svgExists &&
  typeof result.pathD === 'string' && result.pathD.length > 0 &&
  result.esmType === 'function' &&
  !result.cjsHasProcessEnv && !result.minHasProcessEnv &&
  errors.length === 0;
if (!pass) {
  console.error('SMOKE FAILED');
  process.exit(1);
}
console.log('SMOKE PASS');
