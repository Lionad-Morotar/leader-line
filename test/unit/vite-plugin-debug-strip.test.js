// vite-plugin-debug-strip 行为测试:生产剥除 [DEBUG] 行/块,dev 全保留
import { describe, it, expect } from 'vitest';
import { stripDebug, debugStripPlugin } from '../../build/vite-plugin-debug-strip.js';

const SAMPLE = [
  'var a = 1;',
  'traceLog.add("<update>"); // [DEBUG/]',
  'var b = 2;',
  '// [DEBUG]',
  'window.insProps = insProps;',
  'window.EFFECTS = EFFECTS;',
  '// [/DEBUG]',
  'var c = 3;'
].join('\n');

describe('vite-plugin-debug-strip', () => {
  it('removes single lines marked with [DEBUG/]', () => {
    const out = stripDebug(SAMPLE);
    expect(out).not.toContain('traceLog.add');
    expect(out).toContain('var a = 1;');
    expect(out).toContain('var b = 2;');
  });

  it('removes blocks between [DEBUG] and [/DEBUG]', () => {
    const out = stripDebug(SAMPLE);
    expect(out).not.toContain('window.insProps');
    expect(out).not.toContain('window.EFFECTS');
    expect(out).toContain('var c = 3;');
  });

  it('plugin transform strips src/*.js in prod mode', () => {
    const plugin = debugStripPlugin({ strip: true });
    const result = plugin.transform.call({}, SAMPLE, '/repo/src/leader-line.js');
    expect(result.code).not.toContain('traceLog.add');
    expect(result.code).toContain('var a = 1;');
  });

  it('plugin transform is a no-op in dev mode', () => {
    const plugin = debugStripPlugin({ strip: false });
    expect(plugin.transform.call({}, SAMPLE, '/repo/src/leader-line.js')).toBeNull();
  });

  it('plugin transform ignores files outside src/', () => {
    const plugin = debugStripPlugin({ strip: true });
    expect(plugin.transform.call({}, SAMPLE, '/repo/build/vite-plugin-defs.js')).toBeNull();
  });
});
