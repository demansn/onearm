interface AnimationInfo {
    name: string;
    width: number;
    height: number;
}

interface SpineEntry {
    alias: string;
    bundle: string;
    width: number;
    height: number;
    animations: AnimationInfo[];
    skins: string[];
    defaultAnimation: string;
    isBinary?: boolean;
}

interface SpineManifest {
    version: number;
    spines: SpineEntry[];
}

const MAX_DISPLAY_SIZE = 400;
const PLACEHOLDER_COLOR: RGB = { r: 0.55, g: 0.36, b: 0.86 };

function clampSize(w: number, h: number): { width: number; height: number } {
    const cw = Math.max(w, 10);
    const ch = Math.max(h, 10);
    if (cw <= MAX_DISPLAY_SIZE && ch <= MAX_DISPLAY_SIZE) return { width: cw, height: ch };
    const scale = MAX_DISPLAY_SIZE / Math.max(cw, ch);
    return { width: Math.round(cw * scale), height: Math.round(ch * scale) };
}

function createVariantComponent(entry: SpineEntry, anim: AnimationInfo): ComponentNode {
    const size = clampSize(anim.width, anim.height);

    const comp = figma.createComponent();
    comp.name = `animation=${anim.name}`;
    comp.resize(size.width, size.height);

    const rect = figma.createRectangle();
    rect.resize(size.width, size.height);
    rect.fills = [{ type: 'SOLID', color: PLACEHOLDER_COLOR, opacity: 0.15 }];
    rect.strokes = [{ type: 'SOLID', color: PLACEHOLDER_COLOR }];
    rect.strokeWeight = 1;
    rect.name = 'placeholder';
    comp.appendChild(rect);

    const label = figma.createText();
    label.characters = `${entry.alias}\n${anim.name}\n${anim.width}x${anim.height}`;
    label.fontSize = Math.max(8, Math.min(16, Math.round(size.width / 14)));
    label.fills = [{ type: 'SOLID', color: PLACEHOLDER_COLOR }];
    label.textAlignHorizontal = 'CENTER';
    label.textAlignVertical = 'CENTER';
    label.resize(size.width, size.height);
    label.name = 'label';
    comp.appendChild(label);

    comp.addComponentProperty('spine', 'TEXT', entry.alias);
    comp.addComponentProperty('animation', 'TEXT', anim.name);
    comp.addComponentProperty('autoPlay', 'BOOLEAN', false);
    comp.addComponentProperty('loop', 'BOOLEAN', false);
    comp.addComponentProperty('skin', 'TEXT', entry.skins[0] || 'default');

    return comp;
}

function createSpineComponentSet(entry: SpineEntry): ComponentSetNode | ComponentNode {
    const animations = entry.animations.length > 0
        ? entry.animations
        : [{ name: 'default', width: entry.width, height: entry.height }];

    // Single animation → plain Component
    if (animations.length === 1) {
        const anim = animations[0];
        const size = clampSize(anim.width, anim.height);

        const comp = figma.createComponent();
        comp.name = 'Spine';
        comp.resize(size.width, size.height);

        const rect = figma.createRectangle();
        rect.resize(size.width, size.height);
        rect.fills = [{ type: 'SOLID', color: PLACEHOLDER_COLOR, opacity: 0.15 }];
        rect.strokes = [{ type: 'SOLID', color: PLACEHOLDER_COLOR }];
        rect.strokeWeight = 1;
        rect.name = 'placeholder';
        comp.appendChild(rect);

        const label = figma.createText();
        label.characters = `${entry.alias}\n${anim.width}x${anim.height}`;
        label.fontSize = Math.max(8, Math.min(16, Math.round(size.width / 14)));
        label.fills = [{ type: 'SOLID', color: PLACEHOLDER_COLOR }];
        label.textAlignHorizontal = 'CENTER';
        label.textAlignVertical = 'CENTER';
        label.resize(size.width, size.height);
        label.name = 'label';
        comp.appendChild(label);

        comp.addComponentProperty('spine', 'TEXT', entry.alias);
        comp.addComponentProperty('animation', 'TEXT', anim.name);
        comp.addComponentProperty('autoPlay', 'BOOLEAN', false);
        comp.addComponentProperty('loop', 'BOOLEAN', false);
        comp.addComponentProperty('skin', 'TEXT', entry.skins[0] || 'default');

        comp.description = buildDescription(entry);
        return comp;
    }

    // Multiple animations → ComponentSet with per-animation variants and sizes
    const variants: ComponentNode[] = [];
    for (const anim of animations) {
        variants.push(createVariantComponent(entry, anim));
    }

    const componentSet = figma.combineAsVariants(variants, figma.currentPage);
    componentSet.name = 'Spine';

    // Auto layout so variants stack vertically
    componentSet.layoutMode = 'VERTICAL';
    componentSet.primaryAxisSizingMode = 'AUTO';
    componentSet.counterAxisSizingMode = 'AUTO';
    componentSet.itemSpacing = 10;
    componentSet.paddingTop = 10;
    componentSet.paddingBottom = 10;
    componentSet.paddingLeft = 10;
    componentSet.paddingRight = 10;

    componentSet.description = buildDescription(entry);
    return componentSet;
}

