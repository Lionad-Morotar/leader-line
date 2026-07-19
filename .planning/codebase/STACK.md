# 技术栈（Technology Stack）

**分析日期:** 2026-07-18

## 编程语言（Languages）

**主要：**
- JavaScript（兼容 ES5，并选择性使用 ES6 特性，例如 `const`、箭头函数）—— 整个运行时库位于 `src/leader-line.js`、`src/anim.js`、`src/update-scheduler.js`、`src/path-data-polyfill/path-data-polyfill.js`（ESM 模块）
- TypeScript —— 类型定义 `index.d.ts`（手写）与 `src/virtual-modules.d.ts`（构建期虚拟模块声明），不随包编译

**次要：**
- SCSS —— `src/leader-line.scss`（与之配套的手动编译产物 `src/leader-line.css` 是构建输入；构建链中没有接入 SCSS 编译器）
- HTML —— `src/symbols.html`（由 vite-plugin-defs 消费的 SVG symbol 定义）
- CSS —— `src/leader-line.css`（由 vite-plugin-defs 压缩并内联进产物）

## 运行时（Runtime）

**目标环境：**
- Web 浏览器（通过内置的 `path-data-polyfill` 兼容 IE11+ 旧版本）；没有 Node.js 运行目标。该库直接操作 DOM/SVG，并暴露一个全局变量 `LeaderLine`（或 ESM 默认导出）。

**构建/测试宿主机：**
- Node.js（任意现代 LTS；没有 `.nvmrc`，`package.json` 中也没有 `engines` 字段）

**包管理器：**
- pnpm —— 权威 lockfile 为 `pnpm-lock.yaml`（2.0 起唯一包管理器）
- lockfile：存在（`pnpm-lock.yaml`）
- 安装命令：`pnpm install`

## 框架（Frameworks）

**核心：**
- 无 —— 纯原生 JavaScript（vanilla-JS）库，运行时零依赖。`package.json` 没有 `dependencies` 字段；列出的所有包都是 `devDependency`。

**测试:**
- vitest 4.1 —— 测试运行器;unit project(node 环境)+ browser project(playwright chromium headless)
- @vitest/browser-playwright —— vitest browser 的 playwright provider
- playwright 1.61 —— 无头浏览器驱动(浏览器 spec、冒烟、性能基准)
- plain-draggable 2.5.12 —— 测试页面的交互拖拽支持(demo 页面)

**构建/开发:**
- Vite 8.1 —— 构建编排(rolldown 内核);library mode 一次产出 es/cjs/iife 三格式
- build/vite-plugin-defs.js —— 自定义插件:解析 `src/symbols.html` + `src/leader-line.css` 生成虚拟 defs 模块(替代原 Grunt `defs` 任务)
- build/vite-plugin-debug-strip.js —— 自定义插件:生产构建剥除 `[DEBUG]` 区域(复用 pre-proc)
- cheerio 1.2 —— 解析 `src/symbols.html` 以提取 SVG `<symbol>` 定义
- clean-css 5.1 —— 在将 `src/leader-line.css` 内联到 SVG `<style>` 之前对其进行压缩
- htmlclean 3.0 —— 压缩生成的 SVG defs HTML 字符串
- pre-proc 1.0 —— 从源码中剥离 `DEBUG` 条件编译标签
- eslint 9 + @eslint/js —— flat config 检查(`eslint.config.js`,新代码严格/遗留宽松)
- @typescript/native-preview(TS 7)—— `tsgo` 类型检查,范围为新代码 + `index.d.ts` 自洽

## 关键依赖(Key Dependencies)

**关键(缺少它们构建链会中断):**
- `vite` —— 驱动全部构建(es/cjs/iife 三产物 + sourcemap)
- `cheerio` —— vite-plugin-defs 在构建时解析 `src/symbols.html` 所必需
- `pre-proc` —— vite-plugin-debug-strip 剥除 `[DEBUG]` 区域所必需

