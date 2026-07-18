<template>
  <!-- mask:outline/mask 渲染形态 case 排列 -->
  <main class="demo-page">
    <h1>mask</h1>
    <p>outline/mask 渲染形态:基础 → 粗线 → outline → 彩色 outline → 端点 outline</p>

    <div class="cases">
      <section v-for="tc in testCases" :key="tc.title" class="case">
        <h3>{{ tc.title }}</h3>
        <div class="ll-view" :ref="el => registerView(tc.title, el as HTMLElement)">
          <div class="anchor anchor-0"></div>
          <div class="anchor anchor-1"></div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import LeaderLine from 'leader-line';

interface TestCase {
  title: string;
  options: Record<string, unknown>;
}

const testCases: TestCase[] = [
  { title: '1-1 基础', options: {} },
  { title: '1-2 粗线 size:12', options: { size: 12 } },
  { title: '1-3 outline', options: { outline: true } },
  { title: '1-4 蓝色 outline', options: { size: 12, outline: true, outlineColor: 'blue' } },
  { title: '1-5 端点 outline', options: { size: 12, outline: true, outlineColor: 'blue', endPlugOutline: true } }
];

const views = new Map<string, HTMLElement>();
const lines: InstanceType<typeof LeaderLine>[] = [];

function registerView(title: string, el: HTMLElement | null) {
  if (el) { views.set(title, el); }
}

onMounted(() => {
  testCases.forEach(tc => {
    const view = views.get(tc.title);
    if (!view) { return; }
    const [a0, a1] = [view.querySelector('.anchor-0'), view.querySelector('.anchor-1')];
    lines.push(new LeaderLine(a0 as HTMLElement, a1 as HTMLElement, tc.options as never));
  });
});

onBeforeUnmount(() => {
  lines.forEach(l => l.remove());
  lines.length = 0;
});
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; }
.cases { display: flex; flex-wrap: wrap; gap: 20px; }
.ll-view { position: relative; width: 320px; height: 320px; border: 1px dashed #ddd; border-radius: 8px; }
.anchor {
  position: absolute; width: 50px; height: 50px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
}
.anchor-0 { left: 20px; top: 50px; }
.anchor-1 { right: 20px; bottom: 50px; }
</style>
