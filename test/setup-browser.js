/**
 * vitest browser 环境适配层:
 * 1. jasmine done 回调 shim —— vitest 4 移除了 fn(done) 风格(第一参数是 fixture context),
 *    这里把声明了 done 形参的函数统一 Promise 化,保持 spec 源码零改动
 * 2. loadPage —— 替代 test-page-loader,iframe 加载 spec 页面并回调页面 window
 * 3. toContainAll / toNotContainAny —— jasmine 自定义 matcher 的 vitest expect.extend 版
 *    逻辑与 test/util.js 保持一致(traceLog 标签序列匹配)
 */
import { expect } from 'vitest';
// util.js 以 IIFE 挂 window.toContainAll / toNotContainAny / customMatchers(jasmine 格式)
import './util.js';

// ---------- 0. jasmine 全局 shim ----------
// spec 里的 jasmine.addMatchers(customMatchers)(jasmine compare 格式)→ expect.extend
window.jasmine = {
  addMatchers(matchers) {
    const converted = {};
    for (const [name, factory] of Object.entries(matchers)) {
      converted[name] = function convertedMatcher(received, ...args) {
        const result = factory().compare(received, ...args);
        return {
          pass: result.pass,
          message: () => result.message || `expected ${JSON.stringify(received)} to pass matcher ${name}`
        };
      };
    }
    expect.extend(converted);
  }
};

// ---------- 1. jasmine done 回调 shim ----------

function jasmineDoneify(fn) {
  // 注意:必须是空参数函数——vitest 4 解析函数源码文本,
  // 第一参数若非解构模式(或存在 rest/具名参数)即抛 FixtureParseError
  return function wrapped() {
    return new Promise((resolve, reject) => {
      fn.call(this, function done(err) {
        return err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve();
      });
    });
  };
}

function wrapHook(orig) {
  return function wrappedHook(fn, timeout) {
    return orig(fn && fn.length >= 1 ? jasmineDoneify(fn) : fn, timeout);
  };
}

function wrapIt(orig) {
  const wrapped = function wrappedIt(name, fn, timeout) {
    return orig(name, fn && fn.length >= 1 ? jasmineDoneify(fn) : fn, timeout);
  };
  // 保留 it.skip / it.only / it.todo 等属性
  for (const key of Object.keys(orig)) { wrapped[key] = orig[key]; }
  return wrapped;
}

for (const name of ['beforeAll', 'beforeEach', 'afterAll', 'afterEach']) {
  globalThis[name] = wrapHook(globalThis[name]);
}
globalThis.it = wrapIt(globalThis.it);
globalThis.test = globalThis.it;

// ---------- 2. loadPage ----------

/**
 * 加载页面到 iframe,回调 (frameWindow, frameDocument, body, done)。
 * done() 移除 iframe(页面清理)。与 test-page-loader 的回调签名一致。
 */
window.loadPage = function loadPage(url, cb /* , title */) {
  // 旧 httpd 以 test/ 为根,vitest server 以项目根为根;统一规范为根绝对路径
  const src = url.startsWith('/') ? url : '/test/' + url;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:absolute;left:-600px;width:500px;height:500px;';
  frame.addEventListener('load', function loaded() {
    const win = frame.contentWindow;
    // module 脚本为 deferred,load 事件时页面已就绪
    frame.removeEventListener('load', loaded);
    cb(win, win.document, win.document.body, function done() {
      frame.remove();
    });
  });
  frame.src = src;
  document.body.appendChild(frame);
};

// ---------- 3. jasmine 自定义 matcher ----------

/**
 * 加载页面到 iframe,回调 (frameWindow, frameDocument, body, done)。
 * done() 移除 iframe(页面清理)。与 test-page-loader 的回调签名一致。
 */
window.loadPage = function loadPage(url, cb /* , title */) {
  // 旧 httpd 以 test/ 为根,vitest server 以项目根为根;统一规范为根绝对路径
  const src = url.startsWith('/') ? url : '/test/' + url;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:absolute;left:-600px;width:500px;height:500px;';
  frame.addEventListener('load', function loaded() {
    const win = frame.contentWindow;
    // module 脚本为 deferred,load 事件时页面已就绪
    frame.removeEventListener('load', loaded);
    console.log('[loadPage] loaded:', src, '| LeaderLine:', typeof win.LeaderLine, '| traceLog:', typeof win.traceLog);
    cb(win, win.document, win.document.body, function done() {
      frame.remove();
    });
  });
  frame.addEventListener('error', e => console.error('[loadPage] error:', src, e));
  frame.src = src;
  document.body.appendChild(frame);
};

function toContainAll(log, keys) {
  let logSeq;

  function containsSequence(seqKeys) {
    const ERR_MSG = '\\f that is used as marker is included.';
    if (logSeq == null) {
      if (log.join('').indexOf('\f') > -1) { throw new Error(ERR_MSG); }
      logSeq = '\f' + log.join('\f') + '\f';
    }
    if (seqKeys.join('').indexOf('\f') > -1) { throw new Error(ERR_MSG); }
    return logSeq.indexOf('\f' + seqKeys.join('\f') + '\f') > -1;
  }

  const pass = Array.isArray(log) && Array.isArray(keys) &&
    keys.every(key => (Array.isArray(key) ? containsSequence(key) : log.indexOf(key) > -1));
  return {
    pass,
    message: () => `expected traceLog ${pass ? 'not ' : ''}to contain all of ${JSON.stringify(keys)}`
  };
}

function toNotContainAny(log, keys) {
  const pass = Array.isArray(log) && Array.isArray(keys) &&
    keys.every(key => log.indexOf(key) === -1);
  return {
    pass,
    message: () => `expected traceLog ${pass ? 'not ' : ''}to contain none of ${JSON.stringify(keys)}`
  };
}

expect.extend({ toContainAll, toNotContainAny });
