import type { AbstractNode } from '../adapters/types';
import { ProcessingContext } from '../core/types';
import { findComponentType } from '../core/componentRegistry';
import {
  ProcessNodeFn,
  processComponentVariantsSet,
} from '../handlers/special/specialProcessors';

export type ComponentSetStrategy = (
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
) => any;

/**
 * Route COMPONENT_SET to appropriate processor via registry, with fallback to generic variants.
 */
export function processComponentSetByStrategy(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const typeDef = findComponentType(componentSet.name);
  if (typeDef?.processSet) {
    return typeDef.processSet(componentSet, context, processNode);
  }
  return processComponentVariantsSet(componentSet, context, processNode);
}
