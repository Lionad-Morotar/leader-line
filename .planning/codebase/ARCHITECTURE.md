<!-- refreshed: 2026-07-18 -->
# 架构（Architecture）

**分析日期:** 2026-07-18

## 系统概览（System Overview）

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    公共 API（单一类）                                  │
│         `LeaderLine` —— 构造函数 + 原型访问器                          │
│              `src/leader-line.js` 第 3387-3570 行                     │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ 构造 / 修改
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│           选项 → 状态（Stats）流水线（状态机）                          │
│  setOptions → curStats（期望状态）→ aplStats（已应用状态）→ DOM 写入   │
│  `src/leader-line.js` 第 2506-2740 行（setOptions），                   │
│                      第 2349-2408 行（update）                         │
└──────┬──────────────┬──────────────┬──────────────┬──────────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌───────────┐ ┌────────────┐ ┌─────────────┐ ┌────────────────┐
│  EFFECTS  │ │SHOW_EFFECTS│ │ ATTACHMENTS │ │   路径引擎      │
│ dash/grad │ │ none/fade/ │ │ pointAnchor │ │  updatePosition│
│ ient/shad │ │ draw       │ │ areaAnchor  │ │  updatePath    │
│ ow        │ │            │ │ captionLabel│ │  第 1507-2070  │
│ 第 2845 行 │ │ 第 3167 行  │ │ pathLabel   │ │                │
│           │ │            │ │ 第 3684 行   │ │                │
└───────────┘ └────────────┘ └─────────────┘ └────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│       SVG DOM 层 —— 每个 LeaderLine 实例一个 <svg>                     │
│  linePath、lineShape、plugsFaceSE、lineMask、lineOutlineMask、         │
│  capsMaskAnchorSE、maskBGRect —— 在 `bindWindow` 第 931-1145 行构建   │
│  挂载到 `options.svgContainer`（fork 新增）或 `document.body`           │
└──────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ symbol 定义
┌──────────────────────────────────────────────────────────────────────┐
│  共享的 `<svg id="leader-line-defs">` —— 每个窗口注入一次              │
│  构建时从 `src/symbols.html` 生成到 `src/defs.js`                       │
└──────────────────────────────────────────────────────────────────────┘
```

## 组件职责（Component Responsibilities）

| 组件 | 职责 | 文件 |
|-----------|----------------|------|
| `LeaderLine`（构造函数 + 原型） | 公共 API 面、选项访问器、生命周期（`setOptions`、`position`、`show`、`hide`、`remove`） | `src/leader-line.js:3387-3570` |
| 选项 / 状态（stats）状态机 | 验证用户选项 → 写入 `curStats` → 与 `aplStats` 做 diff → 触发各特性更新器 | `src/leader-line.js:2506-2740`、`:857-880`（`initStats`、`setStat`） |
| 更新流水线（`update`） | 有序重渲染：line → plug → lineOutline → plugOutline → faces → position → path → viewBox → mask → effect | `src/leader-line.js:2349-2408` |
| 几何辅助函数 | 纯数学函数：`getPointOnCubic`、`getCubicLength`、`getCubicT`、`getOffsetLine`、`getOffsetCubic`、`pathList2PathData`、`bBox2PathData` | `src/leader-line.js:495-710` |
| 帧 / 窗口桥接 | 处理 `<iframe>` 嵌套：`getFrames`、`getCommonWindow`、`getBBoxNest`、`getBodyOffset` | `src/leader-line.js:404-911` |
| SVG 元素工厂 | `bindWindow` 为单个实例创建 `<svg>`、`<defs>`、path、mask、marker | `src/leader-line.js:931-1145` |
| `EFFECTS` 注册表 | 全局线条视觉效果，遵循 `init/remove/update/stats/optionsConf` 契约 | `src/leader-line.js:2845-3146`（`dash`、`gradient`、`dropShadow`） |
| `SHOW_EFFECTS` 注册表 | 显示/隐藏过渡效果，遵循 `init/start/stop/defaultAnimOptions` 契约 | `src/leader-line.js:3167-3380`（`none`、`fade`、`draw`） |
| `ATTACHMENTS` 注册表 | 通过 `LeaderLineAttachment` 绑定到 `LeaderLine` 的辅助图形 | `src/leader-line.js:3684-5210`（`pointAnchor`、`areaAnchor`、`mouseHoverAnchor`、`captionLabel`、`pathLabel`） |
| `anim` 帧调度器 | 带 cubic-bezier 计时、反向与循环支持的 `requestAnimationFrame` 循环 | `src/anim.js`（283 行，`@EXPORT@` 包裹） |
| `AnimEvent` | 用于窗口 resize 的速率限制事件包装器 | `node_modules/anim-event`（通过 `PACK_LIBS` 内置） |
| `pathDataPolyfill` | 跨浏览器规范化 `path.getPathData()` / `setPathData()` | `src/path-data-polyfill/path-data-polyfill.js`（1147 行） |
| Symbol defs 构建 | 解析 `src/symbols.html`（cheerio）→ 生成 `DEFS_HTML` + `SYMBOLS` / `PLUG_*` JS 字面量 | `Gruntfile.js:57-148`（`taskHelper:getSvgDefs`） |
| 打包器 | 替换 `@INCLUDE[code:X]@` 标记，剥离 `[DEBUG]` 区域，运行 uglify | `Gruntfile.js:165-215`（`taskHelper:packJs`、`packMinJs`） |
| ESM 重新打包器 | Rollup 将 IIFE dist 产物转换为单个 ESM 文件 | `build/esm.ts`、`gulpfile.ts` |

## 模式概览（Pattern Overview）

**整体：** 单 IIFE 模块，由声明式 stats / 状态机驱动分层 SVG DOM。插件式注册表（`EFFECTS`、`SHOW_EFFECTS`、`ATTACHMENTS`）在一个其他方面封闭的模块内提供开放式扩展点。

**关键特征：**
- 一个巨大的闭包 —— `src/leader-line.js` 是一个 5,238 行的 IIFE，赋值给 `var LeaderLine`。源码中没有 ES 模块的 import / export；唯一一个 `export default` 出现在第 5238 行，作为便于构建的 shim。
- 宏模板化源码 —— `@INCLUDE[code:X]@` 占位符和 `[DEBUG]` / `[DEBUG/]` 区域标记在构建时由 `pre-proc` 处理。若不经过 Grunt 构建，或不使用定义了等效 `window.*` 全局变量的调试工具，源码无法直接在浏览器中运行。
- 两阶段状态（`curStats` 与 `aplStats`）—— 每个视觉属性都有“当前”（期望）和“已应用”（已与 DOM 同步）两个槽。`setStat` 写入已应用值，触发 `apl_*` / `cur_*` 事件，让订阅者（effects、attachments）作出反应。
- 基于注册表的插件 —— `EFFECTS`、`SHOW_EFFECTS`、`ATTACHMENTS` 都是按名称键控的普通对象；构造函数和 `setOptions` 通过 `Object.keys(...).forEach` 遍历它们，因此新增一条记录即可自动连接访问器与生命周期。
- 每实例 props 注册表 —— 实例状态保存在模块级的 `insProps[_id]` / `insAttachProps[_id]` 映射中，而不是在 `this` 上，从而将公共对象表面降至最小（仅 `_id`）。

## 分层（Layers）

**源码 / 作者层：**
- 用途：带构建宏的手动编辑源码
- 位置：`src/`
- 包含：`src/leader-line.js`、`src/anim.js`、`src/path-data-polyfill/path-data-polyfill.js`、`src/symbols.html`、`src/leader-line.scss`
- 依赖：运行时无依赖（仅浏览器全局变量）
- 使用者：Grunt 构建流水线

**构建 / 打包层：**
- 用途：解析宏、内联内置库、剥离调试代码、压缩
- 位置：`Gruntfile.js`、`gulpfile.ts`、`build/esm.ts`
- 包含：`taskHelper:getSvgDefs`、`taskHelper:packJs`、`taskHelper:packMinJs`、`taskHelper:testFuncs`、`buildESM`
- 依赖：cheerio、clean-css、uglify-js、pre-proc、rollup、`@rollup/plugin-node-resolve`、`@rollup/plugin-commonjs`、rollup-plugin-esbuild
- 使用者：`pnpm build` 脚本

**分发层：**
- 用途：分发给消费者的文件
- 位置：仓库根目录
- 包含：`leader-line.js`（IIFE 调试构建）、`leader-line.min.js`（IIFE 生产构建）、`leader-line.esm.js`（ESM 重新打包）
- 依赖：无 —— 仅浏览器全局变量
- 使用者：npm `main` / `exports`（`package.json:17-22`）、`bower.json`、`<script>` 标签

**运行时状态层：**
- 用途：每个实例的簿记
- 位置：`src/leader-line.js` 内的模块级变量
- 包含：`insProps`（`:194`）、`insAttachProps`（`:196`）、`delayedProcs`（`:191`）、每个 props 上的 `pathList`
- 依赖：无
- 使用者：每个 update 函数

**SVG DOM 层：**
- 用途：每个实例一个 `<svg class="leader-line">`，每个窗口一个共享的 `<svg id="leader-line-defs">`
- 位置：在 `bindWindow` 和 `setupWindow` 中创建（`src/leader-line.js:913-1145`）
- 包含：`linePath`、`lineShape`、`lineFace`、`plugsFaceSE`、`lineMask`、`lineOutlineMask`、`capsMaskAnchorSE`、`maskBGRect`、`capsMaskMarkerSE`
- 依赖：`options.svgContainer`（fork 新增）或 `document.body`
- 使用者：所有 `update*` 写入函数

## 数据流（Data Flow）

### 主请求路径（构造一条线）

1. `new LeaderLine(start, end, options)`（`src/leader-line.js:3387`）
2. 构造函数分配 `props`，调用 `initStats(props.curStats, STATS)` 并对 `aplStats` 做同样操作，遍历 `EFFECTS` 以初始化每个 effect 的 stats，设置默认 `show_effect='fade'`，定义 `_id`，将 `props` 存入 `insProps`（`:3396-3411`）
3. `this.setOptions(options)` → 内部 `setOptions(props, newOptions)`（`:2506`）验证每个选项，写入 `props.options`，填充 `needs = {position: true, ...}` 标志
4. 如果锚点所在窗口与之前不同，则 `bindWindow(props, newWindow)`（`:931`）重建 SVG DOM，并调用 `setupWindow`（`:913`）在缺失时注入共享的 `leader-line-defs` SVG
5. `update(props, needs)`（`:2349`）运行有序流水线；每个 `update*` 写入 `curStats`，调用 `setStat` 翻转 `aplStats`，diff 驱动 DOM 写入
6. `updatePosition`（`:1507`）解析锚点 bBox（包括通过 `getBBoxNest` / `getCommonWindow` 处理 iframe 嵌套），选取 socket 坐标，触发 `apl_position`
7. `updatePath`（`:2022`）调用 `pathList2PathData` 并写入 `props.linePath.setPathData(...)`；`updateViewBox`（`:2071`）调整 SVG `viewBox` 和容器位置，使 plugs 能够适配

### 显示 / 隐藏流程

1. `LeaderLine.prototype.show(effectName, animOptions)`（`:3562`）→ `show(props, true, ...)`（`:2409`）
2. `SHOW_EFFECTS[effectName].init(props)` 调度一个 `anim.add(...)` 任务
3. 每一帧调用 `frameCallback(value, finish)`，修改样式（例如 `props.svg.style.opacity`）
4. `stop(props, finish=true)` 调用 `svgShow(props, on)`，切换 `visibility` 并触发 `svgShow` 事件，使 attachments 重新同步

### 效果流程（示例：`dash`）

1. 用户设置 `line.dash = {len: 4, gap: 2, animation: true}` → 访问器调用 `setOptions`
2. `setOptions` 写入 `options.dash = {...}` 并标记 `needs.effect = true`
3. `update` 调用 `setEffect(props)`（`:2318`），遍历 `EFFECTS`；对新启用的 effect 调用 `EFFECTS.dash.init(props)`（`:2855`）
4. `init` 订阅 `apl_line_strokeWidth`，以便后续尺寸变化重新触发 `update`，并应用初始样式
5. 当请求动画时，`anim.add(...)` 生成一个循环任务，每帧修改 `strokeDashoffset`

### 附件流程（示例：`captionLabel`）

1. `new LeaderLine.CaptionLabel({text: 'hi'})` → `:5206-5210` 的工厂创建 `new LeaderLineAttachment(ATTACHMENTS.captionLabel, args)`
2. 附件构造函数（`:3595`）分配 `attachProps`，运行 `conf.init(attachProps, attachOptions)`
3. 当作为 label 选项使用时，`setOptions` 调用 `bindAttachment(props, attachProps, optionName)`，将其推入 `props.attachments` 和 `attachProps.boundTargets`，并把附件的 `updateColor` / `updatePath` 订阅到 `cur_line_color`、`cur_line_strokeWidth`、`apl_path` 等事件
4. `removeAttachment`（`:3576`）解绑并从 `insAttachProps` 中删除

**状态管理：**
- 实例状态：模块级 `insProps` 映射，以自增 `_id` 为键（`src/leader-line.js:194`、`:3409-3411`）
- 附件状态：并行的 `insAttachProps` 映射（`:196`）
- 每个实例的 `props` 结构：`{options, optionIsAttach, curStats, aplStats, attachments, events, reflowTargets, ...}`（`:3388-3394`）
- Stat 生命周期：`initStats`（声明）→ `setStat`（应用 + 触发事件）→ `addEventHandler` 订阅者作出反应（`:711-725`）

## 关键抽象（Key Abstractions）

**`props` / `attachProps`：**
- 用途：贯穿每个内部函数的每实例状态袋
- 示例：`src/leader-line.js:3388`（`LeaderLine`）、`:3596`（`LeaderLineAttachment`）
- 模式：普通对象，绝不是类实例；对模块闭包私有，通过原型方法中的 `insProps[this._id]` 访问

**`STATS` / `SHOW_STATS` / 每个 effect 的 `stats`：**
- 用途：每个被追踪视觉状态的声明式 schema；标志位如 `hasSE: true`（start/end 对）、`hasProps: true`（多字段）、`iniValue`（初始值）
- 示例：`src/leader-line.js:153-186`
- 模式：Schema 驱动 —— `initStats` 遍历 schema 并初始化 `curStats` 和 `aplStats`；`setStat` 负责 diff 并触发名为 `apl_<key>` / `cur_<key>` 的事件

**`EFFECTS` 条目：**
- 用途：全局线条视觉效果插件
- 示例：`src/leader-line.js:2845-3146`
- 模式：对象字面量，包含 `stats`、`optionsConf`（驱动 `:3484` 处自动生成的访问器）、可选 `anim: true` + `defaultAnimOptions`，以及生命周期方法 `init(props)`、`remove(props)`、`update(props)`

**`SHOW_EFFECTS` 条目：**
- 用途：显示/隐藏过渡插件
- 示例：`src/leader-line.js:3167-3380`
- 模式：`defaultAnimOptions`、`init(props, timeRatio)`、`start(props, timeRatio)`、`stop(props, finish, on)`，返回最终 opacity 比例

**`ATTACHMENTS` 条目：**
- 用途：绑定到 `LeaderLine`（或另一个 attachment）的辅助 DOM/SVG 原语
- 示例：`src/leader-line.js:3684-5210`
- 模式：对象字面量，包含 `type`（`'anchor'` 或 `'label'`）、`argOptions` schema、`init(attachProps, attachOptions)`、`removeOption`、`remove`、可选 `bind` / `unbind`、可选几何辅助函数（`getBBoxNest`、`updatePath`、`updateColor`、`updateShow`）

**Plug symbol：**
- 用途：可复用的 SVG `<symbol>` 定义，用于箭头头 / 端帽
- 示例：`src/symbols.html`（手写）、`src/symbols.json`（构建产物），通过 `SYMBOLS` / `PLUG_KEY_2_ID` / `PLUG_2_SYMBOL` 这些构建期常量引用
- 模式：HTML 声明式编写 → 构建时 cheerio 解析 → 每个窗口内联注入 `<defs>`

## 入口（Entry Points）

**库（运行时）：**
- 位置：`src/leader-line.js`（源码）、`leader-line.js` / `leader-line.min.js`（IIFE dist 产物）、`leader-line.esm.js`（ESM dist 产物）
- 触发方式：`<script src="leader-line.min.js">`（定义 `window.LeaderLine`）或 `import LeaderLine from 'leader-line'`
- 职责：导出 `LeaderLine` 构造函数及其静态 attachment 工厂

**构建（Grunt —— IIFE）：**
- 位置：`Gruntfile.js`
- 触发方式：`pnpm dev`、`pnpm build:iife`
- 职责：`defs`（symbols → `src/defs.js`）→ `packJs`（宏替换 → `leader-line.js`）→ `packMinJs`（uglify → `leader-line.min.js`）；还包括 `funcs`（将 `@EXPORT[file:X]@` 块提取为测试夹具）

**构建（gulp —— ESM）：**
- 位置：`gulpfile.ts`、`build/esm.ts`
- 触发方式：`pnpm build:esm`（运行 `gulp --require @esbuild-kit/cjs-loader -f gulpfile.ts`）
- 职责：读取先前构建的 `./leader-line.js` IIFE，使用 `nodeResolve` + `commonjs` + `esbuild` 运行 Rollup，输出 `./leader-line.esm.js`，配置为 `format: 'esm'`、`exports: 'named'`、`treeshake: true`

**测试（浏览器测试框架）：**
- 位置：`test/httpd.js`、`test/index.html`
- 触发方式：`node test/httpd.js`，然后打开 `http://localhost:8080/`
- 职责：`node-static-alias` 服务器挂载 `jasmine-core`、`test-page-loader`、`anim-event`、`plain-draggable` 以及仓库的 `/src`；`test/index.html` 加载 `spec/*.js` 和辅助子页面

