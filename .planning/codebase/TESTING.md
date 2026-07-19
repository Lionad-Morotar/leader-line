# 测试模式（Testing Patterns）

**分析日期：** 2026-07-18

## 测试框架（Test Framework）

**Runner:**
- vitest 4.1，双 project（`vite.config.js` 的 `test.projects`）：
  - `unit` —— node 环境，`test/unit/**/*.test.js`（构建插件、调度内核等纯逻辑）
  - `browser` —— playwright chromium headless，`test/spec/*.js`（迁移的 jasmine spec，真实布局引擎）
- 浏览器 project 启 `globals: true`（`describe`/`it`/`expect` 全局可用），spec 页面由 vitest 内置 vite server 服务（ESM 转换 + `virtual:leader-line-defs` 解析）
- 适配层 `test/setup-browser.js`：jasmine done 回调 shim（vitest 4 移除了 `fn(done)` 风格）、`jasmine.addMatchers` shim、`loadPage`/`loadPageAsync`（替代 test-page-loader）、自定义 matcher `expect.extend`

**断言库：**
- vitest expect（`toBe`、`toEqual`、`toContain`、`not.*`）加上自定义 matcher：`toContainAll`（针对 `traceLog` 输出的有序子序列匹配）和 `toNotContainAny`（jasmine compare 格式经 shim 转为 expect.extend，逻辑在 `test/util.js`）

**运行命令：**
```bash
pnpm test                  # 全量:unit + browser 双 project
pnpm exec vitest run --project browser test/spec/win-resize.js   # 单文件
pnpm test:smoke            # 产物冒烟:headless chromium <script> 直载 dist/leader-line.min.js
pnpm test:bench            # 渲染管线基准(CDP LayoutCount),需先起 vite dev server(:5199)
```
2.0 起旧 jasmine runner（`test/index.html` + `test/httpd.js`）与独立老页面（`polygon2PathList-test`、`traceLog-test`）已退役删除。

## 测试文件组织（Test File Organization）

**位置：**
- Browser spec：`test/spec/*.js`，每个功能区域一个文件 —— `funcs.js`、`bbox.js`、`socket.js`、`options.js`、`stats.js`、`win-resize.js`、`func-PATH_FLUID.js`、`func-PATH_GRID.js`、`effect.js`、`effect-show.js`、`attachment.js`、`svg-container.js`（fork 特性）、`position-schedule.js`（调度内核行为）
- Unit 测试：`test/unit/*.test.js`（vite-plugin-defs、vite-plugin-debug-strip、update-scheduler）+ `test/unit/fixtures/legacy-defs.js`（Grunt 时代 defs.js 快照，作等价性锚点）
- Fixture 页面位于 `test/spec/` 的同名子目录：`test/spec/common/page.html`（被 `options.js`、`stats.js`、`attachment.js` 等共享）、`test/spec/bbox/*.html`、`test/spec/socket/page.html`、`test/spec/win-resize/page.html`、`test/spec/funcs/funcs.html` —— 均为 `<script type="module">import LeaderLine from '/src/leader-line.js'</script>` 加载
- `@EXPORT` 提取机制：`test/exported-funcs.js` 通过 vite `?raw` 读取源码文本并按 `@EXPORT[file:...]@` 标记提取函数源码，供 spec eval 注入 mock 上下文（替代原 Grunt `funcs` 任务 + `getSource` XHR；`test/spec/func/PATH_GRID`、`PATH_FLUID` 文本文件仅作历史保留）
- 数据驱动用例：`test/func-PATH_GRID/testCases.json.js`（ESM 默认导出，被 spec import）
- `test/` 根目录的共享辅助文件：`util.js`（自定义 matcher）、`traceLog.js`（库写入的插桩日志）、`setup-browser.js`（vitest 适配层）、`guide-view.js` + `guide-view.css`（调试几何的视觉覆盖层）
- 冒烟与基准：`test/smoke/dist-smoke.mjs`、`test/perf/bench.html` + `run-bench.mjs`
- 手动/视觉演示页面（非自动化）：`test/attachment-label/`、`test/effect-show/`、`test/bindWindow/`、`test/reflow/`、`test/mask/`、`test/SHAPE_GAP.html`、`test/function-test/` —— 已改为 module script 加载，由 vite dev server 服务

