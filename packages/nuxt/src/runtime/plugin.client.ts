import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app';
import { LEADER_LINE_DEFAULTS } from '@lionad/leader-line-vue';
import type { LeaderLineVueOptions } from '@lionad/leader-line-vue';

// client-only:把模块级默认 options provide 到应用根,composable 创建线时合入
export default defineNuxtPlugin({
  name: 'leader-line-defaults',
  setup(nuxtApp) {
    const config = useRuntimeConfig().public.leaderLine as
      | { defaults?: LeaderLineVueOptions }
      | undefined;
    nuxtApp.vueApp.provide(LEADER_LINE_DEFAULTS, config?.defaults ?? {});
  }
});
