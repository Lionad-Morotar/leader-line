import { onMounted, onScopeDispose, shallowRef, toValue } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import LeaderLine from '@lionad/leader-line';
import { resolveAnchor, type MaybeAnchor } from './resolve-anchor';
import type { MaybeRefOptions } from './use-leader-line';

/**
 * useAttachment 系列 —— 库静态锚点/标签工厂的 scope 托管封装。
 * 核心问题:attachment 有独立 DOM 生命周期,不 remove 就会泄漏残留;
 * 这里统一 onMounted 创建、onScopeDispose 自动 remove。
 * 返回值是 ref,可直接作为 useLeaderLine 的 start/end 或 options.startLabel 等传入。
 */

type AttachmentFactory<O> = (options?: O) => LeaderLine.LeaderLineAttachment;

/** 解包 ref 字段;element 键额外经 resolveAnchor(允许传模板 ref/selector) */
function resolveAttachmentOptions<O extends object>(options: O): O {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(options)) {
    const value = toValue(v);
    if (value === undefined) continue;
    out[k] = k === 'element' ? resolveAnchor(value as MaybeAnchor) : value;
  }
  return out as O;
}

function makeUseAttachment<O extends object>(
  factory: AttachmentFactory<O>
): (options?: MaybeRefOptions<O>) => Readonly<Ref<LeaderLine.LeaderLineAttachment | null>> {
  return options => {
    // 类型层只读即可,不用 readonly() 运行时代理:库内部对 attachment 有写操作
    const attachment: ShallowRef<LeaderLine.LeaderLineAttachment | null> = shallowRef(null);
    onMounted(() => {
      attachment.value = factory(options ? resolveAttachmentOptions(options as O) : undefined);
    });
    onScopeDispose(() => {
      attachment.value?.remove();
      attachment.value = null;
    });
    return attachment;
  };
}

export const usePointAnchor = makeUseAttachment<LeaderLine.PointAnchorOptions>(
  LeaderLine.pointAnchor
);
export const useAreaAnchor = makeUseAttachment<LeaderLine.AreaAnchorOptions>(
  LeaderLine.areaAnchor
);
export const useMouseHoverAnchor = makeUseAttachment<LeaderLine.MouseHoverAnchorOptions>(
  LeaderLine.mouseHoverAnchor
);
export const useCaptionLabel = makeUseAttachment<LeaderLine.CaptionLabelOptions>(
  LeaderLine.captionLabel
);
export const usePathLabel = makeUseAttachment<LeaderLine.PathLabelOptions>(
  LeaderLine.pathLabel
);
