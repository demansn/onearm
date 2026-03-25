/**
 * @fileoverview Variant properties extractor for Figma components
 */

import type { AbstractNode } from './types';

function cleanFigmaKey(rawKey: string): string {
  return rawKey.replace(/#\d+:\d+$/, '');
}

/**
 * Extract variant properties from component
 */
export function extractVariantProps(node: AbstractNode): any {
  const variants: any = {};

  try {
    // Check variantProperties first (works for both Plugin API and REST API adapter)
    if (node.type === 'COMPONENT' && 'variantProperties' in node && node.variantProperties) {
      return node.variantProperties;
    }

    // For variants inside ComponentSet (with parent reference), try to parse from name
    if (node.type === 'COMPONENT' && (node as any).parent && (node as any).parent.type === 'COMPONENT_SET') {
      const name = node.name;
      if (name.includes('=')) {
        const pairs = name.split(',').map((s: string) => s.trim());
        pairs.forEach((pair: string) => {
          const [key, value] = pair.split('=').map((s: string) => s.trim());
          if (key && value) {
            variants[key] = value;
          }
        });
        return variants;
      }
    }

    // For ComponentSet or standalone Component, use componentPropertyDefinitions
    if (node.type === 'COMPONENT_SET' || (node.type === 'COMPONENT' && (!(node as any).parent || (node as any).parent.type !== 'COMPONENT_SET'))) {
      if ('componentPropertyDefinitions' in node && node.componentPropertyDefinitions) {
        Object.entries(node.componentPropertyDefinitions).forEach(([key, def]) => {
          if ((def as any).type === 'VARIANT') {
            variants[key] = (def as any).defaultValue;
          }
        });
      }
    }
  } catch (error) {
    // If there's an error accessing variant properties, return empty object
    console.warn('Error extracting variant properties:', error);
  }

  return variants;
}

/**
 * Extract component properties from Figma node (componentProperties)
 */
export function extractComponentProps(node: AbstractNode): Record<string, any> | null {
  if (!node.componentProperties) return null;

  const props: Record<string, any> = {};
  for (const [key, value] of Object.entries(node.componentProperties)) {
    props[cleanFigmaKey(key)] = (value as any).value ?? value;
  }

  return Object.keys(props).length > 0 ? props : null;
}

/**
 * Extract variant information from component instance.
 * Returns variant key based on component properties (state, size, etc.).
 * Does NOT classify by viewport — viewport modes are a Scene concern, not component.
 */
export function extractInstanceVariant(node: AbstractNode): any {
  const props: any = {};

  if (!node.componentProperties) return props;

  // Extract VARIANT type properties only
  const variantProps: any = {};
  Object.entries(node.componentProperties).forEach(([key, value]) => {
    if ((value as any).type === 'VARIANT') {
      variantProps[key] = (value as any).value ?? value;
    }
  });

  if (Object.keys(variantProps).length === 0) return props;

  // Build variant name from properties
  const variantKeys = Object.keys(variantProps).sort();
  if (variantKeys.length === 1) {
    const value = variantProps[variantKeys[0]];
    if (value && String(value).toLowerCase() !== 'default') {
      props.variant = String(value);
    }
  } else {
    props.variant = variantKeys.map(key => `${key}=${variantProps[key]}`).join(',');
  }

  return props;
}

/**
 * Extract BOOLEAN and TEXT componentPropertyDefinitions from a COMPONENT_SET node.
 * Returns flat Record<string, boolean | string> or null if none found.
 */
export function extractPropertyDefinitions(node: AbstractNode): Record<string, boolean | string> | null {
  if (!('componentPropertyDefinitions' in node) || !node.componentPropertyDefinitions) return null;

  const result: Record<string, boolean | string> = {};

  for (const [rawKey, def] of Object.entries(node.componentPropertyDefinitions)) {
    const { type, defaultValue } = def as any;
    if (type !== 'BOOLEAN' && type !== 'TEXT') continue;

    const key = cleanFigmaKey(rawKey);
    result[key] = type === 'BOOLEAN'
      ? (defaultValue === true || defaultValue === 'true')
      : String(defaultValue ?? '');
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Resolve variant name from mainComponent's variantProperties.
 * Uses the same naming logic as processComponentVariants to ensure key matching.
 */
export function resolveVariantFromMainComponent(mainComponentNode: AbstractNode): string | null {
  const variantProps = mainComponentNode.variantProperties;

  if (variantProps && Object.keys(variantProps).length > 0) {
    const keys = Object.keys(variantProps).sort();
    if (keys.length === 1) {
      const value = variantProps[keys[0]];
      return (value && String(value).toLowerCase() !== 'default') ? String(value) : null;
    }
    if (keys.length > 1) {
      return keys.map(k => `${k}=${variantProps[k]}`).join(',');
    }
  }

  // Fallback: use component name directly (handles renamed variants without "key=value" format)
  if (mainComponentNode.name && !mainComponentNode.name.includes('=')) {
    return mainComponentNode.name;
  }

  return null;
}
