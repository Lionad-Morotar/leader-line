# LeaderLine

Draw a leader line in your web page.

Source Project: <a href="https://anseki.github.io/leader-line/">https://anseki.github.io/leader-line/</a>

**New Feature**

* add default exports
* `options.svgContainer`, specify where to append-to the svg elements, default is `body`
* `line.requestPosition()` and `LeaderLine.deferPositionUpdate` — batched read/write-segregated position updates (see below)
* full type definitions (`index.d.ts`)

**Fix Issues**

* `aplStats.position_plugOverheadSE` is not defined
* `getFrame error` in `@micro-zoe/micro-app`

**Types**

Need types? check it out: [https://github.com/II-alex-II/leader-line-new](https://github.com/II-alex-II/leader-line-new)

---

## 2.0 Migration Guide

**Breaking**

* IE11 and legacy Edge are no longer supported (build target is modern browsers).
* Distribution files moved to `dist/`:
  * ESM: `dist/leader-line.mjs`
  * CommonJS: `dist/leader-line.cjs`
  * IIFE (`<script>` tag, global `LeaderLine`): `dist/leader-line.min.js`
* `bower.json` support was removed (Bower is EOL). npm/pnpm is the only channel.

**Performance: batched position updates**

Updating many lines per frame (e.g. dragging) used to cost one forced synchronous
reflow per line (N lines → N reflows). 2.0 adds a scheduler that separates layout
reads from DOM writes — at most one reflow per frame:

```js
// Opt-in A: per-call scheduling
lines.forEach(line => line.requestPosition());

// Opt-in B: make position() itself scheduled
LeaderLine.deferPositionUpdate = true;
lines.forEach(line => line.position());
```

`position()` keeps its synchronous semantics by default (fully backward compatible).
`LeaderLine.positionByWindowResize` now uses the scheduler internally.

---

在稍微复杂的绘图中，LeaderLine 有着糟糕的性能，此时你应该选择 antd 或类似的（reactflow、vueflow、litegraph 等）专业绘图库

## Development

```bash
pnpm install
pnpm dev        # vite build --watch (development, unminified, [DEBUG] kept)
pnpm build      # production build → dist/ (es/cjs/iife + sourcemaps)
pnpm test       # vitest: unit (node) + browser (playwright chromium)
pnpm lint       # eslint 9 flat config
pnpm typecheck  # tsgo (TypeScript 7) on new code + d.ts self-check
pnpm test:smoke # headless <script>-tag loading check of dist/leader-line.min.js
pnpm test:bench # render pipeline benchmark (CDP LayoutCount), needs vite dev server on :5199
```
