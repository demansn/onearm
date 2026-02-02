import { Container, DisplayObject, Graphics } from 'pixi.js';

export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'center' | 'bottom';

export interface AlignConfig {
    x?: HorizontalAlign;
    y?: VerticalAlign;
}

export interface SizeConfig {
    width?: number;
    height?: number;
}

export interface SpacingConfig {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
}

export interface PositionConfig {
    x?: number;
    y?: number;
}

export interface BlockAlignmentConfig {
    align?: AlignConfig;
    size?: SizeConfig;
    padding?: SpacingConfig;
    margin?: SpacingConfig;
    debug?: boolean;
}

export declare class BlockAlignment {
    align: Required<AlignConfig>;
    size: Required<SizeConfig>;
    padding: Required<SpacingConfig>;
    margin: Required<SpacingConfig>;

    constructor(config?: BlockAlignmentConfig);

    updateConfig(newConfig: Partial<BlockAlignmentConfig>): void;
    alignContainer(container: Container, position?: PositionConfig | null): void;
    alignElements(elements: DisplayObject[], position?: PositionConfig | null): void;

    createDebugOverlay(parent: Container, position?: PositionConfig): Graphics;

    static preset(preset: string, overrides?: BlockAlignmentConfig): BlockAlignment;
}
