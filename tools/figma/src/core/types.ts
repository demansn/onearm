import type { AbstractNode, ComponentMapEntry } from '../adapters/types';

export type Bounds = { x: number; y: number };

export type ZoneContext = { type: string; zoneNode: AbstractNode };

export type ProcessingContext = {
  componentMap: Map<string, ComponentMapEntry>;
  parentBounds: Bounds | null;
  isRootLevel: boolean;
  parentZoneInfo: ZoneContext | null;
  /** Предупреждения экспорта; общий массив на весь прогон (сливается в metadata.warnings). */
  diagnostics: string[];
  /** Имена узлов от корня компонента до текущего узла; используется в предупреждениях. */
  nodePath: string[];
};