## 架构约束（Architectural Constraints）

- **单一全局闭包：** 所有内部辅助函数都位于 `src/leader-line.js` 的一个 IIFE 内；除了 `LeaderLine` 本身之外没有其他导出。新增内部辅助函数必须加在同一个 IIFE 内。
- **生产构建必须进行宏预处理：** 源码包含必须由 Grunt 替换的 `@INCLUDE[code:X]@` 标记；若不在调试工具（`window.DEFS_HTML`、`window.SYMBOLS`、`window.anim` 等）支持下直接在浏览器中运行原始源码，将会抛出异常。`[DEBUG]` / `[DEBUG/]` 标记成对出现，因此 `pre-proc.removeTag('DEBUG', ...)` 会保留生产分支。
- **顺序更新流水线：** `update`（`src/leader-line.js:2349`）的顺序是硬编码的（line → plug → lineOutline → plugOutline → faces → position → path → viewBox → mask）。副作用依赖此顺序 —— 例如 `updatePlugOutline` 只有在 `updatePlug` 运行后才会读取 `outlineMax`。重排会破坏渲染。
- **每个实例一个 `<svg>`，每个窗口共享 defs：** 每个 `LeaderLine` 创建自己的 `<svg>` 根，但 `<symbol>` 库（`leader-line-defs`）对每个窗口是全局的，且只注入一次。`bindWindow`（`:934`）通过 `leader-line-<id>` 前缀避免跨实例 symbol id 冲突。
- **窗口级状态：** `props.baseWindow`、`props.bodyOffset` 以及 `<iframe>` 链逻辑（`getFrames`、`getCommonWindow`）假设两个锚点共享同一个公共祖先窗口。跨窗口的线条通过 `bindWindow` 重新绑定。
- **全局状态（模块级）：**
  - `insProps`、`insId` —— 实例注册表（`src/leader-line.js:194`）
  - `insAttachProps`、`insAttachId` —— 附件注册表（`:196`）
  - `delayedProcs`、`timerDelayedProc` —— 延迟布局工作（`:191`）
  - `svg2SupportedReverse`、`svg2SupportedPaintOrder`、`svg2SupportedDropShadow` —— 延迟特性检测缓存（`:197`）
  - `LeaderLine.positionByWindowResize` 静态标志（`:5213`）以及所有实例共享的单个 `window.addEventListener('resize', ...)`（`:5214`）
