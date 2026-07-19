import { inject, provide } from 'vue';
import type { InjectionKey } from 'vue';
import type { LeaderLineVueOptions } from './use-leader-line';

/**
 * 默认 options 的 provide/inject 通道。
 * Nuxt 模块插件(应用级)与用户手动 provide(祖先组件)共用同一注入键;
 * 合并优先级:调用处 options > 注入默认 > 库默认。
 * 注意 Vue 语义:inject 读的是父级 provides——同一组件内 provide 对本组件 inject
 * 不可见,必须在祖先组件或 app.provide 层提供。
 */

export const LEADER_LINE_DEFAULTS: InjectionKey<LeaderLineVueOptions> = Symbol(
  'leader-line-defaults'
);

/** 应用或子树根节点调用,为整棵子树提供默认 options */
export function provideLeaderLineDefaults(defaults: LeaderLineVueOptions): void {
  provide(LEADER_LINE_DEFAULTS, defaults);
}

/** composable 内部读取;未注入时为空对象(零成本缺省) */
export function injectLeaderLineDefaults(): LeaderLineVueOptions {
  return inject(LEADER_LINE_DEFAULTS, {});
}
