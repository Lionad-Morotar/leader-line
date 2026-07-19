import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { LeaderLineVueOptions } from '@lionad/leader-line-vue';

/**
 * @lionad/leader-line-nuxt —— leader-line 的 Nuxt 接入模块。
 * 职责:auto-import 全部 composable、注册 <LeaderLine> 组件、
 * 经 client-only 插件把模块级默认 options provide 给整棵应用。
 * client-only 保证由 composable 内部的 SSR no-op 与插件的 .client 后缀共同构成。
 */

export interface ModuleOptions {
  /** <LeaderLine> 组件注册名;false 关闭组件注册 */
  componentName?: string | false;
  /**
   * 全局默认线 options(需可 JSON 序列化——经 runtimeConfig 随 payload 传输;
   * Element/函数类值请在调用处传)
   */
  defaults?: LeaderLineVueOptions;
}

const COMPOSABLES = [
  'useLeaderLine',
  'useLeaderLines',
  'useDragConnect',
  'usePointAnchor',
  'useAreaAnchor',
  'useMouseHoverAnchor',
  'useCaptionLabel',
  'usePathLabel',
  'provideLeaderLineDefaults'
] as const;

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@lionad/leader-line-nuxt',
    configKey: 'leaderLine'
  },
  defaults: {
    componentName: 'LeaderLine',
    defaults: {}
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    addImports(COMPOSABLES.map(name => ({ name, from: '@lionad/leader-line-vue' })));

    if (options.componentName !== false) {
      addComponent({
        name: options.componentName ?? 'LeaderLine',
        export: 'LeaderLine',
        filePath: '@lionad/leader-line-vue'
      });
    }

    // 默认值走 public runtimeConfig 序列化到客户端,plugin.client 读取后 provide
    nuxt.options.runtimeConfig.public.leaderLine = { defaults: options.defaults ?? {} };
    addPlugin({ src: resolver.resolve('./runtime/plugin.client'), mode: 'client' });
  }
});
