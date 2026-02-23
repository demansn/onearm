import type { AbstractNode } from '../adapters/types';
import { cleanNameFromSizeMarker, isVariantsContainer } from '../extractors';
import { ProcessingContext } from '../core/types';
import {
  ProcessNodeFn,
  processComponentVariantsSet,
  processProgressBarComponentSet,
  processToggleComponentSet,
  processValueSliderComponentSet,
  processVariantsContainerSet
} from '../handlers/special/specialProcessors';

/**
 * @callback ComponentSetStrategy
 * @param {AbstractNode} componentSet
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export type ComponentSetStrategy = (
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
) => any;

/**
 * @param {AbstractNode} componentSet
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processComponentSetByStrategy(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  if (isVariantsContainer(componentSet.name)) {
    return processVariantsContainerSet(componentSet, context, processNode);
  }
  if (cleanNameFromSizeMarker(componentSet.name).endsWith('Toggle')) {
    return processToggleComponentSet(componentSet, context, processNode);
  }
  if (cleanNameFromSizeMarker(componentSet.name).endsWith('ValueSlider')) {
    return processValueSliderComponentSet(componentSet, context, processNode);
  }
  if (cleanNameFromSizeMarker(componentSet.name).endsWith('ProgressBar')) {
    return processProgressBarComponentSet(componentSet, context, processNode);
  }
  return processComponentVariantsSet(componentSet, context, processNode);
}
