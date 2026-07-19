<template>
  <!-- vue-api 场景:@lionad/leader-line-nuxt 模块的三类声明式用法 dogfood -->
  <main class="demo-page">
    <h1>vue-api</h1>
    <p>composable / 组件 / 数组 / 拖拽建连——零 import,全部来自模块 auto-import</p>

    <!-- 场景 A:useLeaderLine 单线 + options 深度响应 -->
    <section class="scene">
      <h2>A · useLeaderLine(颜色响应)</h2>
      <div class="stage">
        <div ref="elA" class="anchor" style="left: 40px; top: 60px">A</div>
        <div ref="elB" class="anchor" style="left: 320px; top: 200px">B</div>
      </div>
      <p class="controls">
        <label>
          线色
          <input v-model="colorA" type="color" data-testid="color-a" />
        </label>
        <span class="hint">当前 {{ colorA }}(改色即 setOptions,不重建)</span>
      </p>
    </section>

    <!-- 场景 B:&lt;LeaderLine&gt; 组件 + useLeaderLines 数组 keyed diff -->
    <section class="scene">
      <h2>B · 组件 + 数组连线(当前 {{ edgeCount }} 条)</h2>
      <div class="stage">
        <div ref="hub" class="anchor hub" style="left: 40px; top: 130px">HUB</div>
        <div ref="node1" class="anchor" style="left: 340px; top: 30px">N1</div>
        <div ref="node2" class="anchor" style="left: 340px; top: 130px">N2</div>
        <div ref="node3" class="anchor" style="left: 340px; top: 230px">N3</div>
        <!-- 组件糖:一条固定线,options 用扁平 props -->
        <LeaderLine v-if="fixedLineOn" :start="hub" :end="node3" color="indianred" end-plug="arrow2" :dash="true" />
      </div>
      <p class="controls">
        <label v-for="n in ['node1', 'node2']" :key="n">
          <input v-model="edgeOn[n]" type="checkbox" :data-testid="`edge-${n}`" />
          HUB→{{ n }}
        </label>
        <label>
          <input v-model="fixedLineOn" type="checkbox" data-testid="edge-fixed" />
          组件线 HUB→N3
        </label>
      </p>
    </section>

    <!-- 场景 C:useDragConnect 拖拽建连(字段映射形态) -->
    <section class="scene">
      <h2>C · 拖拽建连</h2>
      <p class="hint">从左侧任一字段按住拖向右列字段;相同连线自动去重(preventSame)</p>
      <div class="mapping">
        <ul class="col">
          <li
            v-for="f in sourceFields"
            :key="f"
            :ref="el => (srcEls[f] = el as Element | null)"
            class="field"
            :data-testid="`src-${f}`"
            @mousedown="startConnect($event, srcEls[f], { from: f })"
          >
            {{ f }}
          </li>
        </ul>
        <ul class="col">
          <li v-for="f in targetFields" :key="f" class="field field-node" :data-testid="`dst-${f}`">
            {{ f }}
          </li>
        </ul>
      </div>
      <p class="controls">
        <span data-testid="conn-count">已建连线 {{ connCount }}</span>
        <button data-testid="clear-conns" @click="clearConns">清空</button>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef } from 'vue';

// ---- 场景 A:单线 + 深度响应 ----
const elA = useTemplateRef('elA');
const elB = useTemplateRef('elB');
const colorA = ref('#ff7f50');
useLeaderLine(elA, elB, { color: colorA, endPlug: 'arrow2', path: 'fluid' });

// ---- 场景 B:组件 + 数组 ----
const hub = useTemplateRef('hub');
const node1 = useTemplateRef('node1');
const node2 = useTemplateRef('node2');
const node3 = useTemplateRef('node3');
const edgeOn = reactive<Record<string, boolean>>({ node1: true, node2: false });
const fixedLineOn = ref(true);

const nodeRefs = { node1, node2 } as const;
const edges = computed(() =>
  (['node1', 'node2'] as const)
    .filter(n => edgeOn[n])
    .map(n => ({
      key: `hub→${n}`,
      start: hub,
      end: nodeRefs[n],
      endPlug: 'arrow1' as const
    }))
);
const { size: edgeCount } = useLeaderLines(edges);

// ---- 场景 C:拖拽建连 ----
const sourceFields = ['id', 'name', 'email'];
const targetFields = ['user_id', 'user_name', 'contact'];
// 源字段元素经内联函数 ref 收集(v-for 场景的模板 ref 形态)
const srcEls = reactive<Record<string, Element | null>>({});
const { startConnect, size: connCount, removeWhere } = useDragConnect({
  validTarget: '.field-node',
  preventSame: true,
  lineOptions: { color: 'steelblue', endPlug: 'arrow2' }
});
function clearConns() {
  removeWhere(() => true);
}
</script>

<style scoped>
.demo-page { font-family: system-ui, sans-serif; padding: 20px; max-width: 720px; }
.scene { margin-top: 28px; }
.scene h2 { font-size: 16px; margin-bottom: 8px; }
.stage { position: relative; width: 560px; height: 300px; border: 1px dashed #ccc; border-radius: 8px; }
.anchor {
  position: absolute; width: 80px; height: 40px;
  background: rgba(150, 255, 127, 0.5); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-weight: 600;
}
.anchor.hub { background: rgba(74, 158, 255, 0.4); }
.controls { display: flex; gap: 16px; align-items: center; margin-top: 12px; }
.hint { color: #777; font-size: 13px; }
.mapping { display: flex; gap: 160px; }
.col { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.field {
  width: 120px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px;
  background: #fff; cursor: grab; user-select: none;
}
.field-node { background: #f6f9ff; border-color: #9ec2ff; cursor: default; }
button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
</style>
