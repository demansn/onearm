import fs from 'fs';
import path from 'path';
import { FigmaAuth } from '../auth/FigmaAuth.js';
import { FigmaClient, FigmaNode } from '../api/FigmaClient.js';
import { findGameRoot } from '../utils/find-game-root.js';

interface ExportConfig {
    name: string;
    suffix: string;
    nameTemplate: string;
}

interface CollectedNode {
    node: FigmaNode;
    exportPath: string;
    name: string;
    nodeName: string;
    config?: ExportConfig;
}

const EXPORTS_CONFIG: ExportConfig[] = [
    { name: 'buttons',    suffix: '_btn',      nameTemplate: '[parent]_btn_[node]' },
    { name: 'checkboxes', suffix: '_checkbox',  nameTemplate: '[parent]_checkbox_[node]' },
    { name: 'progress',   suffix: '_progress',  nameTemplate: '[parent]_progress_[node]' },
];

const BASE_ASSET_URL = './assets/img';

function collectFolderNode(node: FigmaNode, currentExportPath: string = ''): CollectedNode[] {
    let collected: CollectedNode[] = [];

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            if (child.name.startsWith('path/')) {
                const newPath = child.name.substring('path/'.length).trim();
                collected = collected.concat(collectFolderNode(child, path.join(currentExportPath, newPath)));
            } else {
                collected = collected.concat(collectElementsNode(child, currentExportPath));
            }
        }
    }

    return collected;
}

function collectElementsNode(node: FigmaNode, exportPath: string): CollectedNode[] {
    let collected: CollectedNode[] = [];

    for (const config of EXPORTS_CONFIG) {
        if (node.name.endsWith(config.suffix)) {
            const name = node.name.replace(config.suffix, '');
            collected = collected.concat(collectAllSubNodes(node, config, name, path.join(exportPath, name)));
            break;
        }
    }

    if (collected.length === 0) {
        if (node.type === 'COMPONENT_SET') {
            collected = collected.concat(collectComponentVariants(node, node.name, path.join(exportPath, node.name)));
        } else {
            collected.push({ node, exportPath, name: node.name, nodeName: node.name });
        }
    }

    return collected;
}

function collectAllSubNodes(node: FigmaNode, config: ExportConfig, parentName: string, currentExportPath: string = ''): CollectedNode[] {
    const collected: CollectedNode[] = [];

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const name = config.nameTemplate.replace('[parent]', parentName).replace('[node]', child.name);
            collected.push({ node: child, exportPath: currentExportPath, name, config, nodeName: child.name });
        }
    }

    return collected;
}

function collectComponentVariants(node: FigmaNode, parentName: string, currentExportPath: string = ''): CollectedNode[] {
    const collected: CollectedNode[] = [];

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const nodeName = child.name.replace('type=', '');
            const name = `${parentName}_${nodeName}`;
            collected.push({ node: child, exportPath: currentExportPath, name, nodeName });
        }
    }

    return collected;
}

async function processNode(
    collected: CollectedNode,
    client: FigmaClient,
    fileKey: string,
    outputDir: string,
    exportFormats: string[]
): Promise<{ alias: string; src: string }> {
    const { node, exportPath, name, nodeName } = collected;
    const output = path.join(outputDir, exportPath);

    if (!fs.existsSync(output) && exportPath !== '') {
        await fs.promises.mkdir(output, { recursive: true });
    }

    const exportedFiles: string[] = [];

    for (const format of exportFormats) {
        const fileName = `${nodeName}.${format}`;
        const outputPath = path.join(output, fileName);

        if (!fs.existsSync(outputPath)) {
            console.log(`   Exporting ${format.toUpperCase()}: ${fileName}`);
            const imageUrls = await client.getImages(fileKey, [node.id], format);
            const imageUrl = imageUrls[node.id];

            if (imageUrl) {
                await client.downloadImage(imageUrl, outputPath);
                exportedFiles.push(format);
            } else {
                console.log(`   Warning: no URL for format ${format}`);
            }
        } else {
            console.log(`   ${fileName} already exists, skipping`);
            exportedFiles.push(format);
        }
    }

    let srcPath: string;
    const basePath = `${BASE_ASSET_URL}/${exportPath}/${nodeName}`.replace('//', '/');

    if (exportedFiles.length === 1) {
        srcPath = `${basePath}.${exportedFiles[0]}`;
    } else if (exportedFiles.length === 2 && exportedFiles.includes('png') && exportedFiles.includes('webp')) {
        srcPath = `${basePath}.{png,webp}`;
    } else {
        srcPath = `${basePath}.{${exportedFiles.join(',')}}`;
    }

    return { alias: name, src: srcPath };
}

