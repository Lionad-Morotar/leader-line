/**
 * @EXPORT 函数提取(替代原 Grunt testFuncs 任务 + getSource XHR):
 * 通过 vite ?raw 读取源码文本,按 @EXPORT[file:...]@ 标记提取函数源码,
 * 供 spec eval 注入 mock 上下文——保持"测试与构建同一份源码"的原设计。
 */
import leaderLineSrc from '../src/leader-line.js?raw';

const cache = {};

/**
 * 按名字提取 @EXPORT 段函数源码(如 'PATH_FLUID'、'PATH_GRID')。
 * @param {string} name - @EXPORT[file:../test/spec/func/<name>]@ 的末段名
 * @returns {string} 函数表达式源码文本
 */
export function getExportedFuncSource(name) {
  if (!cache[name]) {
    const re = /@EXPORT\[file:([^\n]+?)\]@\s*(?:\*\/\s*)?([\s\S]*?)\s*(?:\/\*\s*|\/\/\s*)?@\/EXPORT@/g;
    let matches;
    while ((matches = re.exec(leaderLineSrc))) {
      const file = matches[1];
      if (file.endsWith('/' + name) || file === name) {
        cache[name] = matches[2];
        break;
      }
    }
    if (!cache[name]) { throw new Error(`@EXPORT not found: ${name}`); }
  }
  return cache[name];
}
