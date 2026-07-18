# 外部集成（External Integrations）

**分析日期：** 2026-07-18

## API 与外部服务（APIs & External Services）

未识别到。该库是一个纯客户端 SVG/DOM 渲染器。对 `src/` 的 `grep` 未发现 `fetch`、`XMLHttpRequest`、`WebSocket`、`axios` 或其他网络调用。所有渲染都在浏览器中针对本地 DOM 完成。

## 数据存储（Data Storage）

**数据库：**
- 未识别到。

**文件存储：**
- 未识别到。该库不做任何持久化；它只将 SVG 元素写入 DOM（默认在 `document.body` 下，或当提供 `options.svgContainer` 时写入该容器）。

**缓存：**
- 未识别到（仅内存缓存，例如 `src/leader-line.js` 中 IIFE 闭包内的每个实例状态）。

## 认证与身份（Authentication & Identity）

**Auth Provider：**
- 未识别到。该库没有用户、会话、token 或凭证的概念。

## 监控与可观测性（Monitoring & Observability）

**错误追踪：**
- 未识别到。

**日志：**
- 仅构建时 —— `test/httpd.js` 使用 `log4js` 为本地静态服务器着色请求日志。不属于发布的库。
- 运行时调试 —— `src/leader-line.js` 的 `DEBUG` 标记块内部引用一个 `traceLog` 全局变量（参见 `test/traceLog.js`、`test/traceLog-test.html`）；这些块会被 `Gruntfile.js` 中的 `pre-proc.removeTag('DEBUG', ...)` 从生产构建中剥离。

## CI/CD 与部署（CI/CD & Deployment）

**托管：**
- 未配置。没有 `.github/`、`.gitlab-ci.yml`、`.circleci/`、`vercel.json`、`netlify.toml`。发布是手动的（由维护者执行 `npm publish`）。

**CI 流水线：**
- 未识别到。测试必须手动运行：启动 `test/httpd.js`，然后在浏览器中打开 `http://localhost:8080/`。

**分发渠道：**
- npm registry —— 包 `leader-line` v1.1.0，参见 `package.json`
- Bower registry —— 遗留，参见 `bower.json`（仍列出 v1.0.7，因此落后于 npm 版本）
- GitHub —— source of truth 位于 `https://github.com/Lionad-Morotar/leader-line`（根据 `package.json:homepage` 和 `package.json:repository`）

## 环境配置（Environment Configuration）

**必需的环境变量：**
- 运行时无。
- `NODE_ENV`（仅构建时）—— 由 `package.json` 脚本中的 `cross-env` 设置。`development` 会跳过 `Gruntfile.js:minJs()` 中的 uglify；ESM 流水线在 `build/esm.ts` 中总是通过 esbuild `define` 注入 `process.env.NODE_ENV = "production"`。

**Secrets 位置：**
- 不适用 —— 仓库中任何地方都没有 secrets、API key 或凭证。

## Webhooks 与回调（Webhooks & Callbacks）

**传入：**
- 未识别到。

**传出：**
- 未识别到。该库在内部发出 DOM 事件（例如通过打包的 `anim-event` 辅助函数），但从不离开页面。

## 打包进 Dist 的第三方代码（Third-Party Code Vendored Into the Dist）

这些不是运行时服务，而是打包进 bundle 的外部代码：

- `anim-event`（npm 包，MIT）—— 构建时从 `node_modules/anim-event/anim-event.min.js` 读取并内联到 `leader-line.js` / `leader-line.min.js`，通过 `Gruntfile.js:21-25` 中的 `PACK_LIBS` 表
- `path-data-polyfill` —— vendored 源码位于 `src/path-data-polyfill/path-data-polyfill.js`（用于旧版浏览器的 SVG `getPathData`/`setPathData` polyfill），以同样方式内联

## 上游 / Fork 关系（Upstream / Fork Relationship）

- 原项目：`anseki/leader-line` —— 文档站点 `https://anseki.github.io/leader-line/`（在 `README.md` 中引用）
- 本 fork（`Lionad-Morotar/leader-line`）手动跟踪上游；没有自动同步、CI 中没有配置上游 remote，也没有计划合并流水线
- 社区类型定义由外部维护：`https://github.com/II-alex-II/leader-line-new`（链接来自 `README.md:19`）

## 测试时“集成”（Test-Time "Integrations"）

这些是仅限本地的开发服务器/辅助工具，不是外部服务，但它们是距离集成表面最近的东西：

- `test/httpd.js` —— 基于 `node-static-alias` 的本地 HTTP 服务器，端口 **8080**。别名 `/jasmine-core/*`、`/test-page-loader/*`、`/anim-event/*`、`/plain-draggable/*` 映射到 `node_modules`，`/src/*` 映射到仓库的 `src/`。通过 `log4js` 记录日志。
- `test/index.html` —— Jasmine Spec Runner 页面；从 `test/httpd.js` 提供的服务加载 `test/spec/*.js` 测试库。

最后映射：2026-07-18
