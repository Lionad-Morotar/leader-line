<template>
  <!-- 场景索引:leader-line playground 全部 demo 场景导航 -->
  <main class="index-page">
    <h1>LeaderLine Playground</h1>
    <p class="hint">开发测试站点 · 库代码直引 <code>src/leader-line.js</code>(HMR 即时生效)</p>
    <p class="hint">文档见：https://anseki.github.io/leader-line/</p>
    <nav>
      <ul class="scene-list">
        <li v-for="scene in scenes" :key="scene.path">
          <NuxtLink :to="scene.path">
            <strong>{{ scene.title }}</strong>
            <span>{{ scene.desc }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </main>
</template>

<script setup lang="ts">
const scenes = [
  { path: '/demos/hello-line', title: 'hello-line', desc: '最小连线验证(库引用链路 tracer)' },
  { path: '/demos/attachment-label', title: 'attachment-label', desc: 'label 跟随 + 锚点拖拽' },
  { path: '/demos/bind-window', title: 'bindWindow', desc: '跨容器/滚动重绑定' },
  { path: '/demos/effect-show', title: 'effect-show', desc: 'show/hide 效果(none/fade/draw)' },
  { path: '/demos/mask', title: 'mask', desc: 'outline/mask 渲染形态' },
  { path: '/demos/reflow', title: 'reflow', desc: 'forceReflow 场景' },
  { path: '/demos/grid-cases', title: 'grid-cases', desc: 'PATH_GRID 折线形态' },
  { path: '/demos/shape-gap', title: 'shape-gap', desc: 'plug 符号形态与几何参数' },
  { path: '/vue-api', title: 'vue-api', desc: 'vue/nuxt 包:composable + 组件 + 数组 + 拖拽建连' },
  { path: '/bench', title: 'bench', desc: '渲染管线基准:sync vs defer 帧耗时' }
];
</script>

<style scoped>
.index-page { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; }
.hint { color: #666; }
.scene-list { list-style: none; padding: 0; display: grid; gap: 8px; }
.scene-list a { display: flex; gap: 12px; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; text-decoration: none; color: inherit; }
.scene-list a:hover { border-color: #4a9eff; }
.scene-list strong { min-width: 160px; }
.scene-list span { color: #777; font-size: 14px; }
</style>
