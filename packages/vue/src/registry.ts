/**
 * 连线注册表(纯逻辑,零 Vue/DOM 依赖,node 可测)。
 * 职责:keyed 存取、谓词查询、删除时负责调用 line.remove()。
 * 不做的事:创建线、diff 策略、锚点解析(都在 composable 层)。
 *
 * 查询能力刻意收敛为 get/findWhere/removeWhere 三个出口——
 * 历史项目按场景堆出的 removeXxx 系列最终大多成为死 API,
 * 谓词逃逸舱以同等表达力覆盖全部场景。
 */

/** 库实例的最小协议:注册表只依赖 remove,其余方法由 composable 使用 */
export interface LineHandle {
  remove(): void;
}

export interface RegistryEntry<L extends LineHandle = LineHandle, D = unknown> {
  key: string;
  line: L;
  data: D;
}

export type EntryPredicate<L extends LineHandle = LineHandle, D = unknown> = (
  entry: RegistryEntry<L, D>
) => boolean;

export function createLineRegistry<L extends LineHandle = LineHandle, D = unknown>() {
  const map = new Map<string, { line: L; data: D }>();

  const set = (key: string, line: L, data: D): void => {
    // 同 key 覆盖前先移除旧线:泄漏一条 SVG 线比报错更难排查
    if (map.has(key)) remove(key);
    map.set(key, { line, data });
  };

  const get = (key: string): RegistryEntry<L, D> | undefined => {
    const hit = map.get(key);
    return hit ? { key, line: hit.line, data: hit.data } : undefined;
  };

  const has = (key: string): boolean => map.has(key);

  const findWhere = (pred: EntryPredicate<L, D>): RegistryEntry<L, D>[] => {
    const out: RegistryEntry<L, D>[] = [];
    for (const [key, { line, data }] of map) {
      const entry = { key, line, data };
      if (pred(entry)) out.push(entry);
    }
    return out;
  };

  /** 删除单条:先出表再 remove,remove 内的副作用不会污染迭代 */
  const remove = (key: string): boolean => {
    const hit = map.get(key);
    if (!hit) return false;
    map.delete(key);
    hit.line.remove();
    return true;
  };

  const removeWhere = (pred: EntryPredicate<L, D>): number => {
    const victims = findWhere(pred);
    for (const { key } of victims) remove(key);
    return victims.length;
  };

  /** 清空:先快照 key 再逐条 remove,避免迭代中改 Map */
  const clear = (): void => {
    removeWhere(() => true);
  };

  return {
    get size() {
      return map.size;
    },
    set,
    get,
    has,
    findWhere,
    remove,
    removeWhere,
    clear
  };
}

export type LineRegistry<L extends LineHandle = LineHandle, D = unknown> = ReturnType<
  typeof createLineRegistry<L, D>
>;
