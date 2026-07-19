import { fileURLToPath } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import { defsPlugin } from '../build/vite-plugin-defs.js';
import { debugStripPlugin } from '../build/vite-plugin-debug-strip.js';

// 仓库根(playground/ 的上一级),用于 defs 插件定位 symbols.html 与 css
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// GitHub Pages 以 /<repo>/ 子路径托管,asset 路径在构建期固化,故从 env 读入并显式回写
const baseURL = process.env.NUXT_APP_BASE_URL ?? '/';

export default defineNuxtConfig({
  // 开发测试站点,SPA 即可
  ssr: false,
  modules: ['@lionad/leader-line-nuxt'],
  // 模块级默认 options(dogfood vue-api 场景页)
  leaderLine: {
    defaults: { color: '#4a9eff', size: 2 }
  },
  app: {
    baseURL,
    head: {
      // 库的 [DEBUG] 代码依赖全局 traceLog(与 spec fixture 页面同款注入);
      // src 必须带 baseURL 前缀,绝对路径在子路径部署下会打到域根 404
      script: [{ src: `${baseURL}traceLog.js` }]
    }
  },
  vite: {
    resolve: {
      alias: {
        // 库源码直引:改 src/ 即时 HMR
        'leader-line': fileURLToPath(new URL('../src/leader-line.js', import.meta.url)),
        // plain-draggable 直引其 ESM 构建,绕开 optimizeDeps 缓存(504 Outdated Optimize Dep)
        'plain-draggable': fileURLToPath(
          new URL('./node_modules/plain-draggable/plain-draggable.esm.js', import.meta.url))
      }
    },
    plugins: [
      // 复用构建插件链:virtual defs 模块 + [DEBUG] 保留(开发模式)
      defsPlugin({ root: repoRoot }),
      debugStripPlugin({ strip: false })
    ]
  }
});
