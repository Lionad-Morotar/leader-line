// options.svgContainer(fork 特性):SVG 挂载容器的行为验证
// 覆盖:默认 body 挂载、自定义容器挂载、setOptions 换容器重挂载、remove 清理
import { describe, it, expect } from 'vitest';

describe('options.svgContainer', function() {
  'use strict';

  var window, document, pageDone;

  beforeEach(function(beforeDone) {
    loadPage('spec/common/page.html', function(frmWindow, frmDocument, body, done) {
      window = frmWindow;
      document = frmDocument;
      pageDone = done;
      beforeDone();
    });
  });

  afterEach(function() { pageDone(); });

  it('defaults to document.body when svgContainer is not specified', function() {
    var ll = new window.LeaderLine(
      document.getElementById('elm1'), document.getElementById('elm2'));
    var svg = document.querySelector('svg.leader-line');
    expect(svg).not.toBeNull();
    expect(svg.parentElement).toBe(document.body);
    ll.remove();
  });

  it('mounts svg into the specified container', function() {
    var container = document.createElement('section');
    container.id = 'svg-host';
    document.body.appendChild(container);

    var ll = new window.LeaderLine(
      document.getElementById('elm1'), document.getElementById('elm2'),
      {svgContainer: container});
    var svg = container.querySelector('svg.leader-line');
    expect(svg).not.toBeNull();
    expect(svg.parentElement).toBe(container);
    // path 正常渲染(非空 d)
    expect(svg.querySelector('path').getAttribute('d').length).toBeGreaterThan(0);
    ll.remove();
    container.remove();
  });

  it('re-mounts svg when svgContainer is changed via setOptions', function() {
    var hostA = document.createElement('section');
    var hostB = document.createElement('section');
    document.body.appendChild(hostA);
    document.body.appendChild(hostB);

    var ll = new window.LeaderLine(
      document.getElementById('elm1'), document.getElementById('elm2'),
      {svgContainer: hostA});
    expect(hostA.querySelector('svg.leader-line')).not.toBeNull();

    ll.setOptions({svgContainer: hostB});
    expect(hostA.querySelector('svg.leader-line')).toBeNull();
    expect(hostB.querySelector('svg.leader-line')).not.toBeNull();
    ll.remove();
    hostA.remove();
    hostB.remove();
  });

  it('removes svg from the container on remove()', function() {
    var container = document.createElement('section');
    document.body.appendChild(container);

    var ll = new window.LeaderLine(
      document.getElementById('elm1'), document.getElementById('elm2'),
      {svgContainer: container});
    expect(container.querySelector('svg.leader-line')).not.toBeNull();

    ll.remove();
    expect(container.querySelector('svg.leader-line')).toBeNull();
    container.remove();
  });
});
