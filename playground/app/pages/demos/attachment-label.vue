<template>
  <!-- attachment-label:label 跟随 + 锚点拖拽(plain-draggable) -->
  <main class="demo-page">
    <h1>attachment-label</h1>
    <p>拖动右侧锚点,观察 label 跟随;切换 label 类型与连线形态</p>

    <p class="controls">
      <label>label:
        <select v-model="labelType" data-testid="label-type">
          <option value="captionLabel">captionLabel</option>
          <option value="pathLabel">pathLabel</option>
        </select>
      </label>
      <label>path:
        <select v-model="pathType" data-testid="path-type">
          <option value="straight">straight</option>
          <option value="arc">arc</option>
          <option value="fluid">fluid</option>
          <option value="magnet">magnet</option>
          <option value="grid">grid</option>
        </select>
      </label>
      <label><input v-model="defer" type="checkbox" data-testid="defer"> deferPositionUpdate</label>
    </p>

    <div class="stage">
      <div ref="anchor0Ref" class="anchor">anchor-0</div>
      <div ref="anchor1Ref" class="anchor draggable">anchor-1(可拖)</div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import LeaderLine from 'leader-line';
import PlainDraggable from 'plain-draggable';

const anchor0Ref = ref<HTMLElement>();
const anchor1Ref = ref<HTMLElement>();
const labelType = ref<'captionLabel' | 'pathLabel'>('captionLabel');
const pathType = ref<'straight' | 'arc' | 'fluid' | 'magnet' | 'grid'>('fluid');
const defer = ref(false);

let line: InstanceType<typeof LeaderLine> | null = null;
let draggable: InstanceType<typeof PlainDraggable> | null = null;

function labelOptions(type: string) {
  return type === 'pathLabel'
    ? {
        startLabel: LeaderLine.pathLabel({ text: '[startLabel]' }),
        endLabel: LeaderLine.pathLabel({ text: '[endLabel]' }),
        middleLabel: LeaderLine.pathLabel({ text: '[middleLabel]' })
      }
    : { startLabel: '[startLabel]', endLabel: '[endLabel]', middleLabel: '[middleLabel]' };
}

onMounted(() => {
  line = new LeaderLine(anchor0Ref.value!, anchor1Ref.value!, {
    color: 'rgba(255, 0, 0, 0.5)',
    endPlug: 'disc',
    path: pathType.value,
    ...labelOptions(labelType.value)
  });

  draggable = new PlainDraggable(anchor1Ref.value!, {
    onMove: () => { defer.value ? line?.requestPosition() : line?.position(); },
    zIndex: false
  });
});

watch(labelType, type => line?.setOptions(labelOptions(type)));
watch(pathType, type => { if (line) { line.path = type; } });
watch(defer, on => { LeaderLine.deferPositionUpdate = on; });

onBeforeUnmount(() => {
  draggable?.remove();
  line?.remove();
  LeaderLine.deferPositionUpdate = false;
});
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.controls { display: flex; gap: 16px; align-items: center; }
.stage { position: relative; width: 640px; height: 360px; border: 1px dashed #ccc; border-radius: 8px; overflow: hidden; }
.anchor {
  position: absolute; width: 100px; height: 40px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.anchor:first-child { left: 40px; top: 40px; }
.draggable { left: 420px; top: 220px; cursor: grab; background: rgba(127, 200, 255, 0.5); }
</style>
