// ESLint 9 flat config
// 策略:新代码(src/update-scheduler.js、build/、vite.config.js、test 基建)全量规则;
// 遗留运行库(src/leader-line.js、src/anim.js、polyfill)只抓真实缺陷,不管风格
import js from '@eslint/js';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  traceLog: 'readonly',
  Node: 'readonly',
  Element: 'readonly',
  SVGElement: 'readonly',
  SVGPathElement: 'readonly',
  SVGLength: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  performance: 'readonly'
};

export default [
  {
    ignores: [
      'dist/**',
      'packages/*/dist/**', // packages 构建产物
      'node_modules/**',
      'packages/*/node_modules/**',
      '.context/**',
      'src/anim-event/**', // vendored 第三方,保持原样
      '**/__screenshots__/**', // vitest browser 失败截图
      'test/func-PATH_GRID/**/*.json.js', // 生成数据
      'playground/.nuxt/**', // nuxt 构建产物
      'playground/.output/**',
      'playground/node_modules/**',
      'playground/public/traceLog.js' // test/ 的 classic script 副本,由源文件 lint
      // playground 的 .vue/.ts 由 nuxi typecheck(vue-tsc)兜底,eslint 只管 .js
      // packages 的 .ts 由 tsgo 兜底,本仓未引 typescript-eslint
    ]
  },
  js.configs.recommended,
  {
    files: ['src/update-scheduler.js', 'build/**/*.js', 'vite.config.js', 'scripts/**/*.mjs',
      'test/setup-browser.js', 'test/exported-funcs.js', 'test/smoke/**/*.mjs', 'test/perf/**/*.mjs',
      'test/unit/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...browserGlobals, process: 'readonly', Buffer: 'readonly', __dirname: 'readonly',
        globalThis: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', AbortController: 'readonly' }
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-console': 'off'
    }
  },
  {
    // 测试基建 classic script(IIFE 挂全局)
    files: ['test/util.js', 'test/traceLog.js', 'test/guide-view.js', 'test/function-test/**/*.js',
      'test/**/test.js', 'test/mask/cases.js', 'test/func-PATH_GRID/cases.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...browserGlobals,
        LeaderLine: 'readonly',
        PlainDraggable: 'readonly',
        anim: 'readonly',
        traceLog: 'writable',
        testCases: 'writable'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-useless-escape': 'off',
      'no-prototype-builtins': 'off',
      'no-cond-assign': 'off',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error'
    }
  },
  {
    // 遗留运行库:只抓真实缺陷(变量/语法层面),不管历史风格
    files: ['src/leader-line.js', 'src/anim.js', 'src/path-data-polyfill/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-useless-escape': 'off',
      'no-prototype-builtins': 'off',
      'no-underscore-dangle': 'off',
      'no-cond-assign': 'off',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',
      'no-fallthrough': 'off',
      'no-constant-condition': 'off'
    }
  },
  {
    // 迁移的 jasmine spec(旧风格 var/函数表达式)
    files: ['test/spec/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...browserGlobals,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        loadPage: 'readonly',
        loadPageAsync: 'readonly',
        jasmine: 'readonly',
        customMatchers: 'readonly',
        testCases: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-eval': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-useless-escape': 'off',
      'no-prototype-builtins': 'off',
      'no-underscore-dangle': 'off',
      'no-cond-assign': 'off',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error'
    }
  }
];
