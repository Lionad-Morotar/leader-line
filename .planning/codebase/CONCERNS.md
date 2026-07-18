# 代码库问题（Codebase Concerns）

**分析日期：** 2026-07-18

本文档梳理 `leader-line` fork 中的技术债（Tech Debt）、已知 Bug、安全/性能风险和可维护性陷阱。每个部分按严重程度（Severity）排序。

## 技术债（Tech Debt）

### P0 —— 分发产物在加载时损坏

- 问题：`src/leader-line.js:16` 声明了 `const isDev = process.env.NODE_ENV === 'development';`（与 ESM 构建一起在提交 `78ad6de` 中加入）。`isDev` 在整个代码库中从未被读取，但该标识符仍会交付给消费者。
  - `leader-line.js:17` —— 未压缩的“IIFE”构建原样保留该行。
  - `leader-line.min.js:2` —— uglify-js 将死绑定缩减为无副作用语句 `process.env.NODE_ENV;`，但仍会对未定义的全局变量执行属性访问。
- 已验证的失败模式：仅 `delete process.env.NODE_ENV` 不够；`global.process = undefined`（实际的浏览器场景）会让两个文件在求值时立即抛出 `TypeError: Cannot read properties of undefined (reading 'env')`。
- 影响：任何通过普通 `<script>` 标签、不带 `process` polyfill 的 import（例如未配置 `define` 的 Vite、未配置 `replace` 的 Rollup、未配置 `define` 的 esbuild、未配置 `ProvidePlugin` 的 Webpack 5+）或非 Node SSR 运行时加载 `leader-line.js` 或 `leader-line.min.js` 的消费者都会在模块求值时崩溃。只有 `leader-line.esm.js` 是安全的，因为 `build/esm.ts:21-24` 注入 `define: { 'process.env.NODE_ENV': '"production"' }`，esbuild 会完全剥离死绑定。
- 修复方法：删除 `src/leader-line.js:16`（它是死代码（Dead Code））。或者，将其包裹在现有的 `[DEBUG]/[/DEBUG]` 预处理标记中，让 `Gruntfile.js:175,200` 的 `preProc.removeTag('DEBUG', ...)` 从 dist 构建中剥离。添加一个冒烟测试（Smoke Test），在无 `process` 全局的 VM 上下文中求值 `leader-line.min.js` 以防止回归（Regression）。

### P0 —— IIFE 产物中出现了 `export default`

- 问题：`src/leader-line.js:5238` 以 `export default LeaderLine;` 结尾（同样是在 `78ad6de` 中加入，用于 feeding Rollup ESM 构建）。Grunt IIFE 流水线（`Gruntfile.js:165-214` 的 `packJs`/`packMinJs`）没有剥离它，因此 `leader-line.js:6290` 和 `leader-line.min.js`（末尾字节）都包含顶层 `export` 语句。
- 影响：
  - 普通 `<script src="leader-line.min.js">` 在浏览器中抛出 `SyntaxError: Unexpected token 'export'`。
  - 该文件尽管名称和 banner 如此，实际上并不是 IIFE/UMD bundle；它需要一个支持 ESM 的加载器。
  - Node 22 会自动将其重新解析为 ESM（伴随 `MODULE_TYPELESS_PACKAGE_JSON` 警告），这就是 `pnpm build:iife` 的消费者可能没注意到的原因；旧版 Node、Jest 默认 CJS 模式以及若干 bundler CJS 互操作路径会失败。
  - `package.json:21` 设置 `"exports"."require": "./leader-line.min.js"`，因此任何严格 CJS 流水线中调用 `require('leader-line')` 的人都会失败。
- 修复方法：让 `packJs`/`packMinJs` 在输出 IIFE 文件时剥离尾部的 `export default …;` 行（例如在 `Gruntfile.js:165,190` 的 `handlerByContent` 中使用正则），或者输出一个真正的 UMD wrapper 将值赋给 `window.LeaderLine`。只在 `build/esm.ts` 的输出中保留 `export default`。添加一个 Node 冒烟测试执行 `require('./leader-line.min.js')` 并断言不抛出 `SyntaxError`。

### P0 —— Banner 版本与 `package.json` 不同步

- 问题：`leader-line.js:1` 和 `leader-line.min.js:1` 都带有 banner `/*! LeaderLine v1.0.9 … */`，而 `package.json:3` 是 `"version": "1.1.0"`，`bower.json:3` 是 `"version": "1.0.7"`。
- 影响：dist 文件是在 `1.1.0` 版本 bump 之前构建的（提交 `f02ca4f` 只是 `1.1.0`，没有重建）。消费者无法可靠地通过指纹判断自己使用的是哪个构建；针对“1.1.0”的 bug 报告实际上可能是 1.0.9 代码。
- 修复方法：版本 bump 后总是运行 `pnpm build`（在 `package.json:52` 添加 `prepublishOnly` 脚本执行 `pnpm build`）。考虑在构建时从 `package.json` 获取版本号写入 banner，而不是在 banner 中硬编码。