- **无循环导入：** 单文件模块；除了最后的 `export default LeaderLine` shim 外没有导入。内置库在构建时通过 `Gruntfile.js:21-25` 的 `PACK_LIBS` 内联。
- **浏览器全局耦合：** 大量使用 `window.*`、`document.*`、`SVG*Element` 常量。无法进行服务端渲染。`IS_EDGE` / `IS_TRIDENT` / `IS_GECKO` / `IS_BLINK` / `IS_WEBKIT` 特性标志（`:99-107`）贯穿整个代码库分支行为。

## 反模式（Anti-Patterns）

### 修改传入 `setOptions` 的 `options` 对象

**现象：** `setOptions` 原地写入 `props.options` 并与之前的值做比较（`src/leader-line.js:2528-2615`）。

**问题所在：** 如果调用者在多次调用中复用同一个 `newOptions` 引用，diff 看到 `value === curOption.container[curOption.key]`，就不会触发更新。

**正确做法：** 始终传入新字面量：`line.setOptions({color: 'red'})` —— 或使用单属性 setter `line.color = 'red'`，它内部会构建一个新对象（`:3428-3434`）。

### 直接访问 `insProps` / `window.*` 调试句柄

**现象：** 许多辅助函数和注册表仅在 `[DEBUG]` 区域内以 `window.<name>` 暴露（例如 `window.insProps`、`window.EFFECTS`、`window.SHOW_EFFECTS`、`window.ATTACHMENTS`、`window.LeaderLineAttachment`、`window.bindWindow`）。它们的存在是为了支持测试框架，并会在生产构建中被剥离。

