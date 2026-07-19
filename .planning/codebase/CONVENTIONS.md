# 编码规范（Coding Conventions）

**分析日期：** 2026-07-18

## 命名模式（Naming Patterns）

**文件：**
- 所有 JS/CSS/HTML 文件使用 kebab-case：`src/leader-line.js`、`src/anim.js`、`test/get-source.js`、`test/guide-view.js`
- 测试规范以被测功能命名，大写功能关键字保留：`test/spec/func-PATH_GRID.js`、`test/spec/func-PATH_FLUID.js`、`test/spec/win-resize.js`、`test/spec/effect-show.js`
- 与规范配套的 fixture 页面放在同名目录：`test/spec/bbox.js` + `test/spec/bbox/coordinates.html`、`test/spec/win-resize.js` + `test/spec/win-resize/page.html`
- 嵌套 iframe fixture 子页面使用 `-c<N>` 后缀：`test/spec/common/page-c1.html`、`test/spec/bbox/nested-window-c1.html`
- Vendor 风格的子模块使用 kebab-case 目录：`src/path-data-polyfill/path-data-polyfill.js`

**函数：**
- camelCase，动词开头：`getBBox()`、`copyTree()`、`pathList2PathData()`、`setValidId()`、`forceReflow()` in `src/leader-line.js`
- 转换器名称中用 `2` 代替 "to"：`pathList2PathData()`、`bBox2PathData()`、`socketXY2Point()`
- 布尔谓词使用 `is`/`has` 前缀：`isObject()`、`isElement()`、`hasChanged()`、`isAttachment()`

**变量：**
- 局部变量和模块状态使用 camelCase：`insProps`、`curStats`、`aplStats`、`delayedProcs`
- 模块常量使用 UPPER_SNAKE_CASE：`APP_ID`、`SOCKET_TOP`、`PATH_FLUID`、`DEFAULT_OPTIONS`、`MIN_GRAVITY`、`SVG_NS` (`src/leader-line.js:44-97`)
- 键到 id 的查找映射使用后缀 `_KEY_2_ID`：`SOCKET_KEY_2_ID`、`PATH_KEY_2_ID`、`PLUG_KEY_2_ID` (`src/leader-line.js:47-51`)
- 起点/终点成对数组使用 `SE` 后缀：`anchorSE`、`socketSE`、`plugSE`、`socketGravitySE`、`plugColorSE`；三槽位标签数组使用 `SEM`：`labelSEM` (`src/leader-line.js:3390-3392`)
- 内部实例 id 是 `_id` —— 唯一允许的 underscore-dangle，按文件通过 `/* eslint no-underscore-dangle: [2, {"allow": ["_id"]}] */` 放行 (`src/leader-line.js:10`)
- 内部状态键使用 `<group>_<prop>` 的 snake 形式：`line_color`、`line_colorTra`、`plug_enabledSE`、`position_path`、`show_on` (`src/leader-line.js:153-186`)
- BBox 风格对象使用小写 DOMRect 风格属性：`{left, top, right, bottom, width, height}` (`src/leader-line.js:362-394`)

**类型：**
- JSDoc typedef 使用 PascalCase 或按领域的小写：`BBox`、`Point`、`AnimOptions`、`SymbolConf`、`StatConf`、`task`、`frameCallback` (`src/leader-line.js:18-66`、`src/anim.js:32-52`)
- `src/` 和 `test/` 中没有 TypeScript；类型仅作为 JSDoc 注解存在

## 代码风格（Code Style）

**格式化：**
- 未配置格式化工具（仓库中没有 Prettier/Biome 配置）
- 观察到的风格：2 空格缩进、单引号、始终加分号、无尾随逗号
- 多个 `var` 声明被合并为一条逗号分隔语句，放在作用域顶部，续行对齐 (`src/leader-line.js:44-197`、`test/spec/bbox.js:8-31`)
- 嵌套三元运算符被有意用于分支值选择 (`src/leader-line.js:39-43` in `test/spec/bbox.js`)
- 行长约 100 字符；长链在运算符处断行
- 镜像配置表的数组/对象每行一组条目，按列对齐 (`src/leader-line.js:3437-3445`)

**Linting：**
- ESLint 9 flat config：`eslint.config.js`（仓库内自包含）。策略：新代码（`src/update-scheduler.js`、`build/`、`vite.config.js`、测试基建）全量规则；遗留运行库（`src/leader-line.js`、`src/anim.js`、polyfill）与迁移 spec 只抓真实缺陷（`no-dupe-keys`/`no-unreachable`/`valid-typeof`），不管历史风格
- 浏览器代码中保留 ES5 函数表达式和 `var` 是有意为之（与上游一致），不要“现代化”它们
- 构建脚本与基建代码是现代风格：`build/*.js`、`vite.config.js`、`test/setup-browser.js` 使用 `const`/箭头函数/ESM
- 内联指令约定：
  - `/* global loadPage:false, customMatchers:false */` 声明跨文件浏览器全局（`:false` = 只读）
  - `/* exported anim */` 用于有意作为全局的顶层变量（遗留注释，ESM 化后仅作文档含义保留）
  - `// eslint-disable-line <rule>` 用于一次性例外，不再加注释
  - 配对使用 `/* eslint-disable <rule> */` / `/* eslint-enable <rule> */` 包裹有意违规的代码（spec 中的 `// ================ context` 块）

