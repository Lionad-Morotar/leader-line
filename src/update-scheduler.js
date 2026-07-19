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
 * @param {(err: Error, item: any, phase: 'measure'|'apply') => void} [conf.onError]
 *   单实例异常隔离上报;缺省时 flush 末尾以 console.error 聚合上报。
 * @returns {{schedule: (item: any) => void, unschedule: (item: any) => void, size: number}}
 */
export function createScheduler(conf) {
  const dirty = new Set();
  let scheduled = false;

  function report(err, item, phase) {
    if (conf.onError) {
      conf.onError(err, item, phase);
    } else {
      console.error(`[leader-line] scheduled ${phase} failed:`, err);
    }
  }

  function flush() {
    scheduled = false;
    // flush 期间新入队的任务留在 dirty 中,由下一轮 rAF 处理
    const items = [];
    dirty.forEach(item => {
      dirty.delete(item);
      items.push(item);
    });
    const measureFailed = new Set();
    items.forEach(item => {
      try {
        conf.measure(item);
      } catch (err) {
        // 单实例失败不拖垮整批;该实例跳过 apply
        measureFailed.add(item);
        report(err, item, 'measure');
      }
    });
    items.forEach(item => {
      if (measureFailed.has(item)) { return; }
      try {
        conf.apply(item);
      } catch (err) {
        report(err, item, 'apply');
      }
    });
  }

  return {
    schedule(item) {
      dirty.add(item);
      if (!scheduled) {
        scheduled = true;
        conf.raf(flush);
      }
    },
    unschedule(item) {
      dirty.delete(item);
    },
    get size() {
      return dirty.size;
    }
  };
}

export default createScheduler;
