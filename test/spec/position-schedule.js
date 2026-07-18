// 渲染调度内核的端到端行为:requestPosition/deferPositionUpdate 与同步 position() 的交互
import { describe, it, expect } from 'vitest';

const NEXT_FRAMES = () => new Promise(r => setTimeout(r, 100));

describe('position scheduling', function() {
  'use strict';

  var window, document, pageDone, ll1, ll2;

  function moveAnchors() {
    document.getElementById('elm1').style.left = '50px';
    document.getElementById('elm3').style.left = '250px';
  }

  beforeEach(async () => {
    const page = await loadPageAsync('spec/common/page.html');
    window = page.window;
    document = page.document;
    pageDone = page.done;
    window.LeaderLine.deferPositionUpdate = false; // 用例间隔离
    ll1 = new window.LeaderLine(document.getElementById('elm1'), document.getElementById('elm2'));
    ll2 = new window.LeaderLine(document.getElementById('elm3'), document.getElementById('elm4'));
  });

  afterEach(() => {
    window.LeaderLine.deferPositionUpdate = false;
    pageDone();
  });

  it('requestPosition() defers DOM write to the next frame', async () => {
    var pathBefore = window.insProps[ll1._id].linePath.getPathData();
    moveAnchors();
    ll1.requestPosition();
    // 同步窗口内 DOM 未更新
    expect(window.insProps[ll1._id].linePath.getPathData()).toEqual(pathBefore);

    await NEXT_FRAMES();
    // 下一帧后已更新
    expect(window.insProps[ll1._id].linePath.getPathData()).not.toEqual(pathBefore);
  });

  it('requestPosition() batches multiple lines into one flush', async () => {
    var path1 = window.insProps[ll1._id].linePath.getPathData(),
      path2 = window.insProps[ll2._id].linePath.getPathData();
    moveAnchors();
    ll1.requestPosition();
    ll2.requestPosition();
    ll1.requestPosition(); // 去重:不重复执行

    await NEXT_FRAMES();
    expect(window.insProps[ll1._id].linePath.getPathData()).not.toEqual(path1);
    expect(window.insProps[ll2._id].linePath.getPathData()).not.toEqual(path2);
  });

  it('position() stays synchronous by default', () => {
    var pathBefore = window.insProps[ll1._id].linePath.getPathData();
    moveAnchors();
    ll1.position();
    expect(window.insProps[ll1._id].linePath.getPathData()).not.toEqual(pathBefore);
  });

  it('position() defers when LeaderLine.deferPositionUpdate is true', async () => {
    var pathBefore = window.insProps[ll1._id].linePath.getPathData();
    window.LeaderLine.deferPositionUpdate = true;
    moveAnchors();
    ll1.position();
    expect(window.insProps[ll1._id].linePath.getPathData()).toEqual(pathBefore);

    await NEXT_FRAMES();
    expect(window.insProps[ll1._id].linePath.getPathData()).not.toEqual(pathBefore);
  });

  it('mixed sync position() and scheduled updates do not corrupt state', async () => {
    var pathBefore = window.insProps[ll1._id].linePath.getPathData();
    moveAnchors();
    ll1.requestPosition();
    ll1.position(); // 同步再触发一次:状态仍一致

    var pathAfterSync = window.insProps[ll1._id].linePath.getPathData();
    expect(pathAfterSync).not.toEqual(pathBefore);

    await NEXT_FRAMES();
    // flush 后路径仍与同步结果一致(幂等)
    expect(window.insProps[ll1._id].linePath.getPathData()).toEqual(pathAfterSync);
  });

  it('remove() after requestPosition does not break the flush of other lines', async () => {
    var path2Before = window.insProps[ll2._id].linePath.getPathData();
    moveAnchors();
    ll1.requestPosition();
    ll2.requestPosition();
    ll1.remove(); // flush 前移除:ll1 的调度应被清理

    await NEXT_FRAMES();
    // ll2 不受 ll1 移除影响,正常更新
    expect(window.insProps[ll2._id].linePath.getPathData()).not.toEqual(path2Before);
  });

  it('remove() of an attachment-anchored line does not crash the flush', async () => {
    // reliability 场景:anchor attachment 移除后 insAttachProps 延迟删除,
    // 而线的 optionIsAttach.anchorSE 仍标记 attach——flush 不得抛 TypeError
    var anchor = window.LeaderLine.areaAnchor({element: document.getElementById('elm1')}),
      ll3 = new window.LeaderLine(anchor, document.getElementById('elm2')),
      path2Before = window.insProps[ll2._id].linePath.getPathData();
    moveAnchors();
    ll3.requestPosition();
    ll2.requestPosition();
    ll3.remove(); // unbind + 延迟删除 insAttachProps

    await NEXT_FRAMES();
    expect(window.insProps[ll2._id].linePath.getPathData()).not.toEqual(path2Before);
  });
});
