# 技术栈（Technology Stack）

**分析日期:** 2026-07-18

## 编程语言（Languages）

**主要：**
- JavaScript（兼容 ES5，并选择性使用 ES6 特性，例如 `const`、箭头函数）—— 整个运行时库位于 `src/leader-line.js`、`src/anim.js`、`src/defs.js`、`src/path-data-polyfill/path-data-polyfill.js`
- TypeScript —— 仅用于构建工具链，`gulpfile.ts`、`build/esm.ts`（不会随包发布）

**次要：**
- SCSS —— `src/leader-line.scss`（与之配套的手动编译产物 `src/leader-line.css` 是构建输入；构建链中没有接入 SCSS 编译器）
- HTML —— `src/symbols.html`（由 Grunt 的 `defs` 任务消费的 SVG symbol 定义）
- CSS —— `src/leader-line.css`（由 `Gruntfile.js` 压缩并内联进 JS 产物）

## 运行时（Runtime）

**目标环境：**
- Web 浏览器（通过内置的 `path-data-polyfill` 兼容 IE11+ 旧版本）；没有 Node.js 运行目标。该库直接操作 DOM/SVG，并暴露一个全局变量 `LeaderLine`（或 ESM 默认导出）。

**构建/测试宿主机：**
- Node.js（任意现代 LTS；没有 `.nvmrc`，`package.json` 中也没有 `engines` 字段）

**包管理器：**
- pnpm —— 权威 lockfile 为 `pnpm-lock.yaml`
- npm —— 同时存在一份过时的 `package-lock.json`（请勿使用；仅作历史保留）
- lockfile：存在（`pnpm-lock.yaml`）
- 安装命令：`pnpm install`

## 框架（Frameworks）

**核心：**
- 无 —— 纯原生 JavaScript（vanilla-JS）库，运行时零依赖。`package.json` 没有 `dependencies` 字段；列出的所有包都是 `devDependency`。

**测试：**
- jasmine-core 3.7.1 —— spec 框架，通过 `test/index.html` 在浏览器中运行
- test-page-loader 1.0.8 —— 在 spec 中加载演示 HTML 页面
- plain-draggable 2.5.12 —— 测试页面的交互拖拽支持
- anim-event 1.0.16 —— 动画事件辅助库，库代码（内置）和测试页面都会用到

**构建/开发：**
- Grunt 1.4.1 —— 编排 IIFE 构建（参见 `Gruntfile.js`）
- grunt-task-helper 0.3.10 —— 通用内容处理任务，用于 `defs`、`testFuncs`、`packJs`、`packMinJs`
- grunt-rollup 12.0.0 —— 声明在 `devDependencies` 中，但 `Gruntfile.js` 并未实际调用（遗留项）
- Gulp 4.0.2 —— 编排 ESM 重新打包（参见 `gulpfile.ts`）
- @esbuild-kit/cjs-loader 2.4.4 —— 让 gulp 直接加载 `gulpfile.ts`，命令为 `gulp --require @esbuild-kit/cjs-loader -f gulpfile.ts`
- rollup 4.9.6 —— 将 `leader-line.js` 打包为 `leader-line.esm.js`（参见 `build/esm.ts`）
- @rollup/plugin-node-resolve 15.2.3、@rollup/plugin-commonjs 26.0.1、rollup-plugin-esbuild 6.1.1 —— Rollup 插件
- uglify-js 3.13.7 —— `leader-line.min.js` 的压缩器
- clean-css 5.1.2 —— 在将 `src/leader-line.css` 内联到 SVG `<style>` 之前对其进行压缩
- htmlclean 3.0.8 —— 压缩生成的 SVG defs HTML 字符串
- pre-proc 1.0.2 —— 从源码中剥离 `DEBUG` 条件编译标签
- cheerio 1.0.0-rc.9 —— 解析 `src/symbols.html` 以提取 SVG `<symbol>` 定义
- cross-env 7.0.3 —— 在 npm 脚本中跨平台设置 `NODE_ENV`
- fast-glob 3.3.2 —— 已声明但在当前构建链中未使用
- node-static-alias 1.1.2 + log4js 6.4.0 —— 用于测试的本地静态服务器（`test/httpd.js`，端口 8080）

## 关键依赖（Key Dependencies）

**关键（缺少它们构建链会中断）：**
- `grunt` + `grunt-task-helper` —— 驱动 `Gruntfile.js` 中的 IIFE 流水线
- `rollup` + `rollup-plugin-esbuild` —— 驱动 `build/esm.ts` 中的 ESM 流水线
- `uglify-js` —— `packMinJs` 任务中的生产环境压缩
- `cheerio` —— `getSvgDefs` 任务在构建时解析 `src/symbols.html` 所必需

**内置（vendored）进 dist 产物（非外部运行时依赖）：**
- `anim-event` —— 从 `node_modules/anim-event/anim-event.min.js` 复制，并由 `Gruntfile.js` 内联（`PACK_LIBS` 条目）
- `src/path-data-polyfill/path-data-polyfill.js` —— 内置 polyfill，由 `PACK_LIBS` 内联
- `src/anim.js` —— 本地动画帧辅助模块，由 `PACK_LIBS` 内联

**基础设施：**
- `node-static-alias` + `log4js` —— 驱动 `test/httpd.js`（将 `/jasmine-core/*`、`/test-page-loader/*`、`/anim-event/*`、`/plain-draggable/*` 别名映射到 `node_modules`）

