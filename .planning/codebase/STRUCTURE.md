# 代码库结构（Codebase Structure）

**分析日期:** 2026-07-18

## 目录布局（Directory Layout）

```
leader-line/
├── src/                          # 作者编辑的源码（带构建宏的 IIFE）
│   ├── leader-line.js            #   主库 —— 5,200+ 行的单 IIFE 闭包(ESM 模块)
│   ├── anim.js                   #   帧调度器（rAF + cubic-bezier）
│   ├── update-scheduler.js       #   渲染调度内核(dirty set + rAF 两阶段 flush)
│   ├── virtual-modules.d.ts      #   构建期虚拟模块的类型声明
│   ├── symbols.html              #   plug 的 SVG <symbol> 库源文件
│   ├── leader-line.scss          #   样式（SCSS 源文件）
│   ├── leader-line.css           #   编译后的 CSS，构建时内联进 DEFS_HTML
│   ├── anim-event/               #   vendored 的 anim-event(ESM 化)
│   └── path-data-polyfill/       #   内置的 path.getPathData() polyfill
│       └── path-data-polyfill.js #     1,147 行
├── build/
│   ├── vite-plugin-defs.js       # symbols.html+css → 虚拟 defs 模块
│   └── vite-plugin-debug-strip.js # [DEBUG] 区域生产剥除(pre-proc)
├── dist/                         # 构建产物(gitignore):leader-line.{mjs,cjs,min.js}+map
├── test/                         # vitest 测试(unit node + browser playwright)
│   ├── setup-browser.js          #   browser 适配层(jasmine shim/loadPage/matcher)
│   ├── exported-funcs.js         #   @EXPORT 提取(vite ?raw)
│   ├── util.js                   #   自定义匹配器（toContainAll、toNotContainAny）
│   ├── guide-view.js/.css        #   手动检查的视觉辅助
│   ├── traceLog.js               #   为 [DEBUG] 日志提供 window.traceLog
│   ├── SHAPE_GAP.html            #   手动演示
│   ├── grid.svg                  #   夹具
│   ├── unit/                     #   node 环境单测(插件/调度内核)+ fixtures/
│   ├── smoke/dist-smoke.mjs      #   产物 <script> 直载冒烟
│   ├── perf/                     #   渲染管线基准(bench.html + run-bench.mjs)
│   ├── spec/                     #   browser specs（每个关注点一个文件）
│   │   ├── funcs.js, bbox.js, socket.js, options.js, stats.js,
│   │   ├── win-resize.js, effect.js, effect-show.js, attachment.js
│   │   ├── func-PATH_FLUID.js, func-PATH_GRID.js
│   │   ├── svg-container.js, position-schedule.js
│   │   └── common/, funcs/, bbox/, socket/, func/, win-resize/  （夹具 HTML）
│   └── attachment-label/, bindWindow/, effect-show/, func-PATH_GRID/,
│       function-test/, mask/, reflow/      # 手动 / 集成演示页面
├── img/                          # README 截图（ex-*.png/gif）
├── .github/workflows/ci.yml      # CI:lint → typecheck → build → test → smoke
├── .planning/codebase/           # 由 GSD 生成的代码库映射文档（本目录）
├── .vscode/
├── vite.config.js                # Vite 8 library 构建(es/cjs/iife 三产物)
├── eslint.config.js              # ESLint 9 flat config
├── tsconfig.json                 # tsgo(TS 7)typecheck 范围
├── index.d.ts                    # 手写公开 API 类型定义
├── package.json                  # 脚本 + 依赖（pnpm）
├── pnpm-lock.yaml
├── package-lock.json             # 遗留的 npm lockfile（仅作参考）
├── bower.json                    # 遗留的 Bower 清单（仍会发布）
├── Agents.md                     # AI 代理项目上下文（中文）
├── Claude.md -> Agents.md        # 符号链接
├── README.md                     # Fork 说明（英文 + 中文）
├── LICENSE
├── .eslintrc.json, .stylelintrc, .gitignore
├── leader-line.js                # 构建产物 —— IIFE 调试 dist（256k）
├── leader-line.min.js            # 构建产物 —— IIFE 生产 dist（100k）
└── leader-line.esm.js            # 构建产物 —— ESM dist（240k，gulp/rollup 输出）
```

