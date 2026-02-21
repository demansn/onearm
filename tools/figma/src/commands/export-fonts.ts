import fs from 'fs';
import path from 'path';
import { FigmaAuth } from '../auth/FigmaAuth.js';
import { FigmaClient, FigmaNode } from '../api/FigmaClient.js';
import { findGameRoot } from '../utils/find-game-root.js';

function collectTextNodes(node: FigmaNode, acc: FigmaNode[] = []): FigmaNode[] {
    if (node.type === 'TEXT') acc.push(node);
    if (node.children) node.children.forEach(c => collectTextNodes(c, acc));
    return acc;
}

const toHex = (v: number): string => Math.round(v * 255).toString(16).padStart(2, '0');
const rgbHex = ({ r, g, b }: { r: number; g: number; b: number }): string => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

function extractShadow(effects: any[] = []): Record<string, any> {
    const drop = effects.find((e: any) => e.type === 'DROP_SHADOW' && e.visible);
    if (!drop) return {};
    const { color, radius, offset } = drop;
    return {
        dropShadow:         true,
        dropShadowColor:    rgbHex(color),
        dropShadowBlur:     radius,
        dropShadowAngle:    Math.atan2(offset.y, offset.x),
        dropShadowDistance: Math.hypot(offset.x, offset.y),
    };
}

function paintToFillProps(paint: any): Record<string, any> {
    if (!paint) return { fill: '#000000' };

    if (paint.type === 'SOLID') {
        return { fill: rgbHex(paint.color) };
    }

    if (paint.type && paint.type.startsWith('GRADIENT')) {
        const colors = paint.gradientStops.map((s: any) => rgbHex(s.color));
        const stops = paint.gradientStops.map((s: any) => s.position);
        const type = paint.type === 'GRADIENT_RADIAL' ? 1 : 0;
        return {
            fill: colors,
            fillGradientStops: stops,
            fillGradientType: type,
        };
    }

    return { fill: '#000000' };
}

const ALIGN: Record<string, string> = { LEFT: 'left', RIGHT: 'right', CENTER: 'center', JUSTIFIED: 'justify' };

function textNode2Pixi(node: FigmaNode): [string, Record<string, any>] {
    const { name, style, fills, effects, absoluteBoundingBox } = node;
    const paint = fills?.[0];
    const fillProps = paintToFillProps(paint);

    const res: Record<string, any> = {
        fontFamily:    style?.fontFamily,
        fontSize:      style?.fontSize,
        align:         ALIGN[style?.textAlignHorizontal] ?? 'left',
        letterSpacing: style?.letterSpacing,
        lineHeight:    style?.lineHeightPx,
        fontWeight:    style?.fontWeight,
        ...fillProps,
        ...extractShadow(effects),
    };

    if (absoluteBoundingBox?.width) {
        res.wordWrap = true;
        res.wordWrapWidth = absoluteBoundingBox.width;
    }

    if (style?.paragraphSpacing) {
        res.paragraphSpacing = style.paragraphSpacing;
    }
    if (style?.paragraphIndent) {
        res.paragraphIndent = style.paragraphIndent;
    }

    Object.keys(res).forEach(k => res[k] == null && delete res[k]);
    return [name || `Style_${node.id}`, res];
}

export async function run(_args: string[]): Promise<void> {
    const gameRoot = findGameRoot();
    const fileKey = process.env.FILE_KEY;

    if (!fileKey) {
        console.error('FILE_KEY is not set in .env');
        process.exit(1);
    }

    const auth = new FigmaAuth();
    const client = new FigmaClient(auth);
    const outputDir = path.join(gameRoot, 'assets/font');

    fs.mkdirSync(outputDir, { recursive: true });

    console.log('Checking OAuth authorization...');
    await auth.getValidToken();
    console.log('OAuth authorization OK\n');

    console.log('Fetching Figma file...');
    const figmaData = await client.getFile(fileKey);
    const document = figmaData.document;
    const fontsPage = document.children?.find(page => page.name === 'fonts');

    if (!fontsPage) {
        throw new Error('Page "fonts" not found in Figma file');
    }

    const textNodes = collectTextNodes(fontsPage);
    const entries = textNodes.map(textNode2Pixi);
    const stylesMap = Object.fromEntries(entries);

    const fontSet = new Set(entries.map(([, s]) => s.fontFamily).filter(Boolean));
    const fontMap = Object.fromEntries([...fontSet].map(f => [f, f]));

    const fileContent = `// AUTO-GENERATED. Do NOT edit manually.\nimport * as PIXI from 'pixi.js';\n\n/** Font families used across fonts page of Figma */\nexport const FontFamilies = ${JSON.stringify(fontMap, null, 2)};\n\n/** PIXI.TextStyle map keyed by layer name */\nexport const FontsStyle = {\n${Object.entries(stylesMap).map(([k, v]) => `  "${k}": new PIXI.TextStyle(${JSON.stringify(v, null, 2)})`).join(',\n')}\n};\n`;

    fs.writeFileSync(path.join(outputDir, 'FontsStyle.js'), fileContent);
    console.log(`Extracted ${textNodes.length} styles (${fontSet.size} fonts) -> ${path.relative(process.cwd(), outputDir)}/FontsStyle.js`);
}