**命名：**
- Spec：`test/spec/<feature>.js`；fixture：`test/spec/<feature>/<page>.html`
- 嵌套 iframe 子 fixture：`<page>-c1.html`、`<page>-c2.html` (`test/spec/common/page-c1.html`)
- 新 spec 直接放入 `test/spec/` 即被 `test.projects.browser.include` 拾取，无需注册

**结构：**
```
test/
├── setup-browser.js           # vitest 适配层(jasmine shim/loadPage/matcher)
├── exported-funcs.js          # @EXPORT 提取(vite ?raw)
├── util.js                    # toContainAll / toNotContainAny 自定义 matcher
├── traceLog.js                # DEBUG 构建写入的全局 traceLog
├── guide-view.js/.css         # 手动调试的几何视觉覆盖层
├── unit/                      # node 环境单测(插件/调度内核)
│   └── fixtures/legacy-defs.js
├── smoke/dist-smoke.mjs       # 产物 <script> 直载冒烟
├── perf/                      # 渲染管线基准(bench.html + run-bench.mjs)
├── spec/
│   ├── <feature>.js           # browser spec 文件
│   ├── <feature>/page.html    # iframe fixture 页面(module script)
│   └── common/page.html       # 共享 fixture:4 个 div + svg + iframe
└── <demo-feature>/            # 手动演示页面(attachment-label、mask、reflow 等)
```

## 测试结构（Test Structure）

**Suite 组织：**
```javascript
/* eslint-env jasmine */
/* global loadPage:false, customMatchers:false */
/* eslint no-underscore-dangle: [2, {"allow": ["_id"]}] */

describe('options', function() {
  'use strict';

  var window, document, traceLog, pageDone, ll;

  function loadBefore(beforeDone) {
    jasmine.addMatchers(customMatchers);
    loadPage('spec/common/page.html', function(frmWindow, frmDocument, body, done) {
      window = frmWindow;
      document = frmDocument;
      traceLog = window.traceLog;
      traceLog.enabled = true;
      pageDone = done;
      ll = new window.LeaderLine(document.getElementById('elm1'), document.getElementById('elm2'));
      beforeDone();
    });
  }

  describe('setOptions()', function() {
    beforeEach(loadBefore);

    it('setValidId()', function() {
      var props = window.insProps[ll._id];
      traceLog.clear();
      ll.path = 'straight';
      expect(traceLog.getTaggedLog('setOptions')).toContain('needs.position');
      expect(props.options.path).toBe(PATH_STRAIGHT);
      pageDone();
    });
  });
});
```
（改编自 `test/spec/options.js:1-87`）

**模式：**
- 迁移的 spec 保持 ES5 风格：`var`、`function()` 回调（与上游一致，不做风格重写）
- Spec 针对**真实 ESM 源码**运行：fixture 页面经 `<script type="module">import LeaderLine from '/src/leader-line.js'; window.LeaderLine = LeaderLine;</script>` 加载；vite server 转换时 development/test 模式保留 `[DEBUG]` 区域（`window.*` 调试句柄可用）
- 页面 fixture 由适配层的 `loadPage(url, callback)`（或 async 风格的 `loadPageAsync(url)`）加载到 iframe；回调签名 `(frmWindow, frmDocument, body, done)` 与 test-page-loader 一致，spec 需保存 `pageDone = done` 并在用例结束时调用
- Fixture 页面将 `requestAnimationFrame` shim 为 `setTimeout(cb, 1000/60)` 以获得确定性动画 (`test/spec/common/page.html`)
- jasmine 的 `done` 回调风格由 `test/setup-browser.js` 的 shim 统一 Promise 化（vitest 4 已移除该风格）；新 spec 推荐直接 async/await（参见 `test/spec/position-schedule.js`）
- 断言是 DOM 无关的，主要是状态和日志：通过 `window.insProps[ll._id]` 读取内部（仅在 `[DEBUG]` 保留时暴露），并通过 `traceLog.getTaggedLog('<tag>')` 断言插桩序列
- 数据驱动 spec 遍历 cases 数组：`testCases.forEach(function(testCase) { it(testCase.title, function() {...}); });` (`test/spec/func-PATH_GRID.js`)
- 大型 suite 按 API 区域通过嵌套 `describe` 分组，每个重新绑定 `beforeEach(loadBefore)`：`test/spec/attachment.js` 使用 `'functions'`、`'life cycle'`、`'ATTACHMENTS anchor'`、`'ATTACHMENTS.captionLabel'`、`'ATTACHMENTS.pathLabel'`