## 目录用途（Directory Purposes）

**`src/`：**
- 用途：所有作者编辑的库源码
- 包含：单文件 IIFE（`leader-line.js`）、内置依赖（`anim.js`、`path-data-polyfill/path-data-polyfill.js`）、声明式 symbol 库（`symbols.html`）和样式
- 关键文件：`src/leader-line.js`、`src/symbols.html`、`src/anim.js`、`src/path-data-polyfill/path-data-polyfill.js`
- 注意：`src/defs.js` 和 `src/symbols.json` 是由 `grunt defs` 重新生成的构建产物 —— 请勿手动编辑

**`build/`：**
- 用途：ESM 构建配置（由 gulp 消费）
- 包含：读取 `./leader-line.js` 并写出 `./leader-line.esm.js` 的 Rollup 配置
- 关键文件：`build/esm.ts`

**`test/`：**
- 用途：基于浏览器的 Jasmine 测试框架和手动演示页面
- 包含：`test/spec/` 中的 spec 文件、`test/spec/<topic>/` 中的夹具 HTML、`test/<topic>/` 中的集成演示、`test/httpd.js` 开发服务器
- 关键文件：`test/index.html`、`test/httpd.js`、`test/util.js`、`test/traceLog.js`

**`img/`：**
- 用途：上游 README / 文档引用的静态资源
- 包含：`ex-*.png` / `ex-*.gif` 截图

**`.planning/codebase/`：**
- 用途：由 GSD 生成的代码库映射文档
- 包含：`STACK.md`、`ARCHITECTURE.md`、`STRUCTURE.md` 等
- 生成：是 —— 可安全重新生成

**仓库根目录（发布产物）：**
- 用途：通过 npm / bower / `<script>` 标签提供给消费者的构建产物
- 包含：`leader-line.js`、`leader-line.min.js`、`leader-line.esm.js`
- 生成：是 —— 由 `pnpm build` 生成，并提交到仓库以用于发布标签

## 关键文件位置（Key File Locations）

**入口（Entry Points）：**
- `src/leader-line.js`：唯一真相来源 —— 导出 `LeaderLine` 的单个 IIFE（第 5238 行是 ESM 构建使用的 `export default` shim）
- `leader-line.js`：IIFE 调试 dist 产物，ESM 构建的输入
- `leader-line.min.js`：IIFE 生产 dist 产物（`package.json` 的 `exports.require` 引用）
- `leader-line.esm.js`：ESM dist 产物（`package.json` 的 `main` 和 `exports.import` 引用）

**配置：**
- `package.json`：npm 脚本（`dev`、`build`、`build:iife`、`build:esm`、`clean`）和开发依赖
- `Gruntfile.js`：IIFE 构建流水线 —— 定义 `defs`、`funcs`、`packJs`、`packMinJs`、`build`、`default` 任务
- `gulpfile.ts`：ESM 构建入口 —— 从 `build/esm.ts` 重新导出 `buildESM`
- `build/esm.ts`：Rollup 配置，使用 `nodeResolve`、`commonjs`、`esbuild` 插件
- `.eslintrc.json`（根目录、`src/`、`test/`）：每层独立的 ESLint 设置；根目录继承 `../../_common/files/eslintrc.json`（仓库外部）
- `.stylelintrc`：样式 lint
- `bower.json`：遗留的 Bower 清单（仍按 `package.json` 的 `files` 字段发布）

**核心逻辑：**
- `src/leader-line.js`：所有运行时逻辑都在一个文件中；关键分区：
  - 常量与类型定义：第 1-200 行
  - 几何 / SVG 辅助函数：第 217-910 行
  - 窗口 / iframe 桥接：第 404-911 行
  - SVG DOM 工厂（`bindWindow`、`setupWindow`）：第 913-1145 行
  - 各特性更新器（`updateLine`、`updatePlug`、`updateLineOutline`、`updatePlugOutline`、`updateFaces`、`updatePosition`、`updatePath`、`updateViewBox`、`updateMask`）：第 1150-2300 行
  - 流水线编排器（`update`、`show`、`setOptions`）：第 2300-2740 行
  - `EFFECTS` 注册表：第 2845-3146 行
  - `SHOW_EFFECTS` 注册表：第 3167-3380 行
  - `LeaderLine` 类 + 访问器：第 3387-3570 行
  - `ATTACHMENTS` 注册表：第 3684-5210 行
  - 静态工厂 + `positionByWindowResize` 监听器 + `export default`：第 5206-5238 行
