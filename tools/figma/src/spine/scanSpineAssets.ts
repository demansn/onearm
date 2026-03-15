import fs from 'fs';
import path from 'path';
import type { SpineEntry, SpineManifest, AnimationInfo } from './types.js';

const SPINE_SKELETON_EXTENSIONS = new Set(['.json', '.skel']);

function readDirs(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort();
}

interface AttachmentSize {
    width: number;
    height: number;
}

/**
 * Collect all attachment sizes from skins.
 * Supports Spine 3.x (skins as object) and 4.x (skins as array).
 * Returns map: slotName → attachmentName → { width, height }
 */
function collectAttachmentSizes(data: any): Map<string, Map<string, AttachmentSize>> {
    const result = new Map<string, Map<string, AttachmentSize>>();
    const skins = data.skins;
    if (!skins) return result;

    const processSkinSlots = (slots: Record<string, any>) => {
        for (const [slotName, attachments] of Object.entries(slots)) {
            if (!result.has(slotName)) result.set(slotName, new Map());
            const slotMap = result.get(slotName)!;
            for (const [attName, props] of Object.entries(attachments as Record<string, any>)) {
                if (props.width && props.height) {
                    slotMap.set(attName, {
                        width: props.width,
                        height: props.height,
                    });
                }
            }
        }
    };

    if (Array.isArray(skins)) {
        // Spine 4.x: [{ name, attachments: { slot: { att: props } } }]
        for (const skin of skins) {
            if (skin.attachments) processSkinSlots(skin.attachments);
        }
    } else {
        // Spine 3.x: { skinName: { slot: { att: props } } }
        for (const slots of Object.values(skins)) {
            processSkinSlots(slots as Record<string, any>);
        }
    }

    return result;
}

/**
 * Build a map of slot → default attachment name from the slots array.
 */
function getSlotDefaults(data: any): Map<string, string> {
    const defaults = new Map<string, string>();
    if (!Array.isArray(data.slots)) return defaults;
    for (const slot of data.slots) {
        if (slot.attachment) {
            defaults.set(slot.name, slot.attachment);
        }
    }
    return defaults;
}

/**
 * For a given animation, figure out which attachments are visible (from slot keyframes).
 * Returns set of "slotName:attachmentName" pairs.
 */
function getAnimationAttachments(
    animData: any,
    slotDefaults: Map<string, string>,
    allSlots: Map<string, Map<string, AttachmentSize>>,
): Set<string> {
    const active = new Set<string>();

    // Start with setup pose defaults
    for (const [slotName, attName] of slotDefaults) {
        if (allSlots.has(slotName) && allSlots.get(slotName)!.has(attName)) {
            active.add(`${slotName}:${attName}`);
        }
    }

    // Override with animation-specific attachment changes
    const animSlots = animData.slots;
    if (animSlots) {
        for (const [slotName, slotData] of Object.entries(animSlots as Record<string, any>)) {
            const attachKeyframes = slotData.attachment;
            if (Array.isArray(attachKeyframes)) {
                for (const kf of attachKeyframes) {
                    if (kf.name && allSlots.has(slotName)) {
                        const slotMap = allSlots.get(slotName)!;
                        if (slotMap.has(kf.name)) {
                            active.add(`${slotName}:${kf.name}`);
                        }
                    }
                }
            }
        }
    }

    return active;
}

/**
 * Estimate animation bounds from the attachments it uses.
 * Takes the max width and max height across all active attachments.
 */
function estimateAnimationSize(
    activeAttachments: Set<string>,
    allSlots: Map<string, Map<string, AttachmentSize>>,
    fallbackW: number,
    fallbackH: number,
): { width: number; height: number } {
    let maxW = 0;
    let maxH = 0;

    for (const key of activeAttachments) {
        const [slotName, attName] = key.split(':');
        const size = allSlots.get(slotName)?.get(attName);
        if (size) {
            if (size.width > maxW) maxW = size.width;
            if (size.height > maxH) maxH = size.height;
        }
    }

    return {
        width: maxW > 0 ? Math.round(maxW) : fallbackW,
        height: maxH > 0 ? Math.round(maxH) : fallbackH,
    };
}