**纯函数提取测试（本仓库特有）：**
1. `src/leader-line.js` 内部的纯路径计算函数被包裹在 `@EXPORT[file:../test/spec/func/PATH_GRID]@ ... @/EXPORT@` 标记注释中
2. Spec 通过 `test/exported-funcs.js` 的 `getExportedFuncSource(name)` 获取函数源码（vite `?raw` import + 正则提取，与构建同一份源码）并 `eval('(' + source + ')')`
3. Spec 通过复制 `// ================ context` 横幅之间的相关常量/状态来重建函数的闭包上下文（socket/path id、MIN_GRAVITY*`、`curSocketXYSE`、`pathList`、`socketXY2Point`）
4. 每个 case 初始化上下文、运行 `func()`，并将生成的 `pathList` 与 `testCase.expected.pathList` 比较

## Mocking

**框架：** 未识别到 —— 没有 sinon/jest-mock/testdouble 等库。

**模式：**
- 不使用 mock，测试在 iframe fixture 中使用真实 DOM，配合显式的像素级精确布局常量，例如 `test/spec/bbox.js:8-28` 中的 `DOC_LEN = {'html-margin': 2, 'body-padding': 64, 'div-leftTop': 128, ...}`
- 浏览器引擎探测通过一个 DEBUG 专用钩子伪造：`window.engineFlags({IS_TRIDENT: true, ...})` (`src/leader-line.js:208-214`，例如用于 `test/spec/bbox.js`)
- 确定性定时通过替换 fixture 页面中的 `requestAnimationFrame` 为 `setTimeout` 实现 (`test/spec/common/page.html:6`)，而不是 fake timers
- 直接检查内部状态（`window.insProps`、`window.insAttachProps`、`window.animTasks`）而不是 spy
- 唯一类似 stub 的对象是为 `eval` 纯函数重建的上下文（`// ================ context` 块）

**应 Mock 什么：**
- 按当前约定，什么都不 mock。需要新布局场景时添加带精确样式的 fixture HTML。

**不应 Mock 什么：**
- DOM、SVG 几何和布局 —— 整个测试套件建立在真实浏览器布局之上；mock 这些会 defeat（破坏）测试目的
- `traceLog` —— 它是断言目标，不是 mock

## Fixtures 与 Factories

**测试数据：**
- 带内联样式和绝对定位元素的 HTML fixture 页面：`test/spec/common/page.html` 定义四个 `<div id="elm1..4">` 固定坐标、一个 `<svg>` 带 rect、一个嵌套 `<iframe src="page-c1.html">`
- Spec 内部的常量驱动几何表（`DOC_LEN`、`DIV_WIDTH = {static: 100, absolute: 101}` in `test/spec/bbox.js:8-30`）
- 路径函数的 JSON 用例全局变量：`test/func-PATH_GRID/testCases.json.js` 暴露 `testCases = [{title, args: {socketXYSE, socketGravitySE}, expected: {pathList}}, ...]`
- 结构测试中内联定义的纯对象树（`test/spec/funcs.js:34-46` 中的 `obj1`）

**位置：**
- 共享 fixture 页面：`test/spec/common/`
- 每个 spec 的 fixture 目录：`test/spec/<feature>/`
- Spec 内的构建器：`setUpDocument(props, document, body)` 从常量表应用样式属性 (`test/spec/bbox.js:50-62`)；`createBBox(props)` 构建 `{left, top, width, height, right, bottom}` 对象 (`test/spec/bbox.js:65-68`)
- 没有工厂库；辅助函数是 spec 或 `test/util.js` 中的普通函数

## 测试覆盖率（Coverage）

**要求：** 未配置覆盖率阈值；以"全量 spec 绿 + P0 冒烟 + 性能基准"为准入标准。

**CI：**
- GitHub Actions（`.github/workflows/ci.yml`）：`pnpm install --frozen-lockfile` → playwright chromium → `pnpm lint` → `pnpm typecheck` → `pnpm build` → `pnpm test` → `pnpm test:smoke`
- 性能基准（`pnpm test:bench`）不在 CI 门槛内，按需本地运行（需先起 vite dev server）

