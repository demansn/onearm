import type { DocumentProvider } from '../adapters/types';
import { processComponentVariantsSet } from '../handlers/special/specialProcessors';
import { findComponentType } from './componentRegistry';
import { DEFAULT_PAGE_NAME, SKIP_NODE_NAME } from './constants';
import { createRootContext, withContext } from './ProcessingContext';
import { NodeProcessor } from './NodeProcessor';

/**
 * @typedef ExportPipelineOptions
 * @property {DocumentProvider} documentProvider
 * @property {(message: string) => void=} onProgress
 */
export type ExportPipelineOptions = {
  documentProvider: DocumentProvider;
  onProgress?: (message: string) => void;
};

/**
 * @typedef ExportResult
 * @property {any[]} components
 * @property {any} metadata
 */
export type ExportResult = {
  components: any[];
  metadata: any;
};

/**
 * @class ExportPipeline
 */
export class ExportPipeline {
  private readonly nodeProcessor: NodeProcessor;
  private readonly documentProvider: DocumentProvider;
  private readonly onProgress?: (message: string) => void;

  /**
   * @param {ExportPipelineOptions} options
   */
  constructor(options: ExportPipelineOptions) {
    this.documentProvider = options.documentProvider;
    this.nodeProcessor = new NodeProcessor();
    this.onProgress = options.onProgress;
  }

  /**
   * @param {string} pageName
   * @returns {ExportResult}
   */
  run(pageName: string): ExportResult {
    const targetPage = pageName || DEFAULT_PAGE_NAME;
    const componentsPage = this.documentProvider.findPageByName(targetPage);

    if (!componentsPage) {
      throw new Error(`Не найдена страница с именем "${targetPage}" в файле Figma`);
    }

    this.onProgress && this.onProgress('Создаем карту компонентов...');
    const componentMap = this.documentProvider.buildComponentMap();

    const rootContext = createRootContext(componentMap);
    const components: any[] = [];

    for (const child of componentsPage.children) {
      if (child.name === SKIP_NODE_NAME) {
        continue;
      }

      try {
        let componentConfig: any = null;
        const typeDef = findComponentType(child.name);
        const processNodeFn = (node: any, context: any) => this.nodeProcessor.process(node, context);
        const childContext = withContext(rootContext, { isRootLevel: false, parentBounds: null, parentZoneInfo: null });

        if (child.type === 'COMPONENT_SET') {
          if (typeDef?.processSet) {
            componentConfig = typeDef.processSet(child, rootContext, processNodeFn);
          } else {
            componentConfig = processComponentVariantsSet(child, rootContext, processNodeFn);
          }
        } else if (typeDef?.process) {
          componentConfig = typeDef.process(child, childContext, processNodeFn);
        } else {
          const nodeConfig = this.nodeProcessor.process(child, rootContext);
          const { name, type, ...variantConfig } = nodeConfig;

          let componentType: string;
          if (typeDef?.type) {
            componentType = typeDef.type;
          } else if ('layoutMode' in child && child.layoutMode && child.layoutMode !== 'NONE') {
            componentType = 'AutoLayout';
          } else {
            componentType = 'SuperContainer';
          }

          typeDef?.postProcess?.(variantConfig);

          componentConfig = { name, type: componentType, ...variantConfig };
        }

        if (componentConfig) {
          components.push(componentConfig);
        }
      } catch (error) {
        console.warn(`Error processing component ${child.name}:`, error);
        this.onProgress && this.onProgress(`Пропускаем компонент ${child.name} из-за ошибки`);
      }
    }

    const scenesWithModes = components.filter(c => c.modes);
    const componentsWithVariants = components.filter(c => c.variants);

    const stats = {
      totalComponents: components.length,
      scenes: scenesWithModes.length,
      componentsWithVariants: componentsWithVariants.length,
      componentsFlat: components.length - scenesWithModes.length - componentsWithVariants.length
    };

    const modeStats: { [key: string]: number } = {};
    scenesWithModes.forEach(component => {
      Object.keys(component.modes).forEach(key => {
        modeStats[key] = (modeStats[key] || 0) + 1;
      });
    });

    // Validate: detect name collisions between instance children and top-level components
    const warnings: string[] = [];
    const variantComponentNames = new Set(
      components.filter(c => c.variants || c.modes).map(c => c.name)
    );

    function findNameCollisions(obj: any, path: string) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((v: any, i: number) => findNameCollisions(v, `${path}[${i}]`));
        return;
      }
      // Instance child whose type matches a COMPONENT_SET name → potential recursive build in LayoutBuilder
      if (obj.isInstance && obj.type && variantComponentNames.has(obj.type)) {
        // Skip if it's a top-level component reference (not inside a variant definition of the same component)
        const parentComponent = path.split('.')[0];
        if (parentComponent === obj.type) {
          warnings.push(
            `Name collision: "${path}" has child instance type="${obj.type}" which matches ` +
            `the parent COMPONENT_SET name. LayoutBuilder may recursively build the wrong component. ` +
            `Consider renaming the child component in Figma.`
          );
        }
      }
      if (obj.children) {
        obj.children.forEach((child: any, i: number) => {
          findNameCollisions(child, `${path}.children[${i}] "${child.name || ''}"`)
        });
      }
      if (obj.variants) {
        for (const [key, value] of Object.entries(obj.variants)) {
          findNameCollisions(value, `${path}.variants.${key}`);
        }
      }
      if (obj.modes) {
        for (const [key, value] of Object.entries(obj.modes)) {
          findNameCollisions(value, `${path}.modes.${key}`);
        }
      }
    }

    components.forEach(c => findNameCollisions(c, c.name));

    if (warnings.length > 0) {
      console.warn('\n⚠️  Export warnings:');
      warnings.forEach(w => console.warn('  ' + w));
    }

    return {
      components,
      metadata: {
        exportedAt: new Date().toISOString(),
        statistics: {
          ...stats,
          modesByName: Object.keys(modeStats).length > 0 ? modeStats : undefined
        },
        warnings: warnings.length > 0 ? warnings : undefined
      }
    };
  }
}