### P1 —— `npm publish` 会漏掉 ESM 入口

- 问题：`package.json:24-27` 声明 `"files": ["leader-line.min.js", "bower.json"]`，但 `main` 和 `exports.import` 指向 `./leader-line.esm.js`。因此 `leader-line.esm.js` 会被排除在发布的 tarball 之外。
- 影响：`npm publish` 会发布一个声明的入口点（`main`、`exports.import`）不存在的包。任何 ESM 消费者（`import LeaderLine from 'leader-line'`）都会得到 `ERR_MODULE_NOT_FOUND`。
- 修复方法：在 `package.json:24-27` 的 `files` 数组中添加 `"leader-line.esm.js"` 以及（为对称起见）`"leader-line.js"`。也可以考虑移除 `bower.json` —— Bower 自 2017 年起已被弃用。

### P1 —— Bower 元数据被遗弃

- 问题：`bower.json:3` 仍显示 `"version": "1.0.7"`（落后 `package.json:3` 的 `1.1.0` 三个版本），`bower.json:16` 将 `main` 指向 `leader-line.min.js`（本身带有上述 P0 bug）。该 registry 本身已弃用且只读。
- 影响：任何仍通过 Bower 解析的人都会得到陈旧、损坏的产物。
- 修复方法：要么删除 `bower.json`（推荐；Bower 已 EOL），要么添加在发布时从 `package.json` 同步 bump 其版本的构建步骤。

### P1 —— 混合构建链、两个 lockfile、没有单一事实来源

- 问题：仓库同时存在 `package-lock.json`（45 KB）和 `pnpm-lock.yaml`（136 KB）。实际安装使用 pnpm（devDeps 通过 `node_modules/.pnpm/…` 软链），但陈旧的 `package-lock.json` 仍被提交。`package.json:52-58` 中的脚本串联 `grunt`（IIFE）→ `gulp`（ESM，对 grunt 产出的 dist 文件重新打包），`cross-env NODE_ENV=production` 在两者之间的使用不一致。
- 影响：
  - 运行 `npm install` 的贡献者会得到可能与 pnpm 分歧的依赖树（两个 lockfile 未保持同步 —— `package-lock.json` 上次被修改是在 2024 年，伴随 `4480070 Update dependencies (for package-lock.json)`）。
  - gulp ESM 构建以 `./leader-line.js` 作为输入（参见 `build/esm.ts:36`），因此 ESM bundle 继承 Grunt 构建产出的任何东西 —— 包括上面的 `export default` 等 IIFE 怪癖。没有独立路径。
- 修复方法：删除 `package-lock.json`，在 `Agents.md`/`README.md` 中记录仅支持 pnpm 作为包管理器，并统一为单一构建工具（Rollup 可同时从同一源码输出 IIFE 和 ESM）。

### P2 —— Lint 配置指向仓库外部

- 问题：
  - `.eslintrc.json:3` 扩展 `../../_common/files/eslintrc.json`。
  - `.stylelintrc:2` 扩展 `../../_common/files/stylelintrc.json`。
- 影响：新 clone 无法运行 `eslint` 或 `stylelint` —— 被扩展的文件不在本仓库内，因此两个工具都会报错“Failed to load config”。编辑器集成（VS Code ESLint 扩展）会静默禁用。
- 修复方法：将共享配置内联到仓库中（或依赖已发布的 shared-config 包），然后提交解析后的文件。如果 `../../_common/` 目录属于维护者私有 monorepo 的一部分，请在 `Agents.md` 中记录该要求。

### P2 —— 调试产物被提交到 src

- 问题：`Gruntfile.js:140` 在每次 `defs` 构建时写入调试转储 `fs.writeFileSync(`${SRC_DIR_PATH}/symbols.json`, JSON.stringify(codeSrc.SYMBOLS))`。生成的 `src/symbols.json` 被提交（1.5 KB），但构建从不读取它 —— 它纯粹是信息性的。
- 影响：每次构建都会弄脏工作树；如果贡献者忘记提交，该文件会与 `src/symbols.html` 不同步。
- 修复方法：要么将 `src/symbols.json` 加入 gitignore 并停止提交，要么将转储移到 `dist/` 或 `.cache/` 目录。

### P2 —— 运行时中遍布死代码的旧版浏览器分支