**问题所在：** 在生产打包时，`pre-proc.removeTag('DEBUG', ...)` 会移除 `[DEBUG]` 块，应用代码若依赖它们就会失效。

**正确做法：** 使用公共 `LeaderLine` API 和静态工厂（`LeaderLine.pointAnchor`、`LeaderLine.areaAnchor` 等）。测试时加载 dev 构建（`pnpm dev` 输出），它会保留 `window.*` 句柄。

### 新增 effect / attachment 时不遵循注册表契约

**现象：** `EFFECTS` 条目必须声明 `stats`、`optionsConf`、`init`、`remove`；`ATTACHMENTS` 条目必须声明 `type`、`argOptions`、`init`。缺少字段会导致构造函数（`:3398`）和访问器生成器（`:3484`）中的 `Object.keys(...).forEach` 遍历抛出异常或静默跳过。

**问题所在：** 半注册的插件会让 `curStats` / `aplStats` 不同步，导致静默的渲染失败。

**正确做法：** 复制已有条目作为模板 —— 线条效果参考 `EFFECTS.dash`（`:2846`），过渡效果参考 `SHOW_EFFECTS.fade`（`:3207`），anchor 参考 `ATTACHMENTS.pointAnchor`（`:3685`），label 参考 `ATTACHMENTS.captionLabel`（`:4429`）。