**样式表：**
- 所有运行时类都带 `leader-line-` 前缀：`.leader-line`、`.leader-line-line-path`、`.leader-line-caps-mask-anchor` (`src/leader-line.css`)
- `src/leader-line.scss` 是人工编写的源码，使用 `$app-id` 插值（`.#{$app-id}`）；编译产物 `src/leader-line.css` 才是构建实际内联的内容 —— 编辑 SCSS 并手动保持 CSS 同步
- `!important` 被有意用于对抗页面重置；当原因不明显时添加解释性注释 (`src/leader-line.scss:5`："Commonly used style `svg:not(:root)` is high scored.")

## 导入组织（Import Organization）

**顺序：**
- 源码为 ESM：`src/leader-line.js` 顶部 import `anim`、`pathDataPolyfill`、`AnimEvent`、`update-scheduler` 以及虚拟模块 `virtual:leader-line-defs`；rolldown 依模块图打包，无手动顺序
- Fixture 页面（`test/spec/**/*.html`）加载顺序：
  1. `window.requestAnimationFrame` shim（页面内联脚本）
  2. `/test/traceLog.js`（classic script，挂全局）
  3. `<script type="module">import LeaderLine from '/src/leader-line.js'; window.LeaderLine = LeaderLine;</script>`（deferred，最后执行）
- demo 页面的交互脚本以 `<script defer src="test.js">` 加载，保证在 module script 之后执行

**路径别名：**
- vitest/vite dev server 以项目根为根：`/src/*`、`/test/*` 直接可访问；`virtual:leader-line-defs` 由 vite-plugin-defs 解析

**构建时组合：**
- `src/leader-line.js` 保持单文件主模块（约 5200 行 IIFE 闭包），依赖经 ESM import 由 rolldown 内联：
  - `/* @EXPORT[file:../test/spec/func/PATH_GRID]@ */function() {...}` 标记仍保留，供 `test/exported-funcs.js` 以 `?raw` 提取纯函数用于单元测试（替代原 Grunt `funcs` 任务）
  - `[DEBUG]` 区域（traceLog 打点、`window.*` 调试句柄）由 vite-plugin-debug-strip 在生产构建剥除；development/test 保留

## 错误处理（Error Handling）

**模式：**
- 程序员错误 / 无效 API 使用：使用普通 `Error` 抛出 `throw new Error('<message>')`，消息表述为契约声明 —— `throw new Error('`start` and `end` are required.')` (`src/leader-line.js:2614`)、`throw new Error('`element` must be Element')` (`src/leader-line.js:3737`)、`throw new Error('Can\'t bind attachment')` (`src/leader-line.js:2606`)
- 可恢复运行时失败：`console.error('...')` + `return null` —— 参见 `getBBox()` 在元素已断开连接时返回 `null` (`src/leader-line.js:364-371`)；调用方必须判空
- 功能/polyfill 通知：`console.warn(...)` (`src/leader-line.js:317`)
- 没有自定义 Error 子类、没有错误码、没有任何 Result/Either 类型
- try/catch 仅用于旧版特性检测，且有意使用空处理程序：`catch (e) { /* ignore */ }` (`test/get-source.js:16-20`)
- 在 spec 中，异步 fixture 失败通过在回调中重新抛出暴露：`if (error) { throw error; }` (`test/spec/func-PATH_GRID.js:32`)

## 日志（Logging）

**框架：** 原生 `console.*` 加上一个专用追踪日志 `traceLog` (`test/traceLog.js`)，库在 DEBUG 构建下会调用它。

**模式：**
- `traceLog.add('<tagName>')` / `traceLog.add('</tagName>')` 包围一个逻辑操作；内部条目可通过 `traceLog.getTaggedLog('updateLine')` 断言 (`test/spec/stats.js:35`)。日志由 spec 中的 `traceLog.enabled = true` 开启，并通过 `DEBUG` 预处理标签从生产包中剥离。
- 插桩调用位于 `/* [DEBUG/] ... [DEBUG/] */` 之间，或带有尾部 `// [DEBUG/]` 注释，以便 `preProc.removeTag('DEBUG', ...)` 从发布构建中移除它们 (`Gruntfile.js:175`、`src/leader-line.js:199-241`)
- 临时调试日志以注释形式保留在源码中，按约定标记：`// console.log('[debug] setupWindow props', props)` (`src/leader-line.js:919,964,1130,2350,2507,3535`)。新增时遵循 `[debug]` / `[info]` 前缀约定；不要在库代码中保留活动的 `console.log` 调用。
- Spec 端详细日志受常量标志控制：`SHOW_LOG = false` (`test/spec/bbox.js:31`)

## 注释（Comments）

