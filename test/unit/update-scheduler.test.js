// update-scheduler 行为测试:dirty set + rAF 两阶段 flush(measure 全部先于 apply)
import { describe, it, expect } from 'vitest';
import { createScheduler } from '../../src/update-scheduler.js';

function createRafQueue() {
  const queue = [];
  return {
    raf: cb => queue.push(cb),
    flushNext() { queue.splice(0).forEach(cb => cb()); },
    pendingCount() { return queue.length; }
  };
}

describe('update-scheduler', () => {
  it('defers work to the next animation frame', () => {
    const rafQ = createRafQueue();
    const applied = [];
    const scheduler = createScheduler({ raf: rafQ.raf, measure: i => applied.push(['m', i]), apply: i => applied.push(['a', i]) });

    scheduler.schedule('line-1');
    expect(applied).toEqual([]); // 同步不执行
    expect(rafQ.pendingCount()).toBe(1);

    rafQ.flushNext();
    expect(applied).toEqual([['m', 'line-1'], ['a', 'line-1']]);
  });

  it('dedupes repeated schedules of the same item within a frame', () => {
    const rafQ = createRafQueue();
    const applied = [];
    const scheduler = createScheduler({ raf: rafQ.raf, measure: i => applied.push(['m', i]), apply: i => applied.push(['a', i]) });

    scheduler.schedule('line-1');
    scheduler.schedule('line-1');
    scheduler.schedule('line-1');
    rafQ.flushNext();
    expect(applied).toEqual([['m', 'line-1'], ['a', 'line-1']]);
  });

  it('runs all measures before any apply (read/write separation)', () => {
    const rafQ = createRafQueue();
    const order = [];
    const scheduler = createScheduler({
      raf: rafQ.raf,
      measure: i => order.push(`measure-${i}`),
      apply: i => order.push(`apply-${i}`)
    });

    scheduler.schedule('A');
    scheduler.schedule('B');
    scheduler.schedule('C');
    rafQ.flushNext();
    expect(order).toEqual([
      'measure-A', 'measure-B', 'measure-C',
      'apply-A', 'apply-B', 'apply-C'
    ]);
  });

  it('reschedules work enqueued during flush to a later frame', () => {
    const rafQ = createRafQueue();
    const applied = [];
    const scheduler = createScheduler({
      raf: rafQ.raf,
      measure: i => applied.push(['m', i]),
      apply: i => {
        applied.push(['a', i]);
        if (i === 'A') { scheduler.schedule('B'); } // flush 中产生新任务
      }
    });

    scheduler.schedule('A');
    rafQ.flushNext(); // frame 1: A 执行,B 入队
    expect(applied).toEqual([['m', 'A'], ['a', 'A']]);
    expect(rafQ.pendingCount()).toBe(1);

    rafQ.flushNext(); // frame 2: B 执行
    expect(applied).toEqual([['m', 'A'], ['a', 'A'], ['m', 'B'], ['a', 'B']]);
  });

  it('exposes pending size for diagnostics', () => {
    const rafQ = createRafQueue();
    const scheduler = createScheduler({ raf: rafQ.raf, measure: () => {}, apply: () => {} });
    scheduler.schedule('A');
    scheduler.schedule('B');
    expect(scheduler.size).toBe(2);
    rafQ.flushNext();
    expect(scheduler.size).toBe(0);
  });
});