- 问题：`src/leader-line.js` 中有 21 处引用 `IS_TRIDENT`、`IS_EDGE`、`document.uniqueID`、`window.navigator.msPointerEnabled`（引擎探测（Engine Detection）在 `:99-109`、`SHAPE_GAP` 在 `:109`，加上强制重排（Force Reflow）分支在 `:803,1331,1335,1362,1374,1420,1471,2046,3222,4275`）。Trident（IE11）和旧版 Edge 已寿终正寝；支持的浏览器无法命中这些分支。
- 影响：约 5% 的 bundle 是不可达代码，仍会消耗解析时间并误导读者。`:738-746` 的 `forceReflow()` 使用 `setTimeout(0)` 加 DOM insert/remove 来 workaround 已不存在的浏览器。
- 修复方法：一次性删除 IS_TRIDENT/IS_EDGE 分支；保留 `IS_GECKO`、`IS_BLINK`、`IS_WEBKIT`。这是一次安全的机械重构，在支持的引擎上不会产生可观察行为变化。

### P2 —— Fork 专属变通方案泄漏到运行时

- 问题：`src/leader-line.js:411-414` 在检测到 `window.__MICRO_APP_NAME__` 时短路 `getFrames()`：
  ```
  // 兼容 micro-zoe/micro-app
  if (window.__MICRO_APP_NAME__) {
    return []
  }
  ```
- 影响：这个针对 `@micro-zoe/micro-app` 的“修复”（见 `README.md:15`）会在宿主页面嵌入 micro-app 的任何地方静默禁用 iframe 遍历 —— 包括微前端内部合法的 iframe 用例。注释在英文代码库中是中文，没有测试，检查依赖的是库并不拥有的全局变量。
- 修复方法：用显式选项（例如 `options.skipFrameTraversal`）替换全局嗅探，或将变通方案限定到实际失败模式（micro-app 沙盒 `Proxy` window 中的 `getFrame error`）。添加单元测试覆盖两个分支。

### P2 —— README 自我警告性能但未提供指导

- 问题：`README.md:23` 用中文声明：“在稍微复杂的绘图中，LeaderLine 有着糟糕的性能，此时你应该选择 antd 或类似的（reactflow、vueflow、litegraph 等）专业绘图库”。
- 影响：该库没有基准套件、没有文档化的线条数量阈值、没有自动化性能回归测试。用户只有在生产环境中才能发现上限。
- 修复方法：量化“稍微复杂”（线条数量 × 更新频率），添加一个带可测量场景的 `test/perf/` 页面，并将该建议同时用英文记录。

## 已知 Bug（Known Bugs）

### `LeaderLineAttachment was not unbound by remove` 控制台噪音

- 症状：五个调用点记录此错误 —— `src/leader-line.js:3644,3890,4400,4789,5196` —— 当附件在仍被绑定时被移除。代码随后通过手动调用 `ATTACHMENTS.*.unbind` 恢复，因此面向用户的影响只是一个吓人的 `console.error`。
- 文件：`src/leader-line.js:3644,3890,4400,4789,5196`
- 触发：以编程方式移除带有 `startLabel`/`endLabel`/`middleLabel` 附件的 LeaderLine，且未先移除标签。
- 变通方案（Workaround）：调用者可以在 `line.remove()` 之前通过 `line.removeOption('startLabel')` 等方式 detached 标签。错误路径是防御性的，非致命。

### `getBBox()` BLINK bug 变通方案仍留在代码中

- 症状：`src/leader-line.js` 包含 `forceReflowAdd/forceReflowApply/forceReflow`（第 738-755 行）以及若干 `forceReflowAdd(props, …)` 调用点，用于 workaround Chrome 中基于 `offsetWidth` 的重排不更新 SVG 度量的问题。提交 `40157b6 Fix: BLINK bug getBBox()` 是最近的此类创可贴。
- 文件：`src/leader-line.js:738-755,803,1422,3222`
- 触发：Chrome 中动态 DOM 变更后的特定 SVG `getBBox()` 调用。
- 变通方案：`forceReflow` 函数（第 738-745 行）通过 `setTimeout(0)` 内的 `removeChild` + `insertBefore` 工作。这是沉重的 DOM 搅动；大量 leader-line 会成倍增加开销。

### 不支持的颜色语法静默穿透

- 症状：`src/leader-line.js:264` 注释“Unsupported: `currentcolor`, `color()`, `deprecated-system-color`”。`:248-296` 的 `getAlpha()` 只处理 `rgba|hsla|hwb|gray|device-cmyk` 函数和 `#rrggbb[aa]|#rgb[a]` 十六进制。任何其他 CSS 颜色（例如 `color(display-p3 …)`、`lab()`、`oklch()`、`lch()`、CSS 变量、`currentcolor`）返回 `[1, <original string>]`，静默将线条视为完全不透明。
- 文件：`src/leader-line.js:248-296`
- 触发：`new LeaderLine(a, b, { color: 'oklch(0.7 0.1 30)' })` 或来自不支持列表的任何颜色。
- 变通方案：坚持使用 rgb(a)/hsl(a)/十六进制；传入前将较新的 CSS 颜色函数转换为 `rgba()`。

## 安全考量（Security Considerations）