function buildDescription(entry: SpineEntry): string {
    const parts = [
        `Spine: ${entry.alias}`,
        `Bundle: ${entry.bundle}`,
        `Skeleton size: ${entry.width}x${entry.height}`,
    ];
    if (entry.animations.length > 0) {
        const animList = entry.animations.map(a => `${a.name} (${a.width}x${a.height})`);
        parts.push(`Animations (${animList.length}): ${animList.join(', ')}`);
    }
    if (entry.skins.length > 1) {
        parts.push(`Skins: ${entry.skins.join(', ')}`);
    }
    if (entry.isBinary) {
        parts.push('(binary .skel — no metadata)');
    }
    return parts.join('\n');
}

async function createSpineComponents(manifest: SpineManifest): Promise<void> {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

    // Group entries by bundle
    const bundles = new Map<string, SpineEntry[]>();
    for (const entry of manifest.spines) {
        const list = bundles.get(entry.bundle) || [];
        list.push(entry);
        bundles.set(entry.bundle, list);
    }

    // Remove existing reference frame if present
    const existingFrame = figma.currentPage.findOne(
        n => n.type === 'FRAME' && n.name === 'Spine Components'
    );
    if (existingFrame) existingFrame.remove();

    const refFrame = figma.createFrame();
    refFrame.name = 'Spine Components';
    refFrame.layoutMode = 'VERTICAL';
    refFrame.primaryAxisSizingMode = 'AUTO';
    refFrame.counterAxisSizingMode = 'AUTO';
    refFrame.itemSpacing = 40;
    refFrame.paddingTop = 20;
    refFrame.paddingBottom = 20;
    refFrame.paddingLeft = 20;
    refFrame.paddingRight = 20;
    refFrame.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];

    let created = 0;

    for (const [bundleName, entries] of bundles) {
        figma.ui.postMessage({ type: 'progress', text: `Bundle: ${bundleName} (${entries.length} spines)...` });

        const bundleHeader = figma.createText();
        bundleHeader.fontName = { family: 'Inter', style: 'Bold' };
        bundleHeader.characters = `Bundle: ${bundleName}`;
        bundleHeader.fontSize = 20;
        bundleHeader.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
        refFrame.appendChild(bundleHeader);

        const bundleFrame = figma.createFrame();
        bundleFrame.name = bundleName;
        bundleFrame.layoutMode = 'HORIZONTAL';
        bundleFrame.layoutWrap = 'WRAP';
        bundleFrame.primaryAxisSizingMode = 'FIXED';
        bundleFrame.counterAxisSizingMode = 'AUTO';
        bundleFrame.resize(1400, 100);
        bundleFrame.itemSpacing = 20;
        bundleFrame.counterAxisSpacing = 20;
        bundleFrame.fills = [];
        refFrame.appendChild(bundleFrame);

        for (const entry of entries) {
            const componentSet = createSpineComponentSet(entry);
            bundleFrame.appendChild(componentSet);
            created++;
        }
    }

    figma.viewport.scrollAndZoomIntoView([refFrame]);

    figma.ui.postMessage({
        type: 'done',
        text: `Created ${created} Spine component sets across ${bundles.size} bundle(s). Each animation variant has its own size.`,
    });
}

figma.showUI(__html__, { width: 360, height: 280 });

figma.ui.onmessage = async (msg: any) => {
    if (msg.type === 'create') {
        try {
            await createSpineComponents(msg.manifest);
        } catch (err: any) {
            figma.ui.postMessage({ type: 'error', text: `Error: ${err.message}` });
        }
    }
};