### 绕过 `setStat` 直接写 DOM

**现象：** `update*` 函数内的所有 DOM 写入都通过 `setStat(props, aplStats, key, value)` 完成，它会触发 `apl_*` 事件（`src/leader-line.js:868`）。

**问题所在：** 直接写 DOM 会让 `curStats` 与 `aplStats` 不同步，下一次 `update` 会认为没有变化并跳过写入 —— 视觉状态与选项状态偏离。

**正确做法：** 始终通过 `setStat` 写入；使用 `addEventHandler(props, 'apl_<key>', handler)` 订阅变化（例如 `EFFECTS.dash` 在 `:2857` 订阅 `apl_line_strokeWidth`）。

## 错误处理（Error Handling）

**策略：** 对编程错误（无效选项值、缺失锚点）抛出异常；对环境问题（缺失 `getBBox`、隐藏元素）静默无操作。

**模式：**
- 对无效构造函数输入使用 `throw new Error(...)` —— `setOptions` 要求两个锚点必须不同（`src/leader-line.js:2614`），`bindAttachment` 失败会抛出 `Can't bind attachment`（`:2606`），附件构造函数在 `element` 不合法时抛出异常（`:3737`）
- 对可恢复的内部不一致输出控制台错误 —— 例如 `console.error('LeaderLineAttachment was not unbound by remove')`（`:5196`）
- 当目标不可渲染时，几何辅助函数（`getBBox`、`getBBoxNest`）静默返回 `null`；调用者用 `if (!bBox) { ... return; }` 保护
- 没有基于 Promise 的异步 —— 帧循环由回调驱动；`anim` 帧回调内的错误会传播到 `window.onerror`