- `src/anim.js`：独立的帧调度器，由 `@EXPORT@` 包裹，以便 `packJs` 内联
- `src/path-data-polyfill/path-data-polyfill.js`：内置的 SVG path data polyfill，同样由 `@EXPORT@` 包裹

**测试：**
- `test/index.html`：加载所有 spec 文件的 Jasmine 运行器
- `test/httpd.js`：端口 8080 的开发服务器；提供 `node_modules` 别名和仓库根目录的 `/src`
- `test/spec/*.js`：spec 文件 —— 每个关注点一个文件（`funcs.js`、`bbox.js`、`socket.js`、`options.js`、`stats.js`、`win-resize.js`、`effect.js`、`effect-show.js`、`attachment.js`、`func-PATH_FLUID.js`、`func-PATH_GRID.js`）
- `test/spec/<topic>/page*.html`：由 `test-page-loader` 加载到 iframe 中的夹具页面
- `test/util.js`：针对 `traceLog.log` 的自定义匹配器
- `test/traceLog.js`：实现源码中 `[DEBUG]` 调用使用的 `window.traceLog`
- `test/<topic>/index.html` + `test.js` + `view.css`：手动 / 交互式演示（`attachment-label`、`bindWindow`、`effect-show`、`func-PATH_GRID`、`function-test`、`mask`、`reflow`）

## 命名约定（Naming Conventions）

**文件：**
- 源码模块：`kebab-case.js` —— `leader-line.js`、`anim.js`、`path-data-polyfill.js`
- Spec 文件：`test/spec/` 下的 `kebab-case.js` —— `func-PATH_FLUID.js`、`win-resize.js`、`effect-show.js`
- 演示页面：每个主题一个目录，包含 `index.html` + `test.js` + `view.css` —— `test/effect-show/index.html`、`test/effect-show/test.js`、`test/effect-show/view.css`
- 夹具 HTML 变体：`page.html`、`page-c1.html`、`page-c2.html`（`-c<N>` 后缀表示用于跨窗口测试的 iframe 嵌套子页面）—— `test/spec/common/page-c1.html`、`test/spec/win-resize/page-c2.html`
- 构建输出：固定名称 —— `leader-line.js`、`leader-line.min.js`、`leader-line.esm.js`（无版本后缀）
- JSON 夹具：`testCases.json.js`（用 JS 包裹的 JSON，以便通过 `<script>` 标签加载）—— `test/func-PATH_GRID/testCases.json.js`

**目录：**
- 小写，多词时用 kebab-case：`attachment-label/`、`effect-show/`、`func-PATH_GRID/`、`win-resize/`、`path-data-polyfill/`
- Spec 夹具与 spec 文件名对应：`test/spec/funcs.js` 从 `test/spec/funcs/` 读取夹具
- 手动演示位于 `test/<topic>/`，而不是 `test/spec/` 下

**源码内标识符（供参考）：**
- 常量：`SCREAMING_SNAKE_CASE` —— `PATH_FLUID`、`SOCKET_TOP`、`DEFS_ID`、`APP_ID`
- 状态键（stat keys）：`<group>_<prop>` 的 snake_case —— `line_color`、`plug_enabledSE`、`capsMaskAnchor_pathDataSE`。`SE` 后缀表示“Start/End 对”，`SEM` 表示“Start/End/Middle 三元组”
- 事件名：`apl_<statKey>`（已应用 applied）、`cur_<statKey>`（当前 current），以及生命周期事件如 `svgShow`、`new_edge4viewBox`
- 内部函数：`camelCase` —— `getBBoxNest`、`setMarkerOrient`、`pathList2PathData`

## 在何处添加新代码（Where to Add New Code）

**新增线条效果（类似 dash）：**
- 主要代码：在 `src/leader-line.js` 的 `EFFECTS` 中追加一条新记录（约 `:2845-3146`）
- 必须声明：`stats`、`optionsConf`、`init(props)`、`remove(props)`、`update(props)`；可选 `anim: true` 和 `defaultAnimOptions`
- 构造函数和访问器生成器会通过 `Object.keys(EFFECTS).forEach` 自动识别它
- 测试：在 `test/spec/effect.js` 中新增用例（或在 `test/index.html` 中加载新的 spec 文件）