function parseSpineJson(filePath: string): {
    width: number;
    height: number;
    animations: AnimationInfo[];
    skins: string[];
} {
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const skeleton = data.skeleton || {};
        const skelWidth = Math.round(skeleton.width || 100);
        const skelHeight = Math.round(skeleton.height || 100);

        const skins = Array.isArray(data.skins)
            ? data.skins.map((s: any) => s.name || 'default')
            : data.skins ? Object.keys(data.skins) : ['default'];

        const animNames = data.animations ? Object.keys(data.animations) : [];

        // Collect attachment sizes and slot defaults for per-animation bounds
        const attachmentSizes = collectAttachmentSizes(data);
        const slotDefaults = getSlotDefaults(data);

        const animations: AnimationInfo[] = animNames.map(name => {
            const animData = data.animations[name];
            const activeAtts = getAnimationAttachments(animData, slotDefaults, attachmentSizes);
            const size = estimateAnimationSize(activeAtts, attachmentSizes, skelWidth, skelHeight);
            return { name, width: size.width, height: size.height };
        });

        return { width: skelWidth, height: skelHeight, animations, skins };
    } catch {
        return { width: 100, height: 100, animations: [], skins: ['default'] };
    }
}

function addSpineEntries(entries: SpineEntry[], bundleName: string, dirPath: string, files: string[]): void {
    const skeletonFiles = files.filter(f =>
        SPINE_SKELETON_EXTENSIONS.has(path.extname(f).toLowerCase()),
    );

    for (const skeletonFile of skeletonFiles) {
        const ext = path.extname(skeletonFile);
        const alias = path.basename(skeletonFile, ext);
        const isBinary = ext.toLowerCase() === '.skel';
        const fullPath = path.join(dirPath, skeletonFile);

        if (isBinary) {
            entries.push({
                alias,
                bundle: bundleName,
                width: 100,
                height: 100,
                animations: [],
                skins: ['default'],
                defaultAnimation: '',
                isBinary: true,
            });
        } else {
            const meta = parseSpineJson(fullPath);
            entries.push({
                alias,
                bundle: bundleName,
                width: meta.width,
                height: meta.height,
                animations: meta.animations,
                skins: meta.skins,
                defaultAnimation: meta.animations[0]?.name || '',
            });
        }
    }
}

export function scanSpineAssets(assetsDir: string): SpineManifest {
    const spineDir = path.join(assetsDir, 'spine');
    const entries: SpineEntry[] = [];

    if (!fs.existsSync(spineDir)) {
        return { version: 1, spines: entries };
    }

    const bundleDirs = readDirs(spineDir);

    for (const bundleName of bundleDirs) {
        const bundlePath = path.join(spineDir, bundleName);

        // Loose files directly in bundle dir
        const bundleFiles = fs.readdirSync(bundlePath, { withFileTypes: true });
        const looseFiles = bundleFiles.filter(f => f.isFile()).map(f => f.name);
        addSpineEntries(entries, bundleName, bundlePath, looseFiles);

        // Subdirectories
        const subDirs = readDirs(bundlePath);
        for (const dir of subDirs) {
            const dirPath = path.join(bundlePath, dir);
            const files = fs.readdirSync(dirPath);
            addSpineEntries(entries, bundleName, dirPath, files);
        }
    }

    // Resolve duplicate aliases across bundles
    const aliasCounts = new Map<string, number>();
    for (const entry of entries) {
        aliasCounts.set(entry.alias, (aliasCounts.get(entry.alias) || 0) + 1);
    }
    for (const entry of entries) {
        if ((aliasCounts.get(entry.alias) || 0) > 1) {
            entry.alias = `${entry.bundle}/${entry.alias}`;
        }
    }

    return { version: 1, spines: entries };
}
