/**
 * update-scheduler —— 渲染更新调度内核(深模块)。
 * 把"同帧内多次位置更新请求"合并为一次 rAF flush:
 * 先对所有实例执行 measure(布局读),再对所有实例执行 apply(DOM 写),
 * 使一帧内的强制同步 reflow 从 N 次降为不超过 1 次。
 */

/**
 * @param {Object} conf
 * @param {(cb: Function) => void} conf.raf - requestAnimationFrame 等价物
 * @param {(item: any) => void} conf.measure - 读阶段回调(仅允许布局读)
 * @param {(item: any) => void} conf.apply - 写阶段回调(仅允许 DOM 写与内存计算)
 * @returns {{schedule: (item: any) => void, size: number}}
 */
export function createScheduler(conf) {
  const dirty = new Set();
  let scheduled = false;

  function flush() {
    scheduled = false;
    // flush 期间新入队的任务留在 dirty 中,由下一轮 rAF 处理
    const items = [];
    dirty.forEach(item => {
      dirty.delete(item);
      items.push(item);
    });
    items.forEach(conf.measure);
    items.forEach(conf.apply);
  }

  return {
    schedule(item) {
      dirty.add(item);
      if (!scheduled) {
        scheduled = true;
        conf.raf(flush);
      }
    },
    get size() {
      return dirty.size;
    }
  };
}

export default createScheduler;
