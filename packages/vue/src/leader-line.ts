import { defineComponent, watch } from 'vue';
import type { PropType } from 'vue';
import type LeaderLine from '@lionad/leader-line';
import { useLeaderLine, type LeaderLineVueOptions } from './use-leader-line';
import type { MaybeAnchor } from './resolve-anchor';

/**
 * <LeaderLine> —— useLeaderLine 的声明式组件糖。
 * 自身无 DOM(渲染 null),线画在库的 SVG 覆盖层;模板里写 kebab-case(end-plug)
 * Vue 自动映射到 camelCase props。v-for 场景直接吃 Vue 的 key 协调,零额外成本。
 */

const anchorProp = {
  // Element/attachment/组件实例(Object)、selector(String)、getter(Function)、ref(Object)
  type: [String, Object, Function] as PropType<MaybeAnchor>,
  default: null
};
/** 三态 Boolean:需要区分"未传"与 false,default undefined 保证未传不透传 */
const triBoolean = { type: Boolean as PropType<boolean>, default: undefined };
const anyProp = <T>(defaultValue: T | undefined = undefined) => ({
  type: null as unknown as PropType<T>,
  default: defaultValue
});

/** 除 start/end/watchOptions 外全部 options props(收集后透传 setOptions) */
const OPTION_KEYS = [
  'path',
  'color',
  'size',
  'lineColor',
  'lineSize',
  'startPlug',
  'endPlug',
  'plugSE',
  'plugColorSE',
  'plugSizeSE',
  'startPlugColor',
  'endPlugColor',
  'startPlugSize',
  'endPlugSize',
  'outline',
  'outlineColor',
  'outlineSize',
  'lineOutlineEnabled',
  'lineOutlineColor',
  'lineOutlineSize',
  'startPlugOutline',
  'endPlugOutline',
  'startPlugOutlineColor',
  'endPlugOutlineColor',
  'startPlugOutlineSize',
  'endPlugOutlineSize',
  'plugOutlineEnabledSE',
  'plugOutlineColorSE',
  'plugOutlineSizeSE',
  'socketSE',
  'socketGravitySE',
  'startSocketGravity',
  'endSocketGravity',
  'startLabel',
  'endLabel',
  'middleLabel',
  'dash',
  'gradient',
  'dropShadow',
  'showEffectName',
  'show_animOptions',
  'svgContainer'
] as const;

type OptionKey = (typeof OPTION_KEYS)[number];

export const LeaderLineComponent = defineComponent({
  name: 'LeaderLine',
  props: {
    start: anchorProp,
    end: anchorProp,
    path: String as PropType<LeaderLine.PathType>,
    color: String,
    size: Number,
    lineColor: String,
    lineSize: Number,
    startPlug: String as PropType<LeaderLine.PlugType>,
    endPlug: String as PropType<LeaderLine.PlugType>,
    plugSE: Array as unknown as PropType<[LeaderLine.PlugType, LeaderLine.PlugType]>,
    plugColorSE: Array as unknown as PropType<[string, string]>,
    plugSizeSE: Array as unknown as PropType<[number, number]>,
    startPlugColor: String,
    endPlugColor: String,
    startPlugSize: Number,
    endPlugSize: Number,
    outline: triBoolean,
    outlineColor: String,
    outlineSize: Number,
    lineOutlineEnabled: triBoolean,
    lineOutlineColor: String,
    lineOutlineSize: Number,
    startPlugOutline: triBoolean,
    endPlugOutline: triBoolean,
    startPlugOutlineColor: String,
    endPlugOutlineColor: String,
    startPlugOutlineSize: Number,
    endPlugOutlineSize: Number,
    plugOutlineEnabledSE: Array as unknown as PropType<[boolean, boolean]>,
    plugOutlineColorSE: Array as unknown as PropType<[string, string]>,
    plugOutlineSizeSE: Array as unknown as PropType<[number, number]>,
    socketSE: Array as unknown as PropType<[LeaderLine.SocketType, LeaderLine.SocketType]>,
    socketGravitySE: Array as unknown as PropType<
      [LeaderLine.SocketGravity, LeaderLine.SocketGravity]
    >,
    startSocketGravity: anyProp<LeaderLine.SocketGravity>(),
    endSocketGravity: anyProp<LeaderLine.SocketGravity>(),
    startLabel: anyProp<LeaderLine.LeaderLineAttachment>(),
    endLabel: anyProp<LeaderLine.LeaderLineAttachment>(),
    middleLabel: anyProp<LeaderLine.LeaderLineAttachment>(),
    dash: anyProp<boolean | LeaderLine.DashOptions>(),
    gradient: anyProp<boolean | LeaderLine.GradientOptions>(),
    dropShadow: anyProp<boolean | LeaderLine.DropShadowOptions>(),
    showEffectName: String as PropType<LeaderLine.ShowEffectName>,
    show_animOptions: Object as PropType<LeaderLine.AnimOptions>,
    svgContainer: anyProp<Element | null>(),
    /** 关闭 props → setOptions 的自动响应 */
    watchOptions: triBoolean
  },
  setup(props, { expose }) {
    /** 收集非空 options props;null/undefined 不透传(与 resolveOptions 同语义) */
    const collect = (): LeaderLineVueOptions => {
      const out: Record<string, unknown> = {};
      for (const k of OPTION_KEYS) {
        const v = props[k as OptionKey];
        if (v !== undefined && v !== null) out[k] = v;
      }
      return out as LeaderLineVueOptions;
    };

    // options 的响应由组件自己管(watchOptions:false 关闭 composable 内置链路,避免双管)
    const ll = useLeaderLine(
      // getter 返回 MaybeAnchor(嵌套形态)由 MaybeAnchor 递归类型与 resolveAnchor 循环解包兜住
      () => props.start,
      () => props.end,
      collect(),
      { watchOptions: false }
    );

    if (props.watchOptions !== false) {
      // 数组源只列 props 键路径,props 本身是 reactive,键变化即触发
      watch(
        () => OPTION_KEYS.map(k => props[k as OptionKey]),
        () => ll.setOptions(collect()),
        { deep: true }
      );
      // 锚点延迟就绪的场景:线创建时用 setup 快照,就绪后补一轮最新 options
      watch(
        () => ll.isReady.value,
        ready => {
          if (ready) ll.setOptions(collect());
        }
      );
    }

    expose({
      line: ll.line,
      isReady: ll.isReady,
      setOptions: ll.setOptions,
      position: ll.position,
      requestPosition: ll.requestPosition,
      show: ll.show,
      hide: ll.hide,
      remove: ll.remove
    });

    // 无 DOM:线的 SVG 由库托管在覆盖层
    return () => null;
  }
});
