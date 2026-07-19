import { defineConfig } from 'vite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defsPlugin } from './build/vite-plugin-defs.js';
import { debugStripPlugin } from './build/vite-plugin-debug-strip.js';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const banner = `/*! ${pkg.title || pkg.name} v${pkg.version} (c) ${pkg.author.name} ${pkg.homepage} */`;

export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production')
  },
  plugins: [
    defsPlugin(),
    // 仅生产构建剥除 [DEBUG];dev server(development)与 vitest(test)均保留 window.* 调试句柄
    debugStripPlugin({ strip: mode === 'production' })
  ],
  build: {
    target: 'es2020', // 2.0 起不再支持 IE11/旧 Edge(README 迁移指南)
    lib: {
      entry: 'src/leader-line.js',
      name: 'LeaderLine',
      formats: ['es', 'cjs', 'iife'],
      fileName: (format) => ({
        es: 'leader-line.mjs',
        cjs: 'leader-line.cjs',
        iife: 'leader-line.min.js'
      })[format]
    },
    sourcemap: true,
    minify: mode !== 'development',
    outDir: 'dist',
    rollupOptions: {
      output: { banner }
    }
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.js', 'packages/*/src/**/*.test.ts']
        }
      },
      {
        plugins: [defsPlugin()],
        resolve: {
          alias: {
            // packages/vue 测试直引库源码:与 playground 同策略,免构建、改 src 即时生效
            '@lionad/leader-line': fileURLToPath(new URL('./src/leader-line.js', import.meta.url))
          }
        },
        test: {
          name: 'browser',
          globals: true,
          include: ['test/spec/*.js', 'packages/*/test/browser/**/*.test.ts'],
          setupFiles: ['test/setup-browser.js'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
}));
