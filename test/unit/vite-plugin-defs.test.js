// vite-plugin-defs 行为测试:生成的 defs 模块须与既有 src/defs.js(Grunt 产物)语义等价
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generateDefs } from '../../build/vite-plugin-defs.js';

const ROOT = path.resolve(__dirname, '../..');

/** 把生成的 ESM 源码经 data: URL 动态 import,得到模块命名空间 */
async function importFromCode(code) {
  const b64 = Buffer.from(code, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${b64}`);
}

/** eval 既有 Grunt 产物快照(var 声明链),取出各常量 */
function evalLegacyDefs() {
  const code = fs.readFileSync(path.join(ROOT, 'test/unit/fixtures/legacy-defs.js'), 'utf8');
  return new Function(
    `${code}; return { DEFS_HTML, SYMBOLS, PLUG_KEY_2_ID, PLUG_2_SYMBOL, DEFAULT_END_PLUG, PLUG_BEHIND };`
  )();
}

describe('vite-plugin-defs generateDefs', () => {
  it('generates a module whose exports are equivalent to legacy src/defs.js', async () => {
    const symbolsHtml = fs.readFileSync(path.join(ROOT, 'src/symbols.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'src/leader-line.css'), 'utf8');
    const code = generateDefs(symbolsHtml, css);
    const mod = await importFromCode(code);
    const legacy = evalLegacyDefs();

    expect(mod.DEFS_HTML).toBe(legacy.DEFS_HTML);
    expect(mod.SYMBOLS).toEqual(legacy.SYMBOLS);
    expect(mod.PLUG_KEY_2_ID).toEqual(legacy.PLUG_KEY_2_ID);
    expect(mod.PLUG_2_SYMBOL).toEqual(legacy.PLUG_2_SYMBOL);
    expect(mod.DEFAULT_END_PLUG).toBe(legacy.DEFAULT_END_PLUG);
  });
});
