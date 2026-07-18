/**
 * vite-plugin-defs
 * 将 src/symbols.html(SVG symbol 定义)与 src/leader-line.css 编译为
 * ESM 常量模块(DEFS_HTML/SYMBOLS/PLUG_KEY_2_ID/PLUG_2_SYMBOL/DEFAULT_END_PLUG),
 * 供主模块 import;替代原 Grunt getSvgDefs + @INCLUDE 内联机制。
 */

import fs from 'node:fs';
import path from 'node:path';
import { load as cheerioLoad } from 'cheerio';
import htmlclean from 'htmlclean';
import CleanCSS from 'clean-css';

export const VIRTUAL_ID = 'virtual:leader-line-defs';
export const RESOLVED_ID = '\0' + VIRTUAL_ID;

const APP_ID = 'leader-line';
const DEFS_ID = `${APP_ID}-defs`;
// 与 DEFAULT_OPTIONS.lineSize 一致;原 Gruntfile 同名常量
const DEFAULT_LINE_SIZE = 4;

/**
 * 生成 defs 模块源码(纯函数,便于单测)。
 * 移植自原 Gruntfile getSvgDefs:解析 symbols.html 中每个 .symbol + .size 的 svg,
 * 产出压缩后的 DEFS_HTML 与各几何常量;behind 字面量直接内联(与原占位符技巧语义等价)。
 * @param {string} symbolsHtml - src/symbols.html 内容
 * @param {string} css - src/leader-line.css 内容
 * @returns {string} ESM 模块源码
 */
export function generateDefs(symbolsHtml, css) {
  const $ = cheerioLoad(symbolsHtml);
  let defsSrc = '';
  const SYMBOLS = {}, PLUG_KEY_2_ID = {behind: 'behind'}, PLUG_2_SYMBOL = {};
  const varIds = {};

  $('svg').each((i, elm) => {
    const symbol = $('.symbol', elm), size = $('.size', elm);
    let id;
    if (symbol.length && size.length && (id = symbol.attr('id'))) {
      const elmId = `${APP_ID}-${id}`;
      const props = (symbol.attr('class') + '').split(' ');
      let noOverhead = false;

      defsSrc += $.xml(symbol.attr('id', elmId).removeAttr('class'));

      SYMBOLS[id] = {elmId};
      props.forEach(prop => {
        let matches;
        if ((matches = prop.match(/prop-([^\s]+)/))) {
          SYMBOLS[id][matches[1]] = true;
        } else if ((matches = prop.match(/varId-([^\s]+)/))) {
          varIds[matches[1]] = id;
        } else if (prop === 'no-overhead') {
          noOverhead = true;
        }
      });

      const bBox = {
        left: parseFloat(size.attr('x')),
        top: parseFloat(size.attr('y')),
        width: parseFloat(size.attr('width')),
        height: parseFloat(size.attr('height'))
      };
      bBox.right = bBox.left + bBox.width;
      bBox.bottom = bBox.top + bBox.height;
      SYMBOLS[id].bBox = bBox;
      SYMBOLS[id].widthR = bBox.width / DEFAULT_LINE_SIZE;
      SYMBOLS[id].heightR = bBox.height / DEFAULT_LINE_SIZE;
      SYMBOLS[id].bCircle = Math.max(-bBox.left, -bBox.top, bBox.right, bBox.bottom);
      SYMBOLS[id].sideLen = Math.max(-bBox.top, bBox.bottom);
      SYMBOLS[id].backLen = -bBox.left;
      SYMBOLS[id].overhead = noOverhead ? 0 : bBox.right;

      const outlineBase = $('.outline-base', elm), outlineMax = $('.outline-max', elm);
      if (outlineBase.length && outlineMax.length) {
        SYMBOLS[id].outlineBase = parseFloat(outlineBase.attr('stroke-width')) / 2;
        SYMBOLS[id].outlineMax =
          parseFloat(outlineMax.attr('stroke-width')) / 2 / SYMBOLS[id].outlineBase;
      }

      PLUG_KEY_2_ID[id] = id;
      PLUG_2_SYMBOL[id] = id;
    }
  });

  const cssSrc = new CleanCSS({level: {1: {specialComments: 0}}})
    .minify(css.trim().replace(/^\s*@charset\s+[^;]+;/gm, '')).styles;

  // cheerio 序列化可能产生 <tag></tag>,与原构建一致归一化为 <tag/>
  defsSrc = defsSrc.replace(/<([^>\s]+)([^>]*)><\/\1>/g, '<$1$2/>');
  const defsHtml = htmlclean(
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" id="${DEFS_ID}">` +
    `<style><![CDATA[${cssSrc}]]></style><defs>${defsSrc}</defs></svg>`);

  return [
    `export const DEFS_HTML = ${JSON.stringify(defsHtml)};`,
    `export const SYMBOLS = ${JSON.stringify(SYMBOLS)};`,
    `export const PLUG_KEY_2_ID = ${JSON.stringify(PLUG_KEY_2_ID)};`,
    `export const PLUG_2_SYMBOL = ${JSON.stringify(PLUG_2_SYMBOL)};`,
    ...Object.keys(varIds).map(name => `export const ${name} = ${JSON.stringify(varIds[name])};`),
    ''
  ].join('\n');
}

export function defsPlugin(options = {}) {
  const root = options.root || process.cwd();
  return {
    name: 'leader-line-defs',
    resolveId(id) {
      if (id === VIRTUAL_ID) { return RESOLVED_ID; }
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) { return null; }
      const symbolsHtml = fs.readFileSync(path.join(root, 'src/symbols.html'), 'utf8');
      const css = fs.readFileSync(path.join(root, 'src/leader-line.css'), 'utf8');
      return generateDefs(symbolsHtml, css);
    }
  };
}

export default defsPlugin;
