// 构建期虚拟模块的类型声明(vite-plugin-defs 在构建时生成)
declare module 'virtual:leader-line-defs' {
  export const DEFS_HTML: string;
  export const SYMBOLS: Record<string, {
    elmId: string;
    bBox: { left: number; top: number; width: number; height: number; right: number; bottom: number };
    widthR: number;
    heightR: number;
    bCircle: number;
    sideLen: number;
    backLen: number;
    overhead: number;
    noRotate?: boolean;
    outlineBase?: number;
    outlineMax?: number;
  }>;
  export const PLUG_KEY_2_ID: Record<string, string>;
  export const PLUG_2_SYMBOL: Record<string, string>;
  export const DEFAULT_END_PLUG: string;
}

// vite ?raw 导入(test/exported-funcs.js 用)
declare module '*?raw' {
  const content: string;
  export default content;
}

// 测试环境全局(test/traceLog.js 提供)
declare var traceLog: {
  log: string[];
  enabled: boolean;
  getOpenCloseTags: boolean;
  add: (...args: unknown[]) => void;
  getTaggedLog: (tagName: string) => string[] | null;
  clear: () => void;
};
