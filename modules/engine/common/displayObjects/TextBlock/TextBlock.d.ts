import { Container, Texture } from 'pixi.js';

export type TextTransform = 'uppercase' | 'lowercase' | 'capitalize' | 'none';

export type HorizontalAlign = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlign = 'top' | 'middle' | 'bottom' | 'baseline';

export interface TextElement {
    type: 'Text';
    text: string;
    style?: object;
}

export interface ImageElement {
    type: 'Image';
    image: string;
    scale?: number;
}

export interface NextLineElement {
    type: 'NextLine';
}

export type TextBlockElement = TextElement | ImageElement | NextLineElement;

export interface ContainerSize {
    width: number;
    height: number;
}

export interface AlignItems {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
}

export interface TextBlockStyle {
    fontSize?: number;
    fill?: number;
    fontFamily?: string;
    lineHeight?: number;
    lineSpacing?: number;
    align?: HorizontalAlign;
    vAlign?: VerticalAlign;
    textTransform?: TextTransform;
    wordWrap?: boolean;
    wordWrapWidth?: number;
    size?: ContainerSize | null;
    alignItems?: AlignItems;
}

export interface TextBlockConfig {
    elements: TextBlockElement[];
    images?: Record<string, Texture>;
    styles?: Record<string, object>;
    values?: Record<string, string>;
    style?: TextBlockStyle;
}

export declare class TextBlock extends Container {
    constructor(config: TextBlockConfig);
    updateConfig(newConfig: Partial<TextBlockConfig>): void;
    updateValues(newValues: Record<string, string>): void;
    updateStyles(newStyles: Record<string, object>): void;
    invalidate(): void;
    updateLayout(): void;
}
