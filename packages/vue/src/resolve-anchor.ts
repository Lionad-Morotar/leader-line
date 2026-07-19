import { toRaw, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type LeaderLine from '@lionad/leader-line';

/**
 * 锚点解析(纯逻辑,node 可测)。
 * 把 Vue 世界的各种输入形态统一解析为 leader-line 接受的 Element | attachment。
 * 解析失败返回 null 而非抛错:锚点常因 v-if/v-for 延迟挂载,由上层 watch 重试。
 */

export type AnchorValue = Element | LeaderLine.LeaderLineAttachment;

/** 组件公共实例的最小特征(避免引入 @vue/runtime-core 类型链) */
export interface ComponentInstanceLike {
  $el: unknown;
}

export type AnchorInput =
  | AnchorValue
  | string
  | ComponentInstanceLike
  | null
  | undefined;

export type MaybeAnchor = MaybeRefOrGetter<AnchorInput>;

/** attachment 特征:库实例/锚点工厂产物都有数值 _id 与 isRemoved 标记 */
export const isAttachment = (v: unknown): v is LeaderLine.LeaderLineAttachment =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as LeaderLine.LeaderLineAttachment)._id === 'number' &&
  typeof (v as LeaderLine.LeaderLineAttachment).isRemoved === 'boolean' &&
  typeof (v as LeaderLine.LeaderLineAttachment).remove === 'function';

/**
 * Element 用 nodeType 鸭子类型而非 instanceof:
 * node 测试环境无 Element 全局,SSR 场景同代码路径也不应炸。
 */
export const isElement = (v: unknown): v is Element =>
  typeof v === 'object' && v !== null && (v as Node).nodeType === 1;

const isComponentInstance = (v: unknown): v is ComponentInstanceLike =>
  typeof v === 'object' && v !== null && '$el' in v;

/**
 * 解析优先级:attachment > Element > selector > 组件实例 $el。
 * attachment 先于 Element:attachment 是库自产对象,特征明确无歧义。
 */
export function resolveAnchor(input: MaybeAnchor): AnchorValue | null {
  // toRaw:ref(reactive 对象)读出的是 reactive 代理,DOM 身份比较(如 preventSame 去重)会失效
  const v = toRaw(toValue(input));
  if (v == null) return null;
  if (isAttachment(v)) return v;
  if (isElement(v)) return v;
  if (typeof v === 'string') {
    // SSR 无 document,直接判负;选择器未命中同样返回 null 交给上层重试
    if (typeof document === 'undefined') return null;
    return document.querySelector(v);
  }
  if (isComponentInstance(v)) return isElement(v.$el) ? v.$el : null;
  return null;
}
