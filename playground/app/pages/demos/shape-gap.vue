<template>
  <!-- shape-gap:plug 符号形态与 SHAPE_GAP 标注 -->
  <main class="demo-page">
    <h1>shape-gap</h1>
    <p>各 plug 符号渲染形态与几何参数(SYMBOLS 的 bBox/bCircle/overhead)</p>

    <div class="plug-grid">
      <section v-for="plug in plugTypes" :key="plug" class="plug-cell">
        <div class="cell-stage" :ref="el => registerCell(plug, el as HTMLElement)">
          <div class="anchor a0"></div>
          <div class="anchor a1"></div>
        </div>
        <h4>{{ plug }}</h4>
        <pre>{{ symbolInfo(plug) }}</pre>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import LeaderLine from 'leader-line';

const plugTypes = ['disc', 'square', 'arrow1', 'arrow2', 'arrow3', 'hand', 'crosshair'] as const;

const cells = new Map<string, HTMLElement>();
const lines: InstanceType<typeof LeaderLine>[] = [];
let symbols: Record<string, { bCircle: number; overhead: number; sideLen: number; backLen: number }> = {};

function registerCell(plug: string, el: HTMLElement | null) {
  if (el) { cells.set(plug, el); }
}

function symbolInfo(plug: string) {
  const s = symbols[plug];
  if (!s) { return ''; }
  return `bCircle:${s.bCircle} overhead:${s.overhead}\nsideLen:${s.sideLen} backLen:${s.backLen}`;
}

onMounted(() => {
  // window.SYMBOLS 由 [DEBUG] 暴露(开发模式保留)
  symbols = (window as unknown as { SYMBOLS: typeof symbols }).SYMBOLS;
  plugTypes.forEach(plug => {
    const cell = cells.get(plug);
    if (!cell) { return; }
    const [a0, a1] = [cell.querySelector('.a0'), cell.querySelector('.a1')];
    lines.push(new LeaderLine(a0 as HTMLElement, a1 as HTMLElement,
      { startPlug: 'behind', endPlug: plug, path: 'straight', size: 4 } as never));
  });
});

onBeforeUnmount(() => {
  lines.forEach(l => l.remove());
  lines.length = 0;
});
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.plug-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.cell-stage { position: relative; height: 140px; border: 1px dashed #ddd; border-radius: 8px; }
.anchor {
  position: absolute; width: 36px; height: 36px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
}
.a0 { left: 16px; top: 52px; }
.a1 { right: 16px; top: 52px; }
pre { font-size: 11px; color: #666; margin: 4px 0 0; }
h4 { margin: 6px 0 0; }
</style>
