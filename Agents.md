# Agents.md

leader-line 是 [anseki/leader-line](https://anseki.github.io/leader-line/) 的社区维护 fork，用于在网页中的元素之间绘制 SVG 引导线。相比原版新增 default exports 与 `options.svgContainer`（指定 SVG 挂载容器，默认 `body`），并修复 `aplStats.position_plugOverheadSE` 未定义及 `@micro-zoe/micro-app` 中 `getFrame` 报错问题。

* 现实层你有无限时间和资源，不要因上下文压缩简化任务执行

## 项目上下文

| 文档                                                    | 说明                       |
| ------------------------------------------------------- | -------------------------- |
| [README.md](./README.md)                                | 项目简介、fork 差异说明    |
| [package.json](./package.json)                          | 构建脚本、发布配置         |
| [Gruntfile.js](./Gruntfile.js)                          | IIFE 构建流程              |
| [gulpfile.ts](./gulpfile.ts)                            | ESM 构建流程（基于 dist 重打包） |
| [STACK.md](./.planning/codebase/STACK.md)               | 技术栈、开发命令、部署流程 |
| [STRUCTURE.md](./.planning/codebase/STRUCTURE.md)       | 目录结构、命名规范         |
| [ARCHITECTURE.md](./.planning/codebase/ARCHITECTURE.md) | 架构模式、术语表           |
| [CONVENTIONS.md](./.planning/codebase/CONVENTIONS.md)   | 代码风格、开发约定         |
| [TESTING.md](./.planning/codebase/TESTING.md)           | 测试策略、运行方式         |
| [INTEGRATIONS.md](./.planning/codebase/INTEGRATIONS.md) | 外部服务、环境变量         |
| [CONCERNS.md](./.planning/codebase/CONCERNS.md)         | 技术债务、注意事项         |

你可以自行读取项目上下文文档，更新时也优先更新相关文档。

## Agent skills

### Domain docs

本项目采用单上下文（single-context）布局，域文档集中在仓库根目录与 `.planning/codebase/` 目录：

- [README.md](./README.md) —— 项目简介、fork 差异说明、快速用法。
- `.planning/codebase/` —— 代码库全景文档目录，包含：
  - `STACK.md` —— 技术栈
  - `STRUCTURE.md` —— 目录结构
  - `ARCHITECTURE.md` —— 架构设计
  - `CONVENTIONS.md` —— 编码约定
  - `TESTING.md` —— 测试策略
  - `INTEGRATIONS.md` —— 集成说明
  - `CONCERNS.md` —— 技术债务与风险

使用 `improve-codebase-architecture`、`diagnose`、`tdd` 等技能时，应优先读取上述文档以建立项目上下文。
