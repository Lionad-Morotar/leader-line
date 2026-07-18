/**
 * vite-plugin-debug-strip
 * 生产构建时剥除 [DEBUG] 区域(traceLog 打点、window.* 调试句柄),
 * 复用既有 pre-proc 包;dev/test 模式保留,等价于原 Grunt preProc.removeTag 行为。
 */

import preProc from 'pre-proc';

/**
 * 剥除 DEBUG 区域(纯函数,便于单测)。
 * @param {string} code - 源码
 * @returns {string} 剥除后源码
 */
export function stripDebug(code) {
  return preProc.removeTag('DEBUG', code);
}

export function debugStripPlugin(options = {}) {
  const strip = options.strip !== false;
  return {
    name: 'leader-line-debug-strip',
    enforce: 'pre',
    transform(code, id) {
      if (!strip || !/\/src\/.+\.js$/.test(id)) { return null; }
      return { code: stripDebug(code), map: null };
    }
  };
}

export default debugStripPlugin;
