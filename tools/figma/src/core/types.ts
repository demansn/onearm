import type { AbstractNode, ComponentMapEntry } from '../adapters/types';

export type Bounds = { x: number; y: number };

export type ZoneContext = { type: string; zoneNode: AbstractNode };

export type ProcessingContext = {
  componentMap: Map<string, ComponentMapEntry>;
  parentBounds: Bounds | null;
  isRootLevel: boolean;
  parentZoneInfo: ZoneContext | null;
  diagnostics: string[];
};
