export interface AnimationInfo {
    name: string;
    width: number;
    height: number;
}

export interface SpineEntry {
    alias: string;
    bundle: string;
    width: number;
    height: number;
    animations: AnimationInfo[];
    skins: string[];
    defaultAnimation: string;
    isBinary?: boolean;
}

export interface SpineManifest {
    version: 1;
    spines: SpineEntry[];
}
