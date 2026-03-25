/**
 * @fileoverview Centralized component type registry.
 * Single source of truth for component detection, type mapping, and processor routing.
 *
 * To add a new component type, add a single registerComponentType() call below.
 */

import type { AbstractNode } from '../adapters/types';
import type { ProcessingContext } from './types';
import { cleanNameFromSizeMarker } from '../extractors/nodeUtils';
import {
  processProgressBar,
  processProgressBarComponentSet,
  processDotsGroup,
  processRadioGroup,
  processReelsConfig,
  processValueSlider,
  processValueSliderComponentSet,
  processScrollBar,
  processScrollBox,
  processToggleComponentSet,
  processDOMText,
  flattenButtonChildren,
  processButtonComponentSet,
  postProcessSpine,
} from '../handlers/special/specialProcessors';

export type ProcessNodeFn = (node: AbstractNode, context: ProcessingContext) => any;

export interface ComponentTypeDefinition {
  /** String to match against cleaned component name */
  match: string;
  /** 'suffix' = endsWith(match), 'exact' = equals match. Default: 'suffix' */
  matchMode?: 'suffix' | 'exact';
  /** Output type name in JSON */
  type: string;
  /** Whether this is a Scene component (exports modes instead of variants) */
  isScene?: boolean;
  /** Processor for single components (non-COMPONENT_SET) */
  process?: (node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn) => any;
  /** Processor for COMPONENT_SET variants */
  processSet?: (node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn) => any;
  /** Whether to handle instances of this type through process() in NodeProcessor */
  handleInstance?: boolean;
  /** Post-process hook: transforms the output config after node processing (e.g. flatten children) */
  postProcess?: (config: any) => void;
}

const registry: ComponentTypeDefinition[] = [];

export function registerComponentType(def: ComponentTypeDefinition) {
  registry.push(def);
}

/**
 * Find a matching component type definition by node name.
 * Returns null if no match found.
 */
export function findComponentType(name: string): ComponentTypeDefinition | null {
  if (!name) return null;
  const cleanName = cleanNameFromSizeMarker(name);

  for (const def of registry) {
    if (def.matchMode === 'exact') {
      if (cleanName === def.match) return def;
    } else {
      if (cleanName.endsWith(def.match)) return def;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Register all component types
// Order matters: more specific matches should come before general ones.
// ---------------------------------------------------------------------------

registerComponentType({
  match: 'ProgressBar',
  type: 'ProgressBar',
  process: processProgressBar,
  processSet: processProgressBarComponentSet,
});

registerComponentType({
  match: 'DotsGroup', matchMode: 'exact',
  type: 'DotsGroup',
  process: processDotsGroup,
});

registerComponentType({
  match: 'RadioGroup', matchMode: 'exact',
  type: 'RadioGroup',
  process: processRadioGroup,
  handleInstance: true,
});

registerComponentType({
  match: 'ReelsConfig', matchMode: 'exact',
  type: 'Reels',
  process: processReelsConfig,
  handleInstance: true,
});

registerComponentType({
  match: 'ValueSlider',
  type: 'ValueSlider',
  process: processValueSlider,
  processSet: processValueSliderComponentSet,
  handleInstance: true,
});

registerComponentType({
  match: 'ScrollBar',
  type: 'ScrollBar',
  process: processScrollBar,
  handleInstance: true,
});

registerComponentType({
  match: 'ScrollBox',
  type: 'ScrollBox',
  process: processScrollBox,
});

registerComponentType({
  match: 'Toggle',
  type: 'CheckBoxComponent',
  processSet: processToggleComponentSet,
});

registerComponentType({
  match: 'DOMText',
  type: 'DOMText',
  process: processDOMText,
});

registerComponentType({
  match: 'Spine', matchMode: 'exact',
  type: 'SpineAnimation',
  postProcess: postProcessSpine,
});

registerComponentType({
  match: 'Scene',
  type: 'Scene',
  isScene: true,
});

registerComponentType({
  match: 'Button',
  type: 'Button',
  processSet: processButtonComponentSet,
  postProcess: flattenButtonChildren,
});
