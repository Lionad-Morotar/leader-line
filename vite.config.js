import { defineConfig } from 'vite';
import fs from 'node:fs';
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
    debugStripPlugin({ strip: mode !== 'development' })
  ],
  build: {
    lib: {
      entry: 'src/leader-line.js',
      name: 'LeaderLine',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'leader-line.mjs' : 'leader-line.min.js')
    },
    sourcemap: true,
    minify: mode !== 'development',
    outDir: 'dist',
    rollupOptions: {
      output: { banner }
    }
  },
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.js']
  }
}));
