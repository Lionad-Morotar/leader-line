# @lionad/leader-line

在网页元素之间绘制引导线(SVG)。这是 [anseki/leader-line](https://anseki.github.io/leader-line/) 的现代维护版:构建于 Vite 8 + TypeScript 7 工具链,提供类型定义与读写分离的渲染调度。

Source Project: <a href="https://anseki.github.io/leader-line/">https://anseki.github.io/leader-line/</a>

## 安装

```bash
pnpm add @lionad/leader-line
```

```js
// ESM
import LeaderLine from '@lionad/leader-line';

// CommonJS
const LeaderLine = require('@lionad/leader-line');
```

```html
<!-- <script> 标签(全局 LeaderLine) -->
<script src="https://unpkg.com/@lionad/leader-line/dist/leader-line.min.js"></script>
```

```js
const line = new LeaderLine(
  document.getElementById('start'),
  document.getElementById('end'),
  { color: 'coral', endPlug: 'arrow2' }
);
```

## 相比上游的新增

**功能**

- default exports(ESM 默认导出)
- `options.svgContainer` —— 指定 SVG 挂载容器,默认 `document.body`
- 完整类型定义(`index.d.ts`,覆盖公开 API 与 fork 特性)
- 三产物:ESM(`dist/leader-line.mjs`)、CommonJS(`dist/leader-line.cjs`)、IIFE(`dist/leader-line.min.js`)+ sourcemap

**性能:`requestPosition()` 与 `deferPositionUpdate`**

逐条调用 `position()` 更新 N 条线时,每条线的"布局读 + DOM 写"交替会触发 N 次强制同步 reflow。本包的渲染调度内核把一帧内的更新合并为"全部读 → 全部写",reflow 由 N 次降为至多 1 次(CDP LayoutCount 实测 50 → 1):

```js
// 方式 A:逐调用调度(拖拽等高频场景推荐)
lines.forEach(line => line.requestPosition());

// 方式 B:全局开关,position() 自动走调度
LeaderLine.deferPositionUpdate = true;
lines.forEach(line => line.position());
```

`position()` 默认保持同步语义(完全向后兼容);`LeaderLine.positionByWindowResize` 内部已走调度。

调度器已知限制:绑在模块窗口的 rAF 上,popup 独立窗口中的线按主窗口帧时钟 flush(主窗口隐藏时暂停);后台标签页的更新在恢复可见时一次性 flush。

**修复**

- `aplStats.position_plugOverheadSE` is not defined
- `@micro-zoe/micro-app` 中的 `getFrame error`

## 从 `leader-line`(旧包)迁移

`@lionad/leader-line@1.0.0` 是新包名下的首个版本,等价于旧 fork(本仓库 `leader-line@1.1.0` 系列)的继续:

```diff
- "leader-line": "^1.1.0"
+ "@lionad/leader-line": "^1.0.0"
```

- IE11 与旧 Edge 不再支持(构建目标为现代浏览器)
- 产物路径变更:`dist/` 下三格式(见上);旧根目录三文件(`leader-line.js`/`leader-line.min.js`/`leader-line.esm.js`)不再提供
- Bower 渠道已移除(Bower 已 EOL)
- API 完全兼容;`requestPosition()`/`deferPositionUpdate` 为纯新增

## 开发

```bash
pnpm install
pnpm dev             # vite build --watch(development,保留 [DEBUG])
pnpm build           # production 三产物 → dist/
pnpm test            # vitest:unit(node)+ browser(playwright chromium)
pnpm dev:playground  # Nuxt playground(场景 demo + bench,LAN 可访问)
pnpm lint            # eslint 9 flat
pnpm typecheck       # tsgo(库)+ nuxi typecheck(playground)
pnpm test:smoke      # 产物 <script> 直载冒烟
pnpm test:bench      # 渲染管线基准(CDP LayoutCount,需 vite dev server)
```

---

在稍微复杂的绘图中,LeaderLine 有着糟糕的性能,此时你应该选择 antd 或类似的(reactflow、vueflow、litegraph 等)专业绘图库
