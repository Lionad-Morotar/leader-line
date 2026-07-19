# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-alpha.0] - 2026-07-19

首个 `@lionad` scoped 发布(alpha 通道):主库现代化后继续版,并新增 Vue/Nuxt 声明式封装子包。

### Added

- **@lionad/leader-line-vue**(新子包):leader-line 的 Vue 3 声明式封装
  - `useLeaderLine(start, end, options)`:单线 composable,锚点支持 Element/模板 ref/selector/组件实例,options 字段支持 ref 并深度响应(变更自动 setOptions,不重建),组件卸载自动 remove
  - `useLeaderLines(edges, { key, preventSame })`:响应式数组驱动批量连线,keyed diff(同 key 就地更新、重排零重建),`getLine`/`findWhere`/`removeWhere` 谓词查询
  - `useDragConnect({ validTarget, onConnect, preventSame })`:拖拽建连,预览虚线跟随光标,selector/谓词双形态落点校验,异步门禁拦截,Esc/cancel/卸载全路径清理
  - `<LeaderLine>` 组件:扁平 props 的声明式糖,支持 v-for + key
  - `usePointAnchor`/`useAreaAnchor`/`useMouseHoverAnchor`/`useCaptionLabel`/`usePathLabel`:锚点与标签工厂的 scope 托管封装,杜绝 attachment 泄漏
  - `provideLeaderLineDefaults`:应用/子树级默认 options(合并优先级:调用处 > 注入默认 > 库默认)
- **@lionad/leader-line-nuxt**(新子包):Nuxt 4 模块,auto-import 全部 composable 与 `<LeaderLine>` 组件,client-only 插件注入模块级默认 options(`leaderLine.defaults`),SSR 安全
- 主库 `requestPosition()` 与 `LeaderLine.deferPositionUpdate`:一帧内"全部读 → 全部写"的批量重定位调度,高频多线更新场景 reflow 由 N 次降为至多 1 次(`position()` 保持同步语义,完全向后兼容)
- 主库 `options.svgContainer`:指定 SVG 挂载容器,默认 `document.body`
- 主库完整类型定义(`index.d.ts`,覆盖公开 API 与 fork 特性)

### Changed

- [internal] 构建链 Grunt/Gulp → Vite 8 library build,产物为 `dist/leader-line.{mjs,cjs,min.js}`(ESM/CJS/IIFE)+ sourcemap;产物路径变更,旧根目录三文件不再提供
- [internal] 测试栈 jasmine → vitest 4(unit node + browser playwright 双 project)

### Fixed

- `aplStats.position_plugOverheadSE` is not defined
- `@micro-zoe/micro-app` 中的 `getFrame error`

### Removed

- IE11 与旧 Edge 支持(构建目标为现代浏览器,ES2020)
- Bower 渠道(Bower 已 EOL)