## 配置（Configuration）

**环境：**
- `NODE_ENV` —— 通过 npm 脚本中的 `cross-env` 设置；`development` 会禁用 `Gruntfile.js:minJs()` 中的压缩，并切换 `src/leader-line.js` 中的 `isDev` 分支；ESM 构建则始终通过 `build/esm.ts` 中的 esbuild `define` 强制使用 `"production"`
- 没有 `.env` 文件，也不消费其他环境变量

**构建配置文件：**
- `package.json` —— npm 脚本（`dev`、`build`、`build:iife`、`build:esm`、`clean`）、入口（entry points）、发布的 `files` 列表
- `Gruntfile.js` —— 完整 IIFE 流水线（`defs` → `packJs` → `packMinJs`）
- `gulpfile.ts` —— ESM 流水线入口（将 `buildESM` 注册为默认 gulp 任务）
- `build/esm.ts` —— ESM 产物的 Rollup 配置
- `bower.json` —— 遗留的 Bower 清单（仍会发布；`main: leader-line.min.js`）

**Lint / 格式化配置：**
- `.eslintrc.json` —— 继承外部共享配置 `../../_common/files/eslintrc.json`（不在仓库中）
- `.stylelintrc` —— 继承外部共享配置 `../../_common/files/stylelintrc.json`（不在仓库中）
- 没有 Prettier 配置

**编辑器：**
- `.vscode/settings.json` —— 仅设置 `cSpell.words`（“anseki” 的白名单）

**忽略规则：**
- `.gitignore` —— `.vscode`、`node_modules`（注意：尽管有忽略规则，`.vscode/settings.json` 仍被提交）

## 包入口（Package Entry Points）

在 `package.json` 中定义：
- `"main": "leader-line.esm.js"` —— 传统解析器入口
- `"exports"."."."import": "./leader-line.esm.js"` —— 面向 ESM 消费者
- `"exports"."."."require": "./leader-line.min.js"` —— CommonJS 消费者获得压缩后的 IIFE（暴露全局 `LeaderLine`）
- `"files": ["leader-line.min.js", "bower.json"]` —— 注意 `leader-line.esm.js` 不在 `files` 中，因此 `npm publish` 只会发布压缩构建和 Bower 清单，即使 `main` 指向的是 ESM 文件

## 构建链（Build Chains）

**IIFE 构建链（`pnpm build:iife`，`pnpm dev` 同时生成未压缩版）：**
1. `grunt` 运行 `default` 任务 → `build` → `defs` + `packJs` + `packMinJs`（`Gruntfile.js:228-234`）
2. `taskHelper:getSvgDefs` 使用 cheerio 解析 `src/symbols.html`，使用 clean-css 压缩 `src/leader-line.css`，生成包含 `DEFS_HTML`、`SYMBOLS`、`PLUG_KEY_2_ID`、`PLUG_2_SYMBOL` 变量的 `src/defs.js`（同时写入调试用产物 `src/symbols.json`）
3. `taskHelper:packJs` 读取 `src/leader-line.js`，内联 `@INCLUDE[code:*]@` 占位符（`anim`、`pathDataPolyfill`、`AnimEvent`，以及来自 `defs.js` 的所有内容），通过 `pre-proc` 剥离 `DEBUG` 标签，前置 banner 注释，在仓库根目录写出 `leader-line.js`
4. `taskHelper:packMinJs` —— 与 `packJs` 相同，但额外运行 `uglify-js`，写出 `leader-line.min.js`

**ESM 构建链（`pnpm build:esm`）：**
1. `gulp --require @esbuild-kit/cjs-loader -f gulpfile.ts` 加载 TypeScript 版 gulpfile
2. 默认任务运行 `build/esm.ts` 中的 `buildESM`
3. Rollup 读取已构建的 `./leader-line.js`（不是 `src/`），应用 `nodeResolve` + `commonjs` + `esbuild`（target 为 `esnext`，使用 `NODE_ENV=production` define，开启 treeshake），写出 `./leader-line.esm.js`，配置为 `format: 'esm'`、`exports: 'named'`

**组合命令：**
- `pnpm build` = `pnpm clean && pnpm build:iife && pnpm build:esm`（IIFE 必须先执行，因为 ESM 构建消费其产物）
- `pnpm dev` = `pnpm clean && cross-env NODE_ENV=development grunt`（生成用于调试的未压缩 IIFE）
- `pnpm clean` = `rm -f leader-line.min.js leader-line.esm.css`（注意：它删除的是 `leader-line.esm.css`，而不是 `leader-line.esm.js` —— 可能是笔误；ESM 产物并不会被清理）

## 平台要求（Platform Requirements）

**开发环境：**
- macOS / Linux（`clean` 脚本使用 `rm -f`，因此 Windows 需要 WSL / Git-Bash）
- Node.js + pnpm
- 无需全局工具（grunt / gulp 通过 pnpm 脚本使用本地安装的 bin）

**生产环境：**
- 仅需静态托管 —— 发布的产物是仓库根目录下的三个纯 JS 文件：`leader-line.js`、`leader-line.min.js`、`leader-line.esm.js`
- 通过 npm（`leader-line` 包）和 Bower（`bower.json`）分发
- 没有服务端运行时，消费者无需额外编译步骤

最后映射：2026-07-18