### 通过 path-data-polyfill 修改原型

- 风险：`src/path-data-polyfill/path-data-polyfill.js:26` 在缺少这些方法时全局修补 `window.SVGPathElement.prototype.{getPathData,setPathData,setAttribute,removeAttribute}`。被修补的 `setAttribute`/`removeAttribute` 包装原始方法（`:361-362,935`）并拦截宿主页面中**每一个** SVG path 的 `d` 属性写入，不仅仅是 leader-line 自己的。
- 文件：`src/path-data-polyfill/path-data-polyfill.js:26-935`
- 当前缓解：`src/leader-line.js:915-921` 中的 `if (!baseDocument.getElementById(DEFS_ID))` 门控安装点，因此每个文档只运行一次。
- 建议：接受全局修补作为文档化行为（该 polyfill 被广泛使用），但在 `README.md` 中明确说明。运行其他 SVG 库的消费者应验证没有冲突。

### 通过 `DOMParser` 和 `innerHTML` 等价物注入 HTML/SVG

- 风险：`src/leader-line.js:916` 通过 `(new window.DOMParser()).parseFromString(DEFS_HTML, 'image/svg+xml')` 解析构建时生成的 `DEFS_HTML` 常量。`DEFS_HTML` 在 `Gruntfile.js:127-135` 中由 `src/symbols.html` 和 `src/leader-line.css` 构造，然后内联为单引号 JS 字符串，仅对 `'` 转义（`.replace(/\'/g, '\\\'')`）。
- 文件：`Gruntfile.js:127-135`、`src/leader-line.js:916`
- 当前缓解：输入是构建时常量，非用户可控 —— 运行时没有注入向量。
- 建议：无需更改。如果 `symbols.html` 未来接受外部输入（例如用户自定义 plug SVG），请小心；当前单引号转义是防止 JS 字符串突破的唯一措施。

### 旧版引擎探测读取已弃用全局变量

- 风险：`src/leader-line.js:99-109` 的引擎探测（Engine Detection）触及 `document.uniqueID`、`window.navigator.msPointerEnabled`、`window.chrome`、`'WebkitAppearance' in document.documentElement.style`。这些本身不是安全 bug，但会误识别未来引擎（`:101` 的注释甚至说“Future Edge might support `document.uniqueID`”，`:103` 说“future Gecko might have `window.chrome`”）。
- 文件：`src/leader-line.js:99-109`
- 当前缓解：无 —— TODO 风格注释承认了脆弱性。
- 建议：用特性检测（例如检查每个分支实际使用的 API）替换 UA/引擎启发式。

### `test/httpd.js` 提供仓库外的任意文件

- 风险：`test/httpd.js:40-46` 注册别名 `match: /^\/src/, serve: '..%3C%20reqPath%20%3E', allowOutside: true`，`:32-39` 为 `jasmine-core`、`test-page-loader`、`anim-event`、`plain-draggable` 注册别名且 `allowOutside: true`。静态文件服务器绑定 8080 端口且无认证。
- 文件：`test/httpd.js:28-67`
- 当前缓解：仅开发使用；无生产暴露。
- 建议：显式绑定到 `127.0.0.1`（`http.createServer(...).listen(PORT, '127.0.0.1')`）并记录该服务器仅用于本地开发。不要暴露在 LAN 上。

## 性能瓶颈（Performance Bottlenecks）

### 每次更新通过 DOM remove/insert 强制重排

- 问题：`src/leader-line.js:738-745` 的 `forceReflow()` 在 `setTimeout(0)` 内运行 `parent.insertBefore(parent.removeChild(target), next)`。每次调用都会让整个 SVG 子树失效布局。
- 文件：`src/leader-line.js:738-755,803,1422,2046,3222`
- 原因：用于 workaround  ancient BLINK/TRIDENT `getBBox()` bug；现在对任何 `IS_BLINK || IS_WEBKIT || IS_TRIDENT` 引擎、透明颜色都会触发 (`:1420-1422`)。
- 改进路径：将该 workaround 门控在实际检测到有 bug 行为的启动特性测试后，而不是在每个合规浏览器上运行。现代 Chrome 不再表现该 bug —— 对当前引擎应完全移除该检查。

### `positionByWindowResize` 每次 resize 更新每条线

- 问题：`src/leader-line.js:5213-5233` 通过 `AnimEvent.add` 注册单个 `window.resize` 监听器，每次 resize 事件都循环 `Object.keys(insProps).forEach(id => update(insProps[id], {position: true}))`。
- 文件：`src/leader-line.js:5213-5233`
- 原因：没有脏检查、没有逐行可见性测试、没有 `IntersectionObserver` —— 每条线都被重定位，无论它或其锚点是否移动。
- 改进路径：`:5221-5227` 的注释代码显示作者已考虑过按 `props.baseWindow === eventWindow` 过滤。实现逐实例簿记（锚点引用、上次已知 bbox），跳过锚点未变化的线；或切换到对锚点元素使用 `ResizeObserver`。