**新增显示/隐藏过渡：**
- 主要代码：在 `src/leader-line.js` 的 `SHOW_EFFECTS` 中追加记录（约 `:3167-3380`）
- 必须声明：`defaultAnimOptions`、`init(props, timeRatio)`、`start(props, timeRatio)`、`stop(props, finish, on)`
- 测试：在 `test/spec/effect-show.js` 中新增用例

**新增附件（anchor 或 label）：**
- 主要代码：在 `src/leader-line.js` 的 `ATTACHMENTS` 中追加记录（约 `:3684-5210`）
- 必须声明：`type: 'anchor' | 'label'`、`argOptions`、`init(attachProps, attachOptions)`、`removeOption`、`remove`；anchor 还需 `getBBoxNest(attachProps, props)`；label 还需 `updatePath` / `updateColor` / `updateShow`
- `:5206-5210` 的循环会自动创建静态工厂 `LeaderLine.<name>`
- 测试：在 `test/spec/attachment.js` 中新增用例；若涉及可视化，可在 `test/attachment-label/` 下添加手动演示

**新增 plug symbol（箭头头）：**
- 主要代码：在 `src/symbols.html` 中添加一个新的 `<svg>` 块，包含 `<symbol id="...">` 和 `<rect class="size">` 边界框；用 `class="prop-<name>"`、`varId-<name>`、`no-overhead` 等标注属性
- 然后运行 `grunt defs`（或 `pnpm dev`）重新生成 `src/defs.js` 和 `src/symbols.json`
- 该 symbol 会自动通过 `PLUG_KEY_2_ID` 可寻址

**新增路径类型（如 fluid / grid）：**
- 主要代码：扩展 `PATH_KEY_2_ID` 和 `updatePosition` 内部的路径生成分支（`src/leader-line.js:1507-2014`）
- 在 `:49-51` 处，与 `PATH_STRAIGHT` … `PATH_GRID` 一起添加关键字常量
- 测试：新增 `test/spec/func-PATH_<NAME>.js` 并从 `test/index.html` 加载

**新增几何 / 工具辅助函数：**
- 主要代码：在 `src/leader-line.js` 的 IIFE 内部，靠近其他纯辅助函数（`:217-910`）
- 如果需要从测试框架访问，通过 `window.<name> = <fn>; // [DEBUG/]` 暴露，使其在生产构建中被剥离，但在测试期间可用（参见 `:231` 的 `window.hasChanged = hasChanged; // [DEBUG/]`）

**新增构建步骤：**
- Grunt 任务：在 `Gruntfile.js` 中添加一个 `taskHelper` 条目，并通过 `grunt.registerTask` 注册
- ESM 侧：编辑 `build/esm.ts`（Rollup 插件 / 输出选项）

**测试共享工具：**
- 共享辅助：`test/util.js`（匹配器）、`test/get-source.js`（XHR）、`test/traceLog.js`（调试日志缓冲区）

## 特殊目录（Special Directories）

**`src/path-data-polyfill/`：**
- 用途：内置的第三方 SVG path-data polyfill
- 生成：否（手动内置并手动维护）
- 已提交：是
- 注意：它有自己的 `.eslintrc.json`，用于禁用与上游风格冲突的规则

**`test/spec/<topic>/`（夹具子目录）：**
- 用途：由 `test-page-loader` 加载到 iframe 中的 HTML 夹具，用于跨窗口 / 布局场景
- 生成：否
- 已提交：是

**根目录下的 `leader-line.js`、`leader-line.min.js`、`leader-line.esm.js`：**
- 用途：为发布标签和 Bower 提交的发布产物
- 生成：是 —— `leader-line.js` 和 `leader-line.min.js` 来自 `pnpm build:iife`（Grunt），`leader-line.esm.js` 来自 `pnpm build:esm`（gulp + Rollup）
- 已提交：是 —— 请勿手动编辑；通过 `pnpm build` 重新生成

**`src/defs.js`、`src/symbols.json`：**
- 用途：`grunt defs` 产生的中间构建产物
- 生成：是
- 已提交：是（这样消费者在不重新运行 `defs` 的情况下执行 `grunt packJs` 仍能工作）