**何时注释：**
- 解释不明显浏览器怪癖的“为什么”：`// Trident fires first `resize` event when a page was loaded.` (`test/spec/win-resize.js:29`)、`// Edge has `window.chrome`, and future Gecko might have that.` (`src/leader-line.js:103`)
- 标记有意偏离：`// Don't use closure.` (`src/leader-line.js:3450`)、`// eslint-disable-line guard-for-in`
- 内联记录回退理由：`/* `transparent` might not be supported */` (`src/leader-line.css:40`)

**JSDoc/TSDoc：**
- 每个非平凡函数签名和所有结构类型都使用 JSDoc：`@typedef`、`@property`、`@param`、`@returns`、`@type`、`@callback` (`src/leader-line.js:18-66`、`src/anim.js:32-52`)
- Typedef 在消费它们的大 `var` 块中内联声明 (`src/leader-line.js:53-68`)
- 实例注册表使用 `@type {Object.<_id: number, props>}` 风格 (`src/leader-line.js:193-196`)
- 注释描述行为和契约，从不记录变更历史；`src/` 中没有 `TODO`/`FIXME`/`@deprecated` 标记

**区域横幅：**
- `// ================ context` / `// ================ /context` 界定从库复制到 spec 的代码，以便 `eval` 函数能在其上运行，始终包裹在 `/* eslint-disable no-unused-vars, indent */` 中 (`test/spec/func-PATH_GRID.js:9-22`、`test/spec/options.js:10-16`)

## 函数设计（Function Design）

**大小：**
- 核心几何/DOM 辅助函数小而单一职责：`getPointsLength()`、`getPointOnLine()`、`extendLine()` (`src/leader-line.js:495-527`)
- 大型更新编排器虽被容忍，但会分解为嵌套命名辅助函数：`updatePosition()` 嵌套 `getSocketXY()`、`socketXY2Point()`、`socketXYHasChanged()` (`src/leader-line.js:1507-1530`)；优先提取嵌套辅助函数而非让父函数膨胀

**参数：**
- 实例状态通过 `props` 第一个参数显式传递，而不是存到 `this`：`updateLine(props)`、`bindWindow(props, newWindow)`、`setStat(props, container, key, value, eventHandlers, log)`
- 公共 API 方法接收由 `setOptions(newOptions)` 合并的选项包对象 (`src/leader-line.js:2592`)
- 布尔标志放在最后，可选，使用 JSDoc 方括号：`getBBox(element, relWindow)` 中的 `[relWindow]` (`src/leader-line.js:356-362`)

**返回值：**
- 尽早返回；通过卫语句避免深层嵌套
- 可能失败的函数在调用方可以合理继续时返回 `null` 而不是抛出 (`getBBox`)
- 多值返回使用带文档化位置的普通数组：`getAlpha()` 返回 `[alpha, baseColor]` (`src/leader-line.js:248-296`)
- 事件绑定辅助函数返回取消订阅函数：`mouseEnterLeave()` 返回 `function() { ...removeEventListener... }` (`src/leader-line.js:306-343`)

## 模块设计（Module Design）

**导出：**
- 库是一个单一全局变量，由一个带防御性前导分号的 IIFE 产生：`;var LeaderLine = (function() { 'use strict'; ... })(); // eslint-disable-line no-extra-semi` (`src/leader-line.js:13`)
- 每个独立辅助文件遵循相同模式：`var anim = (function() {...})();` (`src/anim.js:3-5`)、`var traceLog = (function() {...})();` (`test/traceLog.js:3`)、`var getSource = (function() {...})();` (`test/get-source.js:3`)
- 跨文件全局变量通过 `window.X` 消费，并用 `/* global traceLog:false */` 头部声明
- 内部辅助函数通过追加 `window.copyTree = copyTree; // [DEBUG/]` 暴露给测试 —— 新增被测试的内部函数应遵循完全相同模式 (`src/leader-line.js:231,241,297,344,354,389,464`)
- 实例状态永远不会放在实例上；它位于以 `props._id` 为键的模块级注册表中：`insProps`、`insAttachProps` (`src/leader-line.js:193-196,3411`)。公共原型访问器通过声明式配置数组由 `Object.defineProperty(LeaderLine.prototype, propName, {get, set, enumerable: true})` 生成 (`src/leader-line.js:3427-3479`) —— 新增选项应扩展这些表，而不是手写访问器。

**桶文件：**
- 聚合通过 ESM 模块图（`src/leader-line.js` 的顶部 import）与 rolldown 打包完成，而非 index/桶模块。

**DEBUG/构建标记：**
- `// [DEBUG]` ... `// [/DEBUG]` 行对和 `/* [DEBUG/] ... [DEBUG/] */` 块对标记开发专用代码，由生产构建中的 `preProc.removeTag('DEBUG', ...)` 剥离 (`Gruntfile.js:175,200`)
- 单行尾部的 `// [DEBUG/]` 标记该行待剥离
- 编辑 `src/leader-line.js` 时保留这些标记；ESM 构建 (`build/esm.ts`) 和 IIFE 构建都依赖它们在已打包的 dist 文件中被预先解析。

---

*编码规范分析：2026-07-18*
*最后映射：2026-07-18*