### 长持续时间动画帧生成是二次的

- 问题：`src/anim.js:175-200` 通过以 `MSPF / duration / 10` 步进 `t` 构建 `frames` 数组 —— 对于 10 秒动画和 cubic-bezier 定时，这在任务创建时预计算约 6000 帧，每一帧都有自己的 cubic-bezier 求解。
- 文件：`src/anim.js:154-211`
- 原因：帧是预烘焙的，而不是在每次 tick 时惰性计算。
- 改进路径：在 `frameCallback` 内直接使用 cubic-bezier 按需计算值。预烘焙只节省廉价的 valueCallback 调用；前期成本（以及 `frames` 数组带来的 GC 压力）占主导。

### `getBBoxNest` 每次位置更新都遍历 iframe 链

- 问题：`src/leader-line.js:442-463` 在每次 `getBBoxNest()` 调用时遍历 iframe 祖先链，每帧调用 `getBBox()` 和 `getContentOffset()`。对于锚点位于多层 iframe 内的线，这会成倍增加每次更新成本。
- 文件：`src/leader-line.js:410-463`
- 原因：帧偏移在更新之间没有缓存。
- 改进路径：按 `props.baseWindow` 缓存 frames 数组（仅在相关 frame 的 resize/scroll 时失效）。锚点在顶层文档的线已通过 `:446-448` 的 `if (!frames.length) { return getBBox(element); }` 短路。

### 自我承认的扩展限制

- 问题：`README.md:23`（仅中文）承认“在稍微复杂的绘图中 LeaderLine 性能糟糕”，并推荐 reactflow/vueflow/litegraph 等替代方案。没有给出定量阈值。
- 文件：`README.md:23`
- 原因：每次更新都是逐行 DOM（SVG）变更 + 手动布局；没有虚拟化、没有 canvas 后端。
- 改进路径：就 fork 的维护范围而言，在 `README.md` 中用英文记录一个“合理”上限（例如同时更新的线 <50 条）。超出该范围应重定向到已列出的替代方案。

## 脆弱区域（Fragile Areas）

### `setOptions()` —— 长、副作用重、难以安全扩展

- 文件：`src/leader-line.js:2506-3536`
- 脆弱原因：单个约 1000 行的函数处理约 20 种选项类型，使用三种不同的校验辅助函数（`setValidId`、`setValidType`、以及 `:2649-2677` 对 `socketGravitySE` 的内联数组处理）。函数使用五种不同的 "needs" 标志（`needsWindow`、`needs.line`、`needs.plug`、`needs.lineOutline`、`needs.plugOutline`、`needs.position`、`needs.faces`、`needs.effect`），它们以非明显方式交互。fork 添加的 `svgContainer` 选项处理程序在 `:2617-2626`，没有测试覆盖率（Test Coverage）。
- 安全修改方式：将 `setOptions` 视为分发器 —— 通过添加新分支来扩展，而不是重构。在触及逻辑之前，将新选项加入 `:111-123` 的 `DEFAULT_OPTIONS`、`:2508-2527` 的注释表，并在 `test/spec/options.js` 中添加单元测试。
- 测试覆盖：`test/spec/options.js` 覆盖 `setValidId`、`setValidType`、`anchorSE`、`socketGravitySE` 和 “needs” 传播。fork 添加的 `svgContainer` 分支（`:2617-2626`）**零**测试覆盖。

### `bindWindow()` —— DOM 重、引擎相关路径

- 文件：`src/leader-line.js:931-1144`
- 脆弱原因：使用旧版 `SVGAnimatedLength`/`SVGUnitTypes` API 构建整个 SVG 场景图（`<mask>`、`<marker>`、`<use>`、`<path>`）（例如 `:940-944,948-955,957-961`）。`:951-953` 的 Firefox 专用 `viewBox` 变通方案（"for Firefox bug"）、`:997-1000` 的 WebKit 专用样式 hack（"[WEBKIT] style in `use` is not updated"）。任何符号结构的变更都必须在 `src/symbols.html` 中镜像，并通过 `pnpm build:iife` 重建以刷新 `src/defs.js`。
- 安全修改方式：运行 `pnpm build` 并至少在 Chrome 和 Firefox 中目视验证 `test/mask/index.html` 和 `test/attachment-label/index.html`。
- 测试覆盖：`test/mask/`、`test/attachment-label/`、`test/effect-show/` 是交互式演示，不是自动化断言。

### 引擎探测 + 变通方案与逻辑交织

