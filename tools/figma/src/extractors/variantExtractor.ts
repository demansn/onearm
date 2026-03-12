/**
 * @fileoverview Variant properties extractor for Figma components
 */

import type { AbstractNode } from './types';

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
 * Determine viewport type from variant properties or component name
 */
export function determineViewportType(variantProps: any, componentName: string): string {
  const supportedViewports = ['default', 'portrait', 'landscape'];

  // Check variant properties for viewport information
  for (const [key, value] of Object.entries(variantProps)) {
    const lowerKey = key.toLowerCase();
    const lowerValue = String(value).toLowerCase();

    // Check if property name suggests viewport
    if (lowerKey.includes('viewport') || lowerKey.includes('orientation') || lowerKey.includes('layout')) {
      if (supportedViewports.includes(lowerValue)) {
        return lowerValue;
      }
    }

    // Check if value suggests viewport
    if (supportedViewports.includes(lowerValue)) {
      return lowerValue;
    }
  }

  // Check component name for viewport hints (whole word only, not substrings like "BallSelectPortrait")
  const lowerName = componentName.toLowerCase();
  for (const viewport of supportedViewports) {
    if (new RegExp(`\\b${viewport}\\b`).test(lowerName)) {
      return viewport;
    }
  }

  return 'default';
}

/**
 * Extract component properties from Figma node (componentProperties)
 */
export function extractComponentProps(node: AbstractNode): Record<string, any> | null {
  if (!node.componentProperties) return null;

  const props: Record<string, any> = {};
  for (const [key, value] of Object.entries(node.componentProperties)) {
    // Clean key from Figma suffixes (#123:45)
    const cleanKey = key.replace(/#\d+:\d+$/, '');
    props[cleanKey] = (value as any).value ?? value;
  }

  return Object.keys(props).length > 0 ? props : null;
}

/**
 * Extract variant information from component instance
 */
export function extractInstanceVariant(node: AbstractNode): any {
  const props: any = {};

  // Extract variant from component properties (only VARIANT type)
  if (node.componentProperties) {
    const variantProps: any = {};
    Object.entries(node.componentProperties).forEach(([key, value]) => {
      // Only collect VARIANT properties for variant detection
      if ((value as any).type === 'VARIANT') {
        variantProps[key] = (value as any).value ?? value;
      }
    });

    // Determine which variant this instance represents
    const viewport = determineViewportType(variantProps, node.name);
    if (viewport !== 'default') {
      props.variant = viewport;
    } else if (Object.keys(variantProps).length > 0) {
      // If we have variant properties but no specific viewport match,
      // try to create a variant name from the properties
      const variantKeys = Object.keys(variantProps).sort();
      if (variantKeys.length === 1) {
        const key = variantKeys[0];
        const value = variantProps[key];
        if (value && String(value).toLowerCase() !== 'default') {
          props.variant = String(value);
        }
      } else if (variantKeys.length > 1) {
        // Multiple properties - create compound variant name
        const variantName = variantKeys.map(key => `${key}=${variantProps[key]}`).join(',');
        props.variant = variantName;
      }
    }
  }

  // If no specific variant found, check the component name for viewport hints (whole word only)
  if (!props.variant) {
    const lowerName = node.name.toLowerCase();

    if (new RegExp(`\\bportrait\\b`).test(lowerName)) {
      props.variant = 'portrait';
    } else if (new RegExp(`\\blandscape\\b`).test(lowerName)) {
      props.variant = 'landscape';
    }
  }

  return props;
}

/**
 * Resolve variant name from mainComponent's variantProperties.
 * Uses the same naming logic as processComponentVariantsSet to ensure key matching.
 */
export function resolveVariantFromMainComponent(mainComponentNode: AbstractNode): string | null {
  const variantProps = mainComponentNode.variantProperties;

  if (variantProps && Object.keys(variantProps).length > 0) {
    const viewport = determineViewportType(variantProps, mainComponentNode.name);
    if (viewport !== 'default') {
      return viewport;
    }

    const keys = Object.keys(variantProps).sort();
    if (keys.length === 1) {
      const value = variantProps[keys[0]];
      return (value && String(value).toLowerCase() !== 'default') ? value : null;
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
