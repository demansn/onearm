import type { DocumentProvider } from '../adapters/types';
import { cleanNameFromSizeMarker } from '../extractors';
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
          const componentType = typeDef?.type || 'ComponentContainer';

          componentConfig = {
            name,
            type: componentType,
            variants: {
              default: variantConfig
            }
          };
        }

        if (componentConfig) {
          components.push(componentConfig);
        }
      } catch (error) {
        console.warn(`Error processing component ${child.name}:`, error);
        this.onProgress && this.onProgress(`Пропускаем компонент ${child.name} из-за ошибки`);
      }
    }

    const componentsWithMultipleVariants = components.filter(c => {
      if (!c.variants) return false;
      return Object.keys(c.variants).length > 1;
    });

    const stats = {
      totalComponents: components.length,
      componentsWithVariants: componentsWithMultipleVariants.length,
      componentsWithoutVariants: components.length - componentsWithMultipleVariants.length
    };

    const variantStats: { [key: string]: number } = { default: 0, portrait: 0, landscape: 0 };
    components.forEach(component => {
      if (component.variants) {
        Object.keys(component.variants).forEach(key => {
          if (Object.prototype.hasOwnProperty.call(variantStats, key)) {
            variantStats[key]++;
          }
        });
      }
    });

    return {
      components,
      metadata: {
        exportedAt: new Date().toISOString(),
        statistics: {
          ...stats,
          variantsByViewport: variantStats
        }
      }
    };
  }
}