- 文件：`src/leader-line.js:99-109`（探测）、`:803,1331,1335,1362,1374,1420,1422,1471,2046,3222,4275`（分支）
- 脆弱原因：15 个以上引擎条件分支散落在更新流水线中。删除 `IS_TRIDENT` 分支是机械的；但要推断当前引擎代是否仍需要 `IS_BLINK || IS_WEBKIT` 的 forceReflow，需要手动浏览器测试。
- 安全修改方式：一次只改一个引擎分支；在每个受影响引擎中运行演示页面；永远不要把两个引擎分支清理打包进同一个提交。
- 测试覆盖：无 —— 仓库中没有无头浏览器（Headless Browser）测试。

### `aplStats` / `curStats` 影子状态

- 文件：`src/leader-line.js:152-186`（STATS/SHOW_STATS 定义）、`:868-879`（`setStat`）、`:1541`（copyTree 反向同步）、`:1630-1698`（diff 使用）
- 脆弱原因：每个实例有两个并行状态对象。每个状态必须在 `:152-186` 用正确的 `hasSE`/`hasProps`/`iniValue` 标志初始化。忘记 `iniValue`（例如提交 `903cf6c` 修复的 `position_plugOverheadSE` bug）会导致下游 `undefined` 比较。fork 的提交 `903cf6c fix: aplStats.position_plugOverheadSE is not defined` 就是此脆弱性的直接例子。
- 安全修改方式：添加状态时，即使 `iniValue` 是 `false` 或 `null`，也要在 STATS/SHOW_STATS 中显式声明。通过运行 `test/spec/stats.js` 验证。
- 测试覆盖：`test/spec/stats.js` 演练状态流水线。

### DEBUG / 非 DEBUG 二元性

- 文件：`src/leader-line.js:72-85,138-149,199-215,231,241,297,344,354,389,464,493,499,509,520,526,560,586,599,608,628,647,687,697,728,731,746,855` 以及全代码库约 200 多个 `// [DEBUG/]` 单行标记；`Gruntfile.js:175,200` 剥离它们。
- 脆弱原因：源码在 `// [DEBUG]` 和 `// [/DEBUG]` 标记之间读取 `window.anim`、`window.pathDataPolyfill`、`window.AnimEvent`、`window.DEFS_HTML`、`window.SYMBOLS`、`window.PLUG_KEY_2_ID`、`window.PLUG_2_SYMBOL`、`window.DEFAULT_END_PLUG`（第 `:79-85,141-149` 行）。在生产构建中，这些内容来自 `@INCLUDE[code:…]@` 替换（`:73-77,139,143,147`）。`@INCLUDE` 键与 `Gruntfile.js:21-25` 中 `PACK_LIBS` 表之间的任何不匹配都会产生一个仅在运行时失败的损坏 dist 构建。
- 安全修改方式：绝不在没有向 `Gruntfile.js:21-25` 的 `PACK_LIBS` 和 `Gruntfile.js:57-147` 的 `getSvgDefs` 生成的 `codeSrc` 映射添加匹配项的情况下引入新的 `@INCLUDE[code:…]@` token。
- 测试覆盖：无 —— 构建时替换没有任何自动化检查覆盖。

## 扩展限制（Scaling Limits）

### 同时更新的线

- 当前容量：未指定；`README.md:23` 承认“稍微复杂的绘图”性能糟糕，但未量化。
- 限制：每条线拥有一个 `<svg>` 元素，其下多个 `<mask>`、`<marker>`、`<use>` 子节点附加到共享容器（默认 `body`）。布局失效是逐行的，但 `:5213-5233` 的 resize 处理程序在每次 window resize 时迭代**所有**线。经验上，社区报告在几十条活跃更新线左右开始退化。
- 扩展路径：(1) 在 resize 时为每条线实现脏检查；(2) 通过 `requestAnimationFrame` 批量写入 DOM（已通过 `anim-event` 部分完成）；(3) 对于 >50 条线，推荐 canvas/WebGL 替代方案，正如 `README.md:23` 已做的。

### 每条线的 DOM 大小

- 当前容量：每个 LeaderLine 实例向 `props.svgContainer` 附加约 20 个 SVG 元素（参见 `:931-1144` 的 `bindWindow`）。
- 限制：浏览器 SVG 渲染成本大致随节点数线性增长；大量线会膨胀文档并拖慢无关选择器和重排。
- 扩展路径：让所有线共享单个 `<svg>`（重大重构 —— 当前设计在 `:989` 假设每个实例一个 SVG）。

### Iframe 深度

- 当前容量：`:410-434` 的 `getFrames()` 在每次 `getBBoxNest()` 调用时遍历 iframe 链。
- 限制：与 iframe 深度线性相关，每次位置更新都会调用。深度嵌套的微前端设置（>3 层）会看到成本倍增 —— 但注意 `:411-414` 的 micro-app 变通方案在 `window.__MICRO_APP_NAME__` 被设置时**完全禁用** iframe 遍历，以正确性换取速度。
- 扩展路径：按 `props.baseWindow` 缓存 frames；仅在 iframe load/unload 事件时失效。