export async function run(args: string[]): Promise<void> {
    const formatArg = args.find(arg => arg.startsWith('--formats='));
    const helpArg = args.includes('--help') || args.includes('-h');

    if (helpArg) {
        console.log('onearm-figma export-images\n');
        console.log('Usage:');
        console.log('  onearm-figma export-images                    # Export as PNG (default)');
        console.log('  onearm-figma export-images --formats=webp     # Export as WEBP');
        console.log('  onearm-figma export-images --formats=png      # Export as PNG');
        console.log('  onearm-figma export-images --formats=both     # Export as WEBP and PNG');
        return;
    }

    let exportFormats = ['png'];
    let exportMode = 'png';

    if (formatArg) {
        const formatValue = formatArg.split('=')[1];
        switch (formatValue) {
            case 'webp':
                exportFormats = ['webp'];
                exportMode = 'webp';
                break;
            case 'png':
                exportFormats = ['png'];
                exportMode = 'png';
                break;
            case 'both':
                exportFormats = ['webp', 'png'];
                exportMode = 'both';
                break;
            default:
                console.error('Invalid format. Use: webp, png, or both');
                process.exit(1);
        }
    }

    const gameRoot = findGameRoot();
    const fileKey = process.env.FILE_KEY;

    if (!fileKey) {
        console.error('FILE_KEY is not set in .env');
        process.exit(1);
    }

    const auth = new FigmaAuth();
    const client = new FigmaClient(auth);
    const outputDir = path.join(gameRoot, 'assets/img');

    console.log('Checking OAuth authorization...');
    await auth.getValidToken();
    console.log('OAuth authorization OK\n');

    console.log('Fetching Figma file...');
    const figmaData = await client.getFile(fileKey);
    const document = figmaData.document;
    const imagesPage = document.children?.find(page => page.name === 'images');

    if (!imagesPage) {
        throw new Error('Page "images" not found in Figma file');
    }

    console.log(`Export mode: ${exportMode.toUpperCase()}`);
    console.log(`Formats: ${exportFormats.map(f => f.toUpperCase()).join(', ')}\n`);

    const collectedNodes = collectFolderNode(imagesPage, '');
    const metaEntries: { alias: string; src: string }[] = [];

    for (let i = 0; i < collectedNodes.length; i++) {
        const progress = `[${i + 1}/${collectedNodes.length}]`;
        console.log(`${progress} Processing: ${collectedNodes[i].name}`);

        try {
            const meta = await processNode(collectedNodes[i], client, fileKey, outputDir, exportFormats);
            metaEntries.push(meta);
        } catch (error: any) {
            console.error(`Error processing ${collectedNodes[i].name}: ${error.message}`);
        }
    }

    const formattedJSON = JSON.stringify(metaEntries, null, 0)
        .replace(/\},\{/g, '},\n    {')
        .replace(/\[\{/g, '[\n    {')
        .replace(/\}\]/g, '}\n]');

    const metaFilePath = path.join(outputDir, 'meta.json');
    await fs.promises.writeFile(metaFilePath, formattedJSON);
    console.log(`\nMeta file saved: ${metaFilePath}`);
    console.log(`Export complete! Processed: ${metaEntries.length} elements`);
}
