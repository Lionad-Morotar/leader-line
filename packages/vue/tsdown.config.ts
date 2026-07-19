import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // vue 与库本体都是 peer,不打进产物
  deps: { neverBundle: ['vue', '@lionad/leader-line'] },
  outExtensions: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  target: 'es2020',
  sourcemap: true,
  minify: false
});
