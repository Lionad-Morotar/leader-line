// LeaderLine 公开 API 类型定义(手写,覆盖 fork 特性与 2.0 新增 API)
// 与 src/leader-line.js 的公开表面保持一致

declare namespace LeaderLine {
  type Anchor = Element | LeaderLineAttachment;
  type PathType = 'straight' | 'arc' | 'fluid' | 'magnet' | 'grid';
  type SocketType = 'top' | 'right' | 'bottom' | 'left' | 'auto';
  type PlugType = 'disc' | 'square' | 'arrow1' | 'arrow2' | 'arrow3' | 'hand' | 'crosshair' | 'behind';
  type ShowEffectName = 'none' | 'fade' | 'draw';
  type SocketGravity = number | [number, number] | 'auto';

  interface AnimOptions {
    /** 动画时长(ms) */
    duration?: number;
    /** cubic-bezier 关键字或 [x1, y1, x2, y2] */
    timing?: string | number[];
  }

  interface DashOptions {
    len?: number;
    gap?: number;
    animation?: boolean | AnimOptions;
  }

  interface GradientOptions {
    startColor?: string;
    endColor?: string;
  }

  interface DropShadowOptions {
    dx?: number;
    dy?: number;
    blur?: number;
    color?: string;
    opacity?: number;
  }

  interface Options {
    path?: PathType;
    lineColor?: string;
    lineSize?: number;
    plugSE?: [PlugType, PlugType];
    plugSizeSE?: [number, number];
    plugColorSE?: [string, string];
    lineOutlineEnabled?: boolean;
    lineOutlineColor?: string;
    lineOutlineSize?: number;
    plugOutlineEnabledSE?: [boolean, boolean];
    plugOutlineColorSE?: [string, string];
    plugOutlineSizeSE?: [number, number];
    socketSE?: [SocketType, SocketType];
    socketGravitySE?: [SocketGravity, SocketGravity];
    startLabel?: LeaderLineAttachment;
    endLabel?: LeaderLineAttachment;
    middleLabel?: LeaderLineAttachment;
    dash?: boolean | DashOptions;
    gradient?: boolean | GradientOptions;
    dropShadow?: boolean | DropShadowOptions;
    showEffectName?: ShowEffectName;
    show_animOptions?: AnimOptions;
    /** fork 特性:SVG 挂载容器,默认 document.body */
    svgContainer?: Element | null;
  }

  interface PointAnchorOptions {
    element?: Element;
    x?: number | string;
    y?: number | string;
  }

  interface AreaAnchorOptions extends PointAnchorOptions {
    shape?: 'rect' | 'circle' | 'polygon';
    color?: string;
    fillColor?: string;
    size?: number;
    dash?: boolean | DashOptions;
    width?: number | string;
    height?: number | string;
    radius?: number;
    points?: Array<[number, number]>;
    svgContainer?: Element | null;
  }

  interface MouseHoverAnchorOptions extends PointAnchorOptions {
    hoverStyle?: Partial<CSSStyleDeclaration> | Record<string, string>;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
  }

  interface CaptionLabelOptions {
    text?: string;
    color?: string;
    outlineColor?: string;
    fontSize?: string;
    fontFamily?: string;
    offset?: [number, number];
    lineOffset?: number;
  }

  interface PathLabelOptions extends CaptionLabelOptions {
    startOffset?: number | string;
  }

  interface LeaderLineAttachment {
    readonly _id: number;
    readonly isRemoved: boolean;
    remove(): void;
  }
}

declare class LeaderLine {
  constructor(start: LeaderLine.Anchor, end: LeaderLine.Anchor, options?: LeaderLine.Options);

  readonly _id: number;

  // ---- option accessors(get/set 同 setOptions) ----
  path: LeaderLine.PathType;
  color: string;
  size: number;
  start: LeaderLine.Anchor;
  end: LeaderLine.Anchor;
  startSocket: LeaderLine.SocketType;
  endSocket: LeaderLine.SocketType;
  startPlug: LeaderLine.PlugType;
  endPlug: LeaderLine.PlugType;
  startPlugColor: string;
  endPlugColor: string;
  lineOutlineEnabled: boolean;
  lineOutlineColor: string;
  lineOutlineSize: number;
  startPlugOutline: boolean;
  endPlugOutline: boolean;
  startPlugOutlineColor: string;
  endPlugOutlineColor: string;
  startPlugOutlineSize: number;
  endPlugOutlineSize: number;
  startLabel: LeaderLine.LeaderLineAttachment | undefined;
  endLabel: LeaderLine.LeaderLineAttachment | undefined;
  middleLabel: LeaderLine.LeaderLineAttachment | undefined;
  dash: boolean | LeaderLine.DashOptions;
  gradient: boolean | LeaderLine.GradientOptions;
  dropShadow: boolean | LeaderLine.DropShadowOptions;
  showEffectName: LeaderLine.ShowEffectName;
  svgContainer: Element | null;

  /** 批量更新选项 */
  setOptions(options: LeaderLine.Options): this;
  /** 同步重新定位(读取锚点布局并立即更新 DOM) */
  position(): this;
  /**
   * 请求在下一动画帧批量重定位(读写分离调度)。
   * 同帧重复调用自动去重;适合拖拽等高频多线更新场景。
   */
  requestPosition(): this;
  show(effectName?: LeaderLine.ShowEffectName, animOptions?: LeaderLine.AnimOptions): this;
  hide(effectName?: LeaderLine.ShowEffectName, animOptions?: LeaderLine.AnimOptions): this;
  remove(): void;

  /** 窗口 resize 时自动重定位所有实例(默认 true) */
  static positionByWindowResize: boolean;
  /**
   * 为 true 时 position() 等价于 requestPosition()(调度合帧)。
   * 默认 false 保持同步语义。
   */
  static deferPositionUpdate: boolean;

  static pointAnchor(options?: LeaderLine.PointAnchorOptions): LeaderLine.LeaderLineAttachment;
  static areaAnchor(options?: LeaderLine.AreaAnchorOptions): LeaderLine.LeaderLineAttachment;
  static mouseHoverAnchor(options?: LeaderLine.MouseHoverAnchorOptions): LeaderLine.LeaderLineAttachment;
  static captionLabel(options?: LeaderLine.CaptionLabelOptions): LeaderLine.LeaderLineAttachment;
  static pathLabel(options?: LeaderLine.PathLabelOptions): LeaderLine.LeaderLineAttachment;
}

export default LeaderLine;
export as namespace LeaderLine;