## 风险依赖（Dependencies at Risk）

### `anim-event`（最后发布于 2017）

- 风险：`package.json:32` 依赖 `anim-event@^1.0.16`（已安装：1.0.17）。该包无人维护，并通过 `Gruntfile.js:24` 的正则提取消费 —— `['AnimEvent', '../node_modules/anim-event/anim-event.min.js', /^[^]*?var\s+AnimEvent\s*=\s*([^]*)\s*;\s*$/]` —— 它直接读取 `node_modules` 并剥离特定的 `var AnimEvent = …;` wrapper。
- 影响：`anim-event` 的任何重新发布若改变文件布局或 `var AnimEvent =` 声明，都会静默破坏 IIFE 构建（正则捕获不到内容，`@INCLUDE` 替换在 `Gruntfile.js:179` 失败并报 `File doesn't exist code: AnimEvent`）。
- 迁移计划：将 `anim-event.min.js` vendor 到 `src/anim-event/`（与 `src/anim.js` 和 `src/path-data-polyfill/` 采用相同模式），以移除脆弱的 `node_modules` 读取。

### `cheerio@1.0.0-rc.9` → `rc.12`（发布候选版）

- 风险：`package.json:33` 声明 `cheerio@^1.0.0-rc.9`（已安装：1.0.0-rc.12）。Gruntfile 甚至在 `:130` 注释 cheerio 的怪癖：`// some version of cheerio have problem: <tag></tag> -> <tag/>`。1.0 final 已于 2024 年发布，带有破坏性变更。
- 影响：超过 rc.12 的 `pnpm update` 可能改变 `cheerio.load()` 行为，并静默产生不同的 SVG 输出，或破坏 `Gruntfile.js:131` 的 `<tag></tag> -> <tag/>` 正则归一化。
- 迁移计划：固定到精确已安装版本（`1.0.0-rc.12`）或升级到 1.0 final 并重新运行 `pnpm build`，diff `src/defs.js` 和 `leader-line.js` 以确认输出一致。

### `@esbuild-kit/cjs-loader`（已弃用）

- 风险：`package.json:29` 使用 `@esbuild-kit/cjs-loader@^2.4.4` 来运行 `gulpfile.ts`（参见 `package.json:56` 的 `gulp --require @esbuild-kit/cjs-loader -f gulpfile.ts`）。该包已被弃用，推荐使用 `tsx`。
- 影响：未来 Node 版本可能破坏该 loader；新贡献者安装时会收到弃用警告。
- 迁移计划：替换为 `tsx`（`pnpm add -D tsx`，然后 `gulp --require tsx/cjs -f gulpfile.ts`），或将 `gulpfile.ts`/`build/esm.ts` 重写为普通 `.mjs`。

### `grunt` + `gulp` 双构建系统

- 风险：`package.json:37,50` 同时依赖 `grunt@^1.4.1`（IIFE 构建）和 `gulp@^4.0.2`（ESM 重新打包）。Gulp 4 处于维护模式；Grunt 1.6 是最后一个版本。
- 影响：两个任务运行器需要理解，两套插件（`grunt-task-helper`、`grunt-rollup`、`rollup-plugin-esbuild`），以及脆弱的跨构建依赖：gulp 构建读取 grunt 产出的 `./leader-line.js`（`build/esm.ts:36`）。
- 迁移计划：直接统一为 Rollup —— Rollup 可在一个配置中从 `src/leader-line.js` 同时输出 IIFE 和 ESM，从而消除两个任务运行器。

### `bower.json` 消费者渠道

- 风险：参见上文“技术债 / P1 —— Bower 元数据被遗弃”。`bower.json:16` 指向 `leader-line.min.js`（已损坏）。
- 迁移计划：删除 `bower.json` 以及 `package.json:26` 的 `files` 数组中对应条目。

### `plain-draggable`（仅测试使用，但被打包进 devDeps）

- 风险：`package.json:44` 声明 `plain-draggable@^2.5.12`。它只被 `test/` 演示页面使用（参见 `test/httpd.js:17`），不被库本身使用。
- 影响：没有运行时风险，但 dev-dependency 面比必要更宽，并固定了第二个 anseki 库，维护画像相同。
- 迁移计划：无需；如果 `plain-draggable` 未来损坏，考虑 vendor 测试中使用的少量部分。

## 缺失的关键功能（Missing Critical Features）

### 没有自动化测试 runner / CI

- 问题：`package.json:52-58` 没有 `test` 脚本，没有 GitHub Actions/GitLab CI/Travis 配置（没有 `.github/`、`.gitlab-ci.yml`、`.travis.yml`、`azure-pipelines.yml`）。测试需要手动启动 `test/httpd.js`（`node test/httpd.js`，端口 8080）并在浏览器中打开 `http://localhost:8080/`；Jasmine 在页面中运行。
- 阻塞：回归（Regression）检测、发布信心、社区贡献。当前每次提交都未经测试发布 —— 包括上述 P0 问题，单个无头 `node -e "require('./leader-line.min.js')"` 冒烟测试就能捕获。