**内置(vendored)进产物(非外部运行时依赖):**
- `src/anim-event/anim-event.js` —— vendored 的 anim-event(ESM 化,替代原 node_modules 正则提取)
- `src/path-data-polyfill/path-data-polyfill.js` —— 内置 polyfill(ESM 模块)
- `src/anim.js` —— 本地动画帧辅助模块(ESM 模块)

**Lint / 格式化配置：**
- `eslint.config.js` —— ESLint 9 flat config，仓库内自包含（新代码严格、遗留运行库只抓真实缺陷）
- 没有 Prettier / stylelint 配置

**编辑器：**
- `.vscode/settings.json` —— 仅设置 `cSpell.words`（“anseki” 的白名单）

**忽略规则：**
- `.gitignore` —— `.vscode`、`node_modules`（注意：尽管有忽略规则，`.vscode/settings.json` 仍被提交）

## 包入口（Package Entry Points）

包身份：`@lionad/leader-line@1.0.0`（scoped 新包，旧 fork `leader-line@1.1.0` 的继续），`publishConfig.access: public`。

在 `package.json` 中定义：
- `"main": "./dist/leader-line.cjs"` —— 传统解析器入口（CommonJS）
- `"module": "./dist/leader-line.mjs"` —— 传统 ESM 解析器入口
- `"types": "./index.d.ts"` —— 手写公开 API 类型定义
- `"exports"."."`：`types` → `./index.d.ts`；`import` → `./dist/leader-line.mjs`；`require` → `./dist/leader-line.cjs`；`default` → `./dist/leader-line.mjs`
- `"files": ["dist", "index.d.ts"]`、`"sideEffects": false`
- `<script>` 标签直接引用：`dist/leader-line.min.js`（IIFE，暴露全局 `LeaderLine`）

## 构建链（Build Chains）

**单一构建链（`pnpm build` = `vite build`，约 100~200ms）：**
1. `vite-plugin-defs` 解析 `src/symbols.html`（cheerio）+ 压缩 `src/leader-line.css`（clean-css），生成虚拟模块 `virtual:leader-line-defs`（导出 `DEFS_HTML`/`SYMBOLS`/`PLUG_KEY_2_ID`/`PLUG_2_SYMBOL`/`DEFAULT_END_PLUG`），供主模块 `import`
2. `vite-plugin-debug-strip` 在 production 模式经 `pre-proc` 剥除源码中的 `[DEBUG]` 区域（traceLog 打点与 `window.*` 调试句柄）；development/test 模式保留
3. rolldown 打包 `src/leader-line.js`（ESM 模块图：anim、path-data-polyfill、anim-event、defs 虚拟模块），banner 注释从 `package.json` 版本动态生成，一次产出三格式 + sourcemap：
   - `dist/leader-line.mjs`（ES，供 bundler import）
   - `dist/leader-line.cjs`（CommonJS，供 require）
   - `dist/leader-line.min.js`（IIFE 压缩，供 `<script>` 标签，全局名 `LeaderLine`）

**脚本：**
- `pnpm dev` = `vite build --watch --mode development`（不压缩、保留 [DEBUG]、watch）
- `pnpm build` = `vite build`（production 三产物）
- `pnpm test` = `vitest run`（unit node + browser playwright 双 project）
- `pnpm lint` / `pnpm typecheck` / `pnpm test:smoke` / `pnpm test:bench`（性能基准，需先起 vite dev server）
- `pnpm clean` = `rm -rf dist`

## 平台要求（Platform Requirements）

**开发环境：**
- macOS / Linux（`clean` 脚本使用 `rm -f`，因此 Windows 需要 WSL / Git-Bash）
- Node.js 22+ + pnpm
- 无需全局工具（vite/vitest/playwright 均为本地依赖）

**生产环境：**
- 仅需静态托管 —— 发布的产物是 `dist/` 下的纯 JS 文件 + sourcemap，以及根目录的 `index.d.ts`
- 通过 npm（`leader-line` 包）分发；2.0 起不再支持 Bower 与 IE11/旧 Edge
- 没有服务端运行时，消费者无需额外编译步骤

最后映射：2026-07-18（2.0 工具链迁移后更新）
