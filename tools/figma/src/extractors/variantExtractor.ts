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
    // For variants inside ComponentSet, get properties from variantProperties
    if (node.type === 'COMPONENT' && (node as any).parent && (node as any).parent.type === 'COMPONENT_SET') {
      // This is a variant inside a component set
      if ('variantProperties' in node && node.variantProperties) {
        return node.variantProperties;
      }

      // Fallback: try to parse from component name
      // Many Figma files use naming convention like "Property1=Value1, Property2=Value2"
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

  // Check component name for viewport hints
  const lowerName = componentName.toLowerCase();
  for (const viewport of supportedViewports) {
    if (lowerName.includes(viewport)) {
      return viewport;
    }
  }

  return 'default';
}

/**
 * Extract variant information from component instance
 */
export function extractInstanceVariant(node: AbstractNode): any {
  const props: any = {};

  // Extract variant from component properties
  if (node.componentProperties) {
    const variantProps: any = {};
    Object.entries(node.componentProperties).forEach(([key, value]) => {
      // Extract value from Figma component property object
      variantProps[key] = (value as any).value || value;
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
        if (value && value !== 'default') {
          props.variant = String(value);
        }
      } else if (variantKeys.length > 1) {
        // Multiple properties - create compound variant name
        const variantName = variantKeys.map(key => `${key}=${variantProps[key]}`).join(',');
        props.variant = variantName;
      }
    }
  }

  // If no specific variant found, check the component name for hints
  if (!props.variant) {
    const componentName = node.name;
    const lowerName = componentName.toLowerCase();

    if (lowerName.includes('portrait')) {
      props.variant = 'portrait';
    } else if (lowerName.includes('landscape')) {
      props.variant = 'landscape';
    } else {
      props.variant = 'default';
    }
  }

  return props;
}
