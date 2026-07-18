# 测试模式（Testing Patterns）

**分析日期：** 2026-07-18

## 测试框架（Test Framework）

**Runner：**
- Jasmine（浏览器 HTML reporter），`jasmine-core` ^3.7.1 —— `package.json:41` 中的 devDependency
- 没有配置文件；runner 是一个普通 HTML 页面：`test/index.html`
- 由手写的静态服务器提供服务：`test/httpd.js`（`node-static-alias` + `log4js`，端口 8080，文档根目录 `test/`，别名 `/jasmine-core/*`、`/test-page-loader/*`、`/anim-event/*`、`/plain-draggable/*` 映射到 `node_modules`，`/src/*` 映射到仓库根目录的 `src/`）
- 仓库中**没有 `npm test` 脚本** —— `package.json:52-58` 只定义了 `dev`、`build`、`build:iife`、`build:esm`、`clean`。测试需要在浏览器中手动运行。

**断言库：**
- Jasmine 内置断言（`toBe`、`toEqual`、`toContain`、`not.*`）加上 `test/util.js` 中定义的两个自定义 matcher：`toContainAll`（针对 `traceLog` 输出的有序子序列匹配）和 `toNotContainAny`

**运行命令：**
```bash
node test/httpd.js              # 在 :8080 启动 fixture/spec 服务器
# open http://localhost:8080/                    -> 完整 Jasmine spec runner (test/index.html)
# open http://localhost:8080/traceLog-test.html  -> test/traceLog.js 的遗留独立 runner
# open http://localhost:8080/polygon2PathList-test.html -> test/polygon2PathList.js 的遗留 runner
npx grunt funcs                 # 根据 src/leader-line.js 中的 @EXPORT 标记重新生成 test/spec/func/*
```
注意：`test/httpd.js` 没有 npm 脚本包装；直接用 node 运行。没有无头/CI runner —— 没有 Karma、Playwright 或 puppeteer 配置。

## 测试文件组织（Test File Organization）

**位置：**
- Spec：`test/spec/*.js`，每个功能区域一个文件 —— `funcs.js`、`bbox.js`、`socket.js`、`options.js`、`stats.js`、`win-resize.js`、`func-PATH_FLUID.js`、`func-PATH_GRID.js`、`effect.js`、`effect-show.js`、`attachment.js`
- Fixture 页面位于 `test/spec/` 的同名子目录：`test/spec/common/page.html`（被 `options.js`、`stats.js`、`attachment.js` 等共享）、`test/spec/bbox/*.html`、`test/spec/socket/page.html`、`test/spec/win-resize/page.html`、`test/spec/funcs/funcs.html`
- 提取出的纯函数被测对象：`test/spec/func/PATH_GRID`、`test/spec/func/PATH_FLUID`（生成产物 —— 不要手动编辑；它们来自 `src/leader-line.js:1684,1732` 的 `@EXPORT[file:...]@` 标记，通过 Grunt 的 `funcs` 任务生成，`Gruntfile.js:149-163`）
- 数据驱动用例：`test/func-PATH_GRID/testCases.json.js`（暴露全局 `testCases` 数组，被 spec 和手动查看器 `test/func-PATH_GRID/cases.html` 共享）
- `test/` 根目录的共享辅助文件：`util.js`（自定义 matcher）、`get-source.js`（源码文本 XHR 获取）、`traceLog.js`（库写入的插桩日志）、`guide-view.js` + `guide-view.css`（调试几何的视觉覆盖层）
- 手动/视觉演示页面（非 Jasmine）：`test/attachment-label/`、`test/effect-show/`、`test/bindWindow/`、`test/reflow/`、`test/mask/`、`test/function-test/` —— 每个都包含 `index.html` + `test.js` + `view.css`，由 `plain-draggable` 驱动以进行交互检查

**命名：**
- Spec：`test/spec/<feature>.js`；fixture：`test/spec/<feature>/<page>.html`
- 嵌套 iframe 子 fixture：`<page>-c1.html`、`<page>-c2.html` (`test/spec/common/page-c1.html`)
- 每个 spec 文件都通过显式的 `<script>` 标签在 `test/index.html:16-30` 中注册 —— 新增 spec 必须加在那里。

