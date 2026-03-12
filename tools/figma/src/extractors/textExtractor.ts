/**
 * @fileoverview Text properties extractor for Figma nodes
 */

import type { AbstractNode } from './types';
import { isMixed } from '../adapters/mixed';
import { extractFillProps } from './fillExtractor';
import { extractStrokeProps } from './strokeExtractor';

/**
 * Resolve line height in pixels when explicit units are used.
 */
function resolveLineHeightPx(node: AbstractNode): number | undefined {
  if (node.type !== 'TEXT') {
    return undefined;
  }

  const lineHeight = node.lineHeight as any;
  if (!lineHeight || isMixed(lineHeight)) {
    return undefined;
  }

  if (lineHeight.unit === 'PIXELS') {
    return lineHeight.value;
  }

  if (lineHeight.unit === 'PERCENT') {
    const fontSize = node.fontSize as any;
    if (isMixed(fontSize) || typeof fontSize !== 'number') {
      return undefined;
    }
    return (lineHeight.value * fontSize) / 100;
  }

  return undefined;
}

/**
 * Extract text style properties
 */
export function extractTextProps(node: AbstractNode): any {
  if (node.type !== 'TEXT') {
    return {};
  }

  const props: any = {
    text: node.characters || '',
  };

  const style: any = {};

  if (node.fontName && typeof node.fontName === 'object' && !isMixed(node.fontName)) {
    style.fontFamily = node.fontName.family;
  }
  if (node.fontSize && !isMixed(node.fontSize)) {
    style.fontSize = node.fontSize;
  }
  if (node.fontWeight && !isMixed(node.fontWeight)) {
    style.fontWeight = node.fontWeight;
  }
  const lineHeightPx = resolveLineHeightPx(node);
  if (lineHeightPx !== undefined) {
    style.lineHeight = lineHeightPx;
  }

  // Text alignment
  if (node.textAlignHorizontal && !isMixed(node.textAlignHorizontal)) {
    const alignMap: { [key: string]: string } = {
      'LEFT': 'left',
      'CENTER': 'center',
      'RIGHT': 'right',
      'JUSTIFIED': 'justify'
    };
    style.align = alignMap[node.textAlignHorizontal] || 'left';
  }

  // Text sizing mode
  if ('textAutoResize' in node && node.textAutoResize !== undefined && !isMixed(node.textAutoResize)) {
    if (node.textAutoResize === 'HEIGHT') {
      // Fixed width, auto height — word wrap
      style.wordWrap = true;
      style.wordWrapWidth = Math.round(node.width);
    } else if (node.textAutoResize === 'NONE') {
      // Fixed width and height — auto-scale via EngineText
      props.maxWidth = Math.round(node.width);
    }
    // For 'WIDTH_AND_HEIGHT' (auto width) — no constraints
  }

  // Text-specific fill
  Object.assign(style, extractFillProps(node));
  Object.assign(style, extractStrokeProps(node));

  props.style = style;

  return props;
}