### 发布包中没有 TypeScript 类型

- 问题：`package.json` 没有 `types`/`typings` 字段，也没有 `.d.ts` 文件。`README.md:19` 将用户重定向到第三方类型包（`https://github.com/II-alex-II/leader-line-new`）。
- 阻塞：TypeScript 消费者（现代前端生态的大多数）无法在没有外部、非官方同步包的情况下获得类型检查或 IntelliSense。

### 没有 sourcemap

- 问题：`build/esm.ts:24` 设置 `sourceMap: false`；`Gruntfile.js:43-53` 的 uglify 步骤调用 `uglify.minify(content).code` 且不带 `sourceMap` 选项；`ls *.map` 没有结果。
- 阻塞：调试压缩后的生产问题。消费者必须手动将堆栈跟踪映射回 `src/leader-line.js`。

### 没有 dist 文件至少能解析的冒烟测试

- 问题：两个 P0 bug（`process.env` 引用、尾部 `export default`）都会被一个 3 行 Node 检查捕获：`node -e "require('./leader-line.min.js')"`。
- 阻塞：任何未来的构建变更都可能再次静默发布损坏产物。

## 测试覆盖缺口（Test Coverage Gaps）

### `svgContainer` 选项（fork 的招牌功能）

- 未测试内容：整个 `svgContainer` 代码路径 —— `setOptions` 中的初始化 (`src/leader-line.js:2617-2626`)、bind 时的 append (`:1129-1131`)、unbind 时的移除 (`:3555-3558`)、`defsSvgContainer` 回退 (`:918-921`)，以及 `attachOptions.svgContainer` 路径 (`:3814-3816`)。
- 文件：`src/leader-line.js:122,918,965,980,1129,2376,2526,2617-2626,3556,3814`
- 风险：fork 主打宣传功能（`README.md:10`）零断言。`grep -r "svgContainer" test/` 没有匹配。破坏 `svgContainer` 的重构不会导致任何测试失败。
- 优先级：**高** —— 这是消费者选择本 fork 而非上游的主要原因。

### `window.__MICRO_APP_NAME__` 变通方案

- 未测试内容：`src/leader-line.js:411-414` —— micro-app 路径（返回 `[]`）和普通 iframe 遍历路径都未测试。
- 文件：`src/leader-line.js:410-434`
- 风险：该变通方案对任何运行在微前端内部的消费者都是静默行为变更；没有测试断言非 micro-app 页面的 iframe 遍历仍然有效。
- 优先级：**高** —— 基于 iframe 的线锚点是宣传用例之一。

### ESM bundle 正确性

- 未测试内容：`leader-line.esm.js` 由 `build/esm.ts` 从 `leader-line.js` 重建，但没有测试导入它并断言 `LeaderLine` 被导出且可实例化。
- 文件：`leader-line.esm.js`、`build/esm.ts`
- 风险：`build/esm.ts` 的变更（例如插件顺序、`external`、`treeshake` 设置）可能静默丢弃导出或破坏 bundle 的 tree-shaking。
- 优先级：**中**。

### 引擎相关代码路径

- 未测试内容：所有 `IS_TRIDENT`、`IS_EDGE`、`IS_GECKO`、`IS_BLINK`、`IS_WEBKIT` 分支。测试套件没有无头浏览器矩阵。
- 文件：`src/leader-line.js:99-109` 以及“脆弱区域”下列出的 15 个以上分支点。
- 风险：这些分支都可能静默腐烂；代码库没有机制检测。
- 优先级：**中** —— 现代引擎分支（GECKO/BLINK/WEBKIT）最重要；TRIDENT/EDGE 反正是死代码。

### `getAlpha()` 颜色解析

- 未测试内容：`src/leader-line.js:248-296` 处理 `rgba|hsla|hwb|gray|device-cmyk`、带 alpha 的十六进制和 `transparent`。边缘情况（大写十六进制、8 位十六进制、rgb() 中的百分比、缺失 alpha）没有专门 spec。
- 文件：`src/leader-line.js:248-296`
- 风险：添加新颜色语法时发生微妙的 alpha 处理回归。
- 优先级：**低**。

### `positionByWindowResize` 全局监听器

- 未测试内容：`src/leader-line.js:5213-5233` 的单个 window `resize` 监听器会重定位每条线。没有测试切换 `LeaderLine.positionByWindowResize = false` 并断言线不被重定位。
- 文件：`src/leader-line.js:5213-5233`
- 风险：未来变更可能破坏切换或导致监听器跨实例泄漏。
- 优先级：**低**。

---

*最后映射：2026-07-18*