**结构：**
```
test/
├── index.html                 # Jasmine runner：按固定顺序加载辅助文件 + 所有 specs
├── httpd.js                   # 带 node_modules + /src 别名的静态服务器（端口 8080）
├── util.js                    # toContainAll / toNotContainAny 自定义 matcher
├── get-source.js              # getSource(url, cb) XHR 辅助函数（window.getSource）
├── traceLog.js                # DEBUG 构建写入的全局 traceLog
├── guide-view.js/.css         # 手动调试的几何视觉覆盖层
├── spec/
│   ├── <feature>.js           # spec 文件
│   ├── <feature>/page.html    # iframe fixture 页面
│   ├── common/page.html       # 共享 fixture：4 个 div + svg + iframe
│   └── func/PATH_GRID         # 提取的纯函数（由 grunt funcs 生成）
└── <demo-feature>/            # 手动演示页面（attachment-label、mask、reflow 等）
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
- Spec 中只用 ES5：`var`、`function()` 回调 —— 由 `test/.eslintrc.json` 强制（`no-var: off`、`prefer-arrow-callback: off`）
- Spec 针对**真实的、未打包的源码**运行：fixture 页面按顺序加载 `/src/defs.js`、/src/anim.js`、`/src/path-data-polyfill/path-data-polyfill.js`、/anim-event/anim-event.min.js`、/traceLog.js`、`/src/leader-line.js` (`test/spec/common/page.html:6-12`)
- 页面 fixture 由 `test-page-loader` 的全局 `loadPage(url, callback[, title])` 加载到 iframe 中；回调接收 `(frmWindow, frmDocument, body, done)`。Spec 必须保存 `pageDone = done` 并在每个 `it` 结束时调用它 —— 在 `afterAll`/`afterEach` 或每个 `it` 末尾 (`test/spec/funcs.js:67-79`、`test/spec/win-resize.js:37-41`)
- Fixture 页面将 `requestAnimationFrame` shim 为 `setTimeout(cb, 1000/60)` 以获得确定性动画 (`test/spec/common/page.html:6`)
- 设置：`beforeAll`/`beforeEach` 调用 `loadPage` 并通过注入的 `beforeDone` 发信号；拆卸调用 `pageDone()`
- 断言是 DOM 无关的，主要是状态和日志：通过 `window.insProps[ll._id]` 读取内部（仅在 DEBUG 构建中暴露，`src/leader-line.js:200`），并通过 `traceLog.getTaggedLog('<tag>')` 断言插桩序列
- 异步 `it` 使用 Jasmine 的 `done` 回调配合 `setTimeout` 等待 (`test/spec/win-resize.js:43-60`)
- 数据驱动 spec 遍历全局 cases 数组：`testCases.forEach(function(testCase) { it(testCase.title, function() {...}); });` (`test/spec/func-PATH_GRID.js:38-44`)
- 大型 suite 按 API 区域通过嵌套 `describe` 分组，每个重新绑定 `beforeEach(loadBefore)`：`test/spec/attachment.js` 使用 `'functions'`、`'life cycle'`、`'ATTACHMENTS anchor'`、`'ATTACHMENTS.captionLabel'`、`'ATTACHMENTS.pathLabel'`

**纯函数提取测试（本仓库特有）：**
1. `src/leader-line.js` 内部的纯路径计算函数被包裹在 `@EXPORT[file:../test/spec/func/PATH_GRID]@ ... @/EXPORT@` 标记注释中 (`src/leader-line.js:1732`)
2. `npx grunt funcs` 仅将该函数体重写进 `test/spec/func/PATH_GRID`
3. Spec 使用 `getSource('./spec/func/PATH_GRID', cb)` 获取它，并 `eval('(' + source + ')')` (`test/spec/func-PATH_GRID.js:30-36`)
4. Spec 通过复制 `// ================ context` 横幅之间的相关常量/状态来重建函数的闭包上下文（socket/path id、MIN_GRAVITY*`、`curSocketXYSE`、`pathList`、`socketXY2Point`）
5. 每个 case 初始化上下文、运行 `func()`，并将生成的 `pathList` 与 `testCase.expected.pathList` 比较

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

**要求：** 未识别到 —— 没有 nyc/istanbul/c8 依赖、没有 coverage 脚本、没有阈值配置，也没有 CI 流水线（仓库中没有 `.github/`、`.travis.yml` 等）。

**查看覆盖率：**
```bash
# 未识别到
```

## 测试类型（Test Types）

**单元测试：**
- 针对提取纯函数的 Jasmine spec（`test/spec/func-PATH_GRID.js`、`test/spec/func-PATH_FLUID.js`）以及针对通过 `window.*` DEBUG 导出暴露的内部工具函数的 spec（`test/spec/funcs.js` 覆盖 `copyTree`、`isObject` 等）
- 独立辅助函数的遗留独立 Jasmine 页面：`test/polygon2PathList-test.html`（内嵌自己的 Jasmine 2.4.1 和内联 spec）、`test/traceLog-test.html`

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
`customMatchers` 是来自 `test/util.js` 的全局变量；使用 `toContainAll`/`toNotContainAny` 的 spec 声明 `/* global customMatchers:false */`，并在每个需要它们的 `beforeEach`/`beforeAll` 中注册。

**内部状态断言：**
```javascript
var props = window.insProps[ll._id];
expect(props.curStats.line_color).toBe('rgba(255, 0, 0, 0.5)');
```
(`test/spec/stats.js:28-51`) —— 需要 DEBUG 构建全局变量；在 `src/leader-line.js` 中保持 `// [DEBUG]` 标记完好，否则这些 spec 会失败。

---

*测试分析：2026-07-18*
*最后映射：2026-07-18*
