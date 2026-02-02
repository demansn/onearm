// figma2pixi.js — v5: OUTPUT_DIR + анализ только 2‑й страницы
// Usage: FIGMA_API_KEY=xxx FIGMA_FILE_ID=yyy node figma2pixi.js

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const API_KEY = process.env.FIGMA_TOKEN;
const FILE_ID = process.env.FILE_KEY;
const BASE = `https://api.figma.com/v1/files/${FILE_ID}`;

if (!API_KEY || !FILE_ID) {
    console.error('Ошибка: FIGMA_TOKEN или FILE_KEY не найдены в .env файле');
    console.log('Проверяем путь к .env:', path.join(process.cwd(), '../../.env'));
    console.log('Текущая рабочая директория:', process.cwd());
    console.log('FIGMA_TOKEN:', API_KEY ? 'найден' : 'НЕ НАЙДЕН');
    console.log('FILE_KEY:', FILE_ID ? 'найден' : 'НЕ НАЙДЕН');
    process.exit(1);
}

const headers = { 'X-Figma-Token': API_KEY };
const OUTPUT_DIR = path.join(__dirname, '../../../assets/font');

// ensure dir exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// —————————————————————————————————— helpers
function collectTextNodes (node, acc = []) {
    if (node.type === 'TEXT') acc.push(node);
    if (node.children) node.children.forEach(c => collectTextNodes(c, acc));
    return acc;
}

const toHex  = v => Math.round(v * 255).toString(16).padStart(2, '0');
const rgbHex = ({ r, g, b }) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

function extractShadow (effects = []) {
    const drop = effects.find(e => e.type === 'DROP_SHADOW' && e.visible);
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

function paintToFillProps (paint) {
    if (!paint) return { fill: '#000000' };

    if (paint.type === 'SOLID') {
        return { fill: rgbHex(paint.color) };
    }

    if (paint.type && paint.type.startsWith('GRADIENT')) {
        const colors = paint.gradientStops.map(s => rgbHex(s.color));
        const stops  = paint.gradientStops.map(s => s.position);
        const type   = paint.type === 'GRADIENT_RADIAL' ? 1 : 0;
        return {
            fill: colors,
            fillGradientStops: stops,
            fillGradientType: type,
        };
    }

    return { fill: '#000000' };
}

const ALIGN = { LEFT:'left', RIGHT:'right', CENTER:'center', JUSTIFIED:'justify' };

/**
 * @param {object} node
 * @returns {[string, object]}
 */
function textNode2Pixi (node) {
    const { name, style, fills, effects, absoluteBoundingBox } = node;
    const paint     = fills[0];
    const fillProps = paintToFillProps(paint);

    const res = {
        fontFamily:    style?.fontFamily,
        fontSize:      style?.fontSize,
        align:         ALIGN[style?.textAlignHorizontal] ?? 'left',
        letterSpacing: style?.letterSpacing,
        lineHeight:    style?.lineHeightPx,
        fontWeight:    style?.fontWeight,
        ...fillProps,
        ...extractShadow(effects),
    };

    // Если есть ограничение по ширине — включаем перенос
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

    if (name === "ActivatePopupText") {
        console.log(node);
    }

    Object.keys(res).forEach(k => res[k] == null && delete res[k]);
    return [name || `Style_${node.id}`, res];
}

// —————————————————————————————————— main
async function run() {
    const response = await fetch(BASE, { headers });
    const root = await response.json();

    if (root.err) throw new Error(root.err);

    const document = root.document;
    const firstPage = document.children.find(page => page.name === 'fonts');
    if (!firstPage) throw new Error('📄 No second page in the Figma file');

    const textNodes = collectTextNodes(firstPage);
    const entries = textNodes.map(textNode2Pixi);
    const stylesMap = Object.fromEntries(entries);

    const fontSet = new Set(entries.map(([, s]) => s.fontFamily).filter(Boolean));
    const fontMap = Object.fromEntries([...fontSet].map(f => [f, f]));

    const fileContent = `// AUTO‑GENERATED. Do NOT edit manually.\nimport * as PIXI from 'pixi.js';\n\n/** Font families used across SECOND PAGE of Figma */\nexport const FontFamilies = ${JSON.stringify(fontMap, null, 2)};\n\n/** PIXI.TextStyle map keyed by layer name */\nexport const FontsStyle = {\n${Object.entries(stylesMap).map(([k,v]) => `  \"${k}\": new PIXI.TextStyle(${JSON.stringify(v, null, 2)})`).join(',\n')}\n};\n`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'FontsStyle.js'), fileContent);
    console.log(`🎉  Extracted ${textNodes.length} styles (${fontSet.size} fonts) → ${path.relative(process.cwd(), OUTPUT_DIR)}/FontsStyle.js`);
}

export default run;

if (import.meta.url === `file://${process.argv[1]}`) {
    run().catch(console.error);
}