## 横切关注点（Cross-Cutting Concerns）

**日志：** 几乎所有内部函数都被 `traceLog.add('<tag>')` / `traceLog.add('</tag>')` 调用包裹。`traceLog` 由测试框架中的 `test/traceLog.js` 提供；生产环境中，`// [DEBUG/]` 标记会让这些调用被 `pre-proc` 剥离。测试通过 `test/util.js` 中的自定义匹配器（`toContainAll`、`toNotContainAny`）断言 `traceLog.log`。

**验证：** 在 `setOptions` 中通过 `setValidId`（键到 id 的映射）和 `setValidType`（typeof / number 检查以及可选 `check(value)` 谓词）内联完成，位置为 `src/leader-line.js:2550-2590`。`optionsConf` 中的每个条目可以提供自己的 `check` 函数（例如 `EFFECTS.dash.optionsConf` 的 `value > 0`）。

**认证：** 未识别到 —— 纯客户端库，没有网络调用。

**动画：** 集中在 `src/anim.js`；消费者注册 `frameCallback`，每帧接收 `(value, finish, timeRatio, outputRatio)`。Effects 通过 `FUNC_KEYS` 或 `[x1, y1, x2, y2]` 字面量传入 cubic-bezier 数组作为计时函数。

**浏览器特定分支：** `IS_EDGE`、`IS_TRIDENT`、`IS_GECKO`、`IS_BLINK`、`IS_WEBKIT` 标志（`src/leader-line.js:99-107`）控制诸如强制重排（`:743-756` 的 `forceReflowAdd` / `forceReflowApply`）、`SHAPE_GAP` 的 epsilon（`:109`）以及针对 WebKit 的 `style.fill` 内联 workaround（`:997-1000`）等行为。

---

*架构分析：2026-07-18*

最后映射：2026-07-18