**`.planning/codebase/`：**
- 用途：GSD 生成的映射文档（本文件及其同目录文件）
- 生成：是
- 已提交：是

**`img/`：**
- 用途：README 资源
- 生成：否
- 已提交：是

**`node_modules/`：**
- 用途：`pnpm install` 目标目录
- 生成：是
- 已提交：否（受 `.gitignore` 保护）

## 源码、测试与构建产物（Source vs Test vs Build Artifacts）

| 类别 | 位置 | 是否可手动编辑？ | 是否已提交？ |
|----------|----------|---------------|------------|
| 库源码 | `src/leader-line.js`、`src/anim.js`、`src/path-data-polyfill/path-data-polyfill.js`、`src/symbols.html`、`src/leader-line.scss` | 是 | 是 |
| 构建中间产物 | `src/defs.js`、`src/symbols.json`、`src/leader-line.css` | 否 —— 通过 `grunt defs` / SCSS 编译重新生成 | 是 |
| 发布产物 | `leader-line.js`、`leader-line.min.js`、`leader-line.esm.js` | 否 —— 通过 `pnpm build` 重新生成 | 是 |
| 构建配置 | `Gruntfile.js`、`gulpfile.ts`、`build/esm.ts`、`package.json` | 是 | 是 |
| 测试源码 | `test/spec/*.js`、`test/util.js`、`test/get-source.js`、`test/traceLog.js` | 是 | 是 |
| 测试夹具 | `test/spec/<topic>/*.html`、`test/func-PATH_GRID/testCases*.json.js` | 是 | 是 |
| 手动演示 | `test/<topic>/index.html`、`test.js`、`view.css` | 是 | 是 |
| 文档 / 元数据 | `README.md`、`Agents.md`、`LICENSE`、`bower.json` | 是 | 是 |
| 生成的映射文档 | `.planning/codebase/*.md` | 否 —— 由 GSD mapper 重新生成 | 是 |

## 构建流水线关系（Build Pipeline Relationships）

```text
src/symbols.html ──(grunt defs: cheerio 解析)──▶ src/defs.js + src/symbols.json
                                                         │ (提供 DEFS_HTML、SYMBOLS、
                                                         │  PLUG_KEY_2_ID、PLUG_2_SYMBOL、
                                                         │  DEFAULT_END_PLUG 字面量)
src/leader-line.scss ──(scss 编译)──▶ src/leader-line.css
                                                         │ (由 clean-css 压缩，并内联
                                                         │  到 DEFS_HTML 的 <style> 中)
src/anim.js ──┐
src/path-data-polyfill/path-data-polyfill.js ──┤  （通过 PACK_LIBS 读取，
node_modules/anim-event/anim-event.min.js ──┘   由 @EXPORT@ 正则提取）
                                                         │
                                                         ▼
src/leader-line.js ──(grunt packJs: @INCLUDE[code:X]@ 替换，
                      pre-proc.removeTag('DEBUG')，
                      banner 前置)──▶ leader-line.js      （IIFE 调试 dist）
                  ──(grunt packMinJs: 同上 + uglify-js)──▶ leader-line.min.js （IIFE 生产 dist）
                                                         │
                                                         ▼
                  gulp --require @esbuild-kit/cjs-loader -f gulpfile.ts
                    └── build/esm.ts: rollup(input './leader-line.js')
                          + nodeResolve + commonjs + esbuild
                          ──▶ leader-line.esm.js           （ESM dist）
```

**关键观察：**
- ESM 构建不会直接消费 `src/leader-line.js` —— 它打包的是 Grunt 生成的 IIFE 产物 `leader-line.js`，因此 `pnpm build` 总是先执行 `build:iife` 再执行 `build:esm`（`package.json:54`）
- `grunt funcs` 从 `src/leader-line.js` 中提取 `@EXPORT[file:xxx]@ ... @/EXPORT@` 块为独立文件（供测试框架使用）；参见 `Gruntfile.js:149-163`
- `src/defs.js` 是由 `grunt defs` 生成的占位文件；在 `packJs` 阶段，实际的 defs 内容通过 `@INCLUDE[code:DEFS_HTML]@` 直接内联到产物中 —— `src/defs.js` 本身不会被发布

---

*结构分析：2026-07-18*

最后映射：2026-07-18