## 测试类型（Test Types）

**单元测试：**
- `test/unit/`（node 环境）：vite-plugin-defs、vite-plugin-debug-strip、update-scheduler 的行为测试
- 针对提取纯函数的 browser spec（`test/spec/func-PATH_GRID.js`、`test/spec/func-PATH_FLUID.js`）以及针对通过 `window.*` DEBUG 导出暴露的内部工具函数的 spec（`test/spec/funcs.js` 覆盖 `copyTree`、`isObject` 等）

**集成测试：**
- 测试套件的主体：spec 在 fixture 页面上构造真实 `LeaderLine` 实例，并断言内部状态 + trace 日志 —— `test/spec/options.js`、`stats.js`、`socket.js`、`effect.js`、`effect-show.js`、`attachment.js`（2613 行，最大的 suite）、`bbox.js`（跨窗口/iframe 几何）、`win-resize.js`（resize 事件驱动的重定位）

**端到端测试（E2E Tests）：**
- 未识别到自动化 e2e。`test/<feature>/` 演示页面（`attachment-label`、`bindWindow`、`effect-show`、`mask`、`reflow`、`function-test`、`func-PATH_GRID/cases.html`）是手动视觉回归页面，通过 `plain-draggable` 和下拉框交互式驱动（参见 `test/attachment-label/test.js`）

## 常见模式（Common Patterns）

**异步测试：**
```javascript
// 基于 loadPage 的设置（beforeAll/beforeEach 变体）：
beforeEach(function(beforeDone) {
  jasmine.addMatchers(customMatchers);
  loadPage('spec/common/page.html', function(frmWindow, frmDocument, body, done) {
    window = frmWindow;
    traceLog = window.traceLog;
    traceLog.enabled = true;
    pageDone = done;                       // 保存 fixture 释放回调
    ll = new window.LeaderLine(document.getElementById('elm1'),
                               document.getElementById('elm3'));
    beforeDone();                          // 通知 Jasmine 设置完成
  });
});

// 带 done 的异步断言：
it('update position when window is resized', function(done) {
  frame.style.width = (frameBBox.width - 50) + 'px';
  setTimeout(function() {
    expect(traceLog.getTaggedLog('positionByWindowResize'))
      .toEqual(['id=1', 'id=2', 'id=3', 'id=4']);
    done();
  }, ...);
});
```
（来自 `test/spec/stats.js:15-26` 和 `test/spec/win-resize.js:43-60`）

**Trace-log 断言（本仓库风格）：**
```javascript
traceLog.clear();
ll.startPlug = 'arrow2';
var log = traceLog.getTaggedLog('updatePlug');
expect(log).toContainAll(['plug_enabledSE[0]=true', 'plug_plugSE[0]=arrow2']);
expect(log).toNotContainAny(['plug_enabledSE[1]=true']);
```
（来自 `test/spec/stats.js:83-93`）—— 改变实例，然后断言哪些内部状态被写入（以及哪些**没有**被写入）。

**错误测试：**
```javascript
// 错误由公共 API 同步抛出；使用 toThrow 断言：
// （源自源码行为约定，例如 src/leader-line.js:2614）
expect(function() { new window.LeaderLine(elm1); }).toThrow();
// 异步 fixture 加载失败在回调中重新抛出：
getSource('./spec/func/PATH_GRID', function(error, source) {
  if (error) { throw error; }
  ...
});
```
(`test/spec/func-PATH_GRID.js:31-35`)

**注册自定义 matcher：**
```javascript
beforeEach(function() { jasmine.addMatchers(customMatchers); });
```
`customMatchers` 是来自 `test/util.js` 的全局变量；`jasmine.addMatchers` 由 `test/setup-browser.js` 的 shim 转为 `expect.extend`。新 spec 也可直接 `import { expect } from 'vitest'` 使用。

**内部状态断言：**
```javascript
var props = window.insProps[ll._id];
expect(props.curStats.line_color).toBe('rgba(255, 0, 0, 0.5)');
```
(`test/spec/stats.js:28-51`) —— 需要 DEBUG 构建全局变量；在 `src/leader-line.js` 中保持 `// [DEBUG]` 标记完好，否则这些 spec 会失败。

---

*测试分析：2026-07-18*
*最后映射：2026-07-18*
