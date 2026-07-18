<template>
  <!-- grid-cases:PATH_GRID 折线形态查看器(@EXPORT 函数 eval + testCases 驱动) -->
  <main class="demo-page">
    <h1>grid-cases</h1>
    <p>PATH_GRID 路径函数形态:socket 方向 × socketGravity 组合</p>

    <p class="controls">
      <select v-model="selectedTitle" data-testid="case-select">
        <option v-for="tc in testCases" :key="tc.title" :value="tc.title">{{ tc.title }}</option>
      </select>
    </p>

    <svg class="grid-view" viewBox="0 0 320 280">
      <circle v-for="(p, i) in currentSockets" :key="i" :cx="p.x" :cy="p.y" r="5"
        :fill="i === 0 ? '#4a9eff' : '#ff6b6b'" />
      <path v-if="pathD" :d="pathD" fill="none" stroke="coral" stroke-width="4" />
    </svg>

    <pre class="path-data">{{ pathDataText }}</pre>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getExportedFuncSource } from '../../../../test/exported-funcs.js';
import testCasesJson from '../../../../test/func-PATH_GRID/testCases.json.js';

interface SocketXY { x: number; y: number; socketId: number }
interface TestCase {
  title: string;
  args: { socketXYSE: SocketXY[]; socketGravitySE: unknown[] };
  expected: { pathList: Array<Array<{ x: number; y: number }>> };
}

const testCases = testCasesJson as TestCase[];
const selectedTitle = ref(testCases[0]?.title ?? '');

// PATH_GRID 函数的闭包上下文(与 test/spec/func-PATH_GRID.js 同构)
const SOCKET_TOP = 1, SOCKET_RIGHT = 2, SOCKET_BOTTOM = 3, SOCKET_LEFT = 4;
void SOCKET_TOP; void SOCKET_RIGHT; void SOCKET_BOTTOM; void SOCKET_LEFT;
const PATH_STRAIGHT = 1, PATH_ARC = 2, PATH_FLUID = 3, PATH_MAGNET = 4, PATH_GRID = 5;
void PATH_STRAIGHT; void PATH_ARC; void PATH_FLUID; void PATH_MAGNET; void PATH_GRID;
const MIN_GRAVITY = 80, MIN_GRAVITY_SIZE = 4, MIN_GRAVITY_R = 5,
  MIN_OH_GRAVITY = 120, MIN_OH_GRAVITY_OH = 8, MIN_OH_GRAVITY_R = 3.75,
  MIN_ADJUST_LEN = 10, MIN_GRID_LEN = 30;
void MIN_GRAVITY; void MIN_GRAVITY_SIZE; void MIN_GRAVITY_R;
void MIN_OH_GRAVITY; void MIN_OH_GRAVITY_OH; void MIN_OH_GRAVITY_R; void MIN_ADJUST_LEN; void MIN_GRID_LEN;

let curSocketXYSE: SocketXY[], curSocketGravitySE: unknown[], pathList: Array<Array<{ x: number; y: number }>>;
function socketXY2Point(socketXY: SocketXY) { return { x: socketXY.x, y: socketXY.y }; }
void socketXY2Point;

// eslint 环境内的 eval 上下文与 spec 一致:常量与状态经 var/函数声明提升进入 eval 作用域
const func: () => void = (() => {
  const source = getExportedFuncSource('PATH_GRID');
  // 在模块作用域 eval,函数体读取上述上下文变量
  return new Function(
    'curSocketXYSE', 'curSocketGravitySE', 'pathList', 'socketXY2Point',
    'SOCKET_TOP', 'SOCKET_RIGHT', 'SOCKET_BOTTOM', 'SOCKET_LEFT',
    'PATH_STRAIGHT', 'PATH_ARC', 'PATH_FLUID', 'PATH_MAGNET', 'PATH_GRID',
    'MIN_GRAVITY', 'MIN_GRAVITY_SIZE', 'MIN_GRAVITY_R',
    'MIN_OH_GRAVITY', 'MIN_OH_GRAVITY_OH', 'MIN_OH_GRAVITY_R',
    'MIN_ADJUST_LEN', 'MIN_GRID_LEN',
    `return (${source})`
  )();
})();

const current = computed(() => testCases.find(tc => tc.title === selectedTitle.value) ?? testCases[0]);

const result = computed(() => {
  const tc = current.value;
  if (!tc) { return { sockets: [], path: [] as Array<Array<{ x: number; y: number }>> }; }
  curSocketXYSE = tc.args.socketXYSE.map(s => ({ ...s }));
  curSocketGravitySE = tc.args.socketGravitySE.slice();
  pathList = [];
  // 与 spec 相同:以显式参数注入上下文调用提取函数
  (func as unknown as (a: unknown, b: unknown, c: unknown, d: unknown) => void)(
    curSocketXYSE, curSocketGravitySE, pathList, socketXY2Point);
  return { sockets: curSocketXYSE, path: pathList };
});

const currentSockets = computed(() => result.value.sockets);

const pathD = computed(() => {
  const segs = result.value.path;
  if (!segs.length) { return ''; }
  return segs.map((seg, i) =>
    (i === 0 ? 'M' : 'L') + seg.map(p => `${p.x} ${p.y}`).join(' L')).join(' ');
});

const pathDataText = computed(() => JSON.stringify(result.value.path, null, 1));
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.grid-view { width: 480px; height: 420px; border: 1px dashed #ccc; border-radius: 8px; background: #fafafa; }
.path-data { font-size: 11px; color: #666; max-height: 200px; overflow: auto; }
</style>
