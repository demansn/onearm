// exportFigmaElements.js

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FigmaAuth } from './auth/FigmaAuth.js';
import { findGameRoot } from './utils/find-game-root.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameRoot = findGameRoot();
dotenv.config({ path: path.join(gameRoot, '.env') });

// Инициализируем OAuth-only авторизацию
let figmaAuth;
const FILE_KEY = process.env.FILE_KEY;

// Проверяем обязательные параметры
if (!FILE_KEY) {
    console.error('❌ Ошибка: FILE_KEY не настроен в .env файле');
    console.log('📁 Проверяем путь к .env:', path.join(gameRoot, '.env'));
    console.log('📁 Game root:', gameRoot);
    console.log('📂 Текущая рабочая директория:', process.cwd());
    console.log('FILE_KEY:', FILE_KEY ? 'найден' : 'НЕ НАЙДЕН');
    process.exit(1);
}

// Инициализируем OAuth авторизацию
try {
    figmaAuth = new FigmaAuth();
} catch (error) {
    console.error('❌ Критическая ошибка авторизации:', error.message);
    console.log('\n📚 Для настройки OAuth авторизации выполните:');
    console.log('   npm run setup-oauth\n');
    process.exit(1);
}
const OUTPUT_DIR = path.join(gameRoot, 'assets/img');
const BASE_ASSET_URL = './assets/img';

const exportsConfig = [
    { name: 'buttons',   suffix: '_btn', nameTemplate: '[parent]_btn_[node]' },
    { name: 'checkboxes', suffix: '_checkbox', nameTemplate: '[parent]_checkbox_[node]' },
    { name: 'progress',   suffix: '_progress', nameTemplate: '[parent]_progress_[node]' },
];

// Обработка параметров командной строки
const args = process.argv.slice(2);
const formatArg = args.find(arg => arg.startsWith('--formats='));
const helpArg = args.includes('--help') || args.includes('-h');

if (helpArg) {
    console.log('🚀 Figma Export Script');
    console.log('');
    console.log('Использование:');
    console.log('  npm run export                    # Экспорт в WEBP (по умолчанию)');
    console.log('  npm run export -- --formats=webp # Экспорт только в WEBP');
    console.log('  npm run export -- --formats=png  # Экспорт только в PNG');
    console.log('  npm run export -- --formats=both # Экспорт в WEBP и PNG');
    console.log('');
    console.log('Форматы мета-файла:');
    console.log('  Один формат:  { alias: "button", src: "./assets/img/button.webp" }');
    console.log('  Оба формата: { alias: "button", src: "./assets/img/button.{png,webp}" }');
    console.log('');
    process.exit(0);
}

// Определение форматов экспорта
let EXPORT_FORMATS = ['png']; // По умолчанию только WEBP
let EXPORT_MODE = 'webp'; // webp, png, both

if (formatArg) {
    const formatValue = formatArg.split('=')[1];
    switch (formatValue) {
        case 'webp':
            EXPORT_FORMATS = ['webp'];
            EXPORT_MODE = 'webp';
            break;
        case 'png':
            EXPORT_FORMATS = ['png'];
            EXPORT_MODE = 'png';
            break;
        case 'both':
            EXPORT_FORMATS = ['webp', 'png'];
            EXPORT_MODE = 'both';
            break;
        default:
            console.error('❌ Неверный формат. Используйте: webp, png или both');
            process.exit(1);
    }
}

const DEFAULT_FORMAT = EXPORT_FORMATS[0]; // Первый формат как основной

async function getFigmaFile(fileKey) {
    const url = `https://api.figma.com/v1/files/${fileKey}`;
    const response = await figmaAuth.makeAuthenticatedRequest(url);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка получения файла: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
}

async function getImageUrls(fileKey, nodeIds, format = 'png') {
    const ids = nodeIds.join(',');
    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=${format}`;
    const response = await figmaAuth.makeAuthenticatedRequest(url);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка получения URL изображений: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`Figma API ошибка: ${data.error}`);
    }

    return data.images;
}

async function downloadImage(url, outputPath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Ошибка скачивания изображения с ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(outputPath, buffer);
}

async function processNode({ nodeName, node, exportPath, name, config }, fileKey, outputDir) {
    const nodeIds = [node.id];
    const output = path.join(outputDir, exportPath);

    if (!fs.existsSync(output) && exportPath !== '') {
        await fs.promises.mkdir(output, { recursive: true });
    }

    const exportedFiles = [];

    // Экспортируем в выбранных форматах
    for (const format of EXPORT_FORMATS) {
        const fileName = `${nodeName}.${format}`;
        const outputPath = path.join(output, fileName);

        if (!fs.existsSync(outputPath)) {
            console.log(`   📤 Экспортируем в ${format.toUpperCase()}: ${fileName}`);
            const imageUrls = await getImageUrls(fileKey, nodeIds, format);
            const imageUrl = imageUrls[node.id];

            if (imageUrl) {
                await downloadImage(imageUrl, outputPath);
                exportedFiles.push(format);
            } else {
                console.log(`   ⚠️  Не удалось получить URL для формата ${format}`);
            }
        } else {
            console.log(`   ✅ Файл ${fileName} уже существует, пропускаем`);
            exportedFiles.push(format);
        }
    }

    // Генерируем src в зависимости от количества экспортированных форматов
    let srcPath;
    const basePath = `${BASE_ASSET_URL}/${exportPath}/${nodeName}`.replace('//', '/');

    if (exportedFiles.length === 1) {
        // Один формат: обычный путь
        srcPath = `${basePath}.${exportedFiles[0]}`;
    } else if (exportedFiles.length === 2 && exportedFiles.includes('png') && exportedFiles.includes('webp')) {
        // Оба формата: используем синтаксис {png,webp}
        srcPath = `${basePath}.{png,webp}`;
    } else {
        // Несколько форматов: перечисляем через запятую
        srcPath = `${basePath}.{${exportedFiles.join(',')}}`;
    }

    return {
        alias: name,
        src: srcPath
    };
}

async function main() {
    try {
        console.log('🔐 Проверяем OAuth авторизацию...');

        // Проверяем, что у нас есть валидные OAuth токены
        try {
            await figmaAuth.getValidToken();
            console.log('✅ OAuth авторизация успешна\n');
        } catch (error) {
            console.error('❌ Ошибка OAuth авторизации:', error.message);
            console.log('\n🚀 Система работает только с OAuth 2.0 авторизацией!');
            console.log('📚 Для настройки OAuth выполните:');
            console.log('   npm run setup-oauth\n');
            process.exit(1);
        }

        console.log('📁 Получаем данные из Figma...');
        const figmaData = await getFigmaFile(FILE_KEY);
        const document = figmaData.document;
        const firstPage = document.children.find(page => page.name === 'images');
        if (!firstPage) {
            throw new Error('Не найдена страница с именем "images" в файле Figma');
        }

        console.log('🎨 Начинаем экспорт элементов из Figma...');
        console.log(`📸 Режим экспорта: ${EXPORT_MODE.toUpperCase()}`);
        console.log(`📸 Форматы: ${EXPORT_FORMATS.map(f => f.toUpperCase()).join(', ')}`);
        if (EXPORT_MODE === 'both') {
            console.log(`📝 Формат мета-файла: {png,webp} синтаксис`);
        }
        console.log('');

        const collectedNodes = collectFolderNode(firstPage, '');
        const metaEntries = [];

        for (let i = 0; i < collectedNodes.length; i++) {
            const progress = `[${i + 1}/${collectedNodes.length}]`;
            console.log(`📦 ${progress} Обрабатываем узел: ${collectedNodes[i].name}`);

            try {
                const meta = await processNode(collectedNodes[i], FILE_KEY, OUTPUT_DIR);
                metaEntries.push(meta);
            } catch (error) {
                console.error(`❌ Ошибка обработки узла ${collectedNodes[i].name}:`, error.message);
                // Продолжаем обработку остальных узлов
            }
        }

        const formattedJSON = JSON.stringify(metaEntries, null, 0)
            .replace(/\},\{/g, '},\n    {') // Разделяем объекты с новой строкой
            .replace(/\[\{/g, '[\n    {')   // Добавляем новую строку после [
            .replace(/\}\]/g, '}\n]');

        const metaFilePath = path.join(OUTPUT_DIR, 'meta.json');
        await fs.promises.writeFile(metaFilePath, formattedJSON);
        console.log(`\n💾 Метафайл сохранён по пути: ${metaFilePath}`);
        console.log(`🎉 OAuth экспорт завершён! Обработано элементов: ${metaEntries.length}`);
        console.log('🚀 Система работает в OAuth-only режиме');
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);

        // Диагностика ошибок OAuth
        if (error.message.includes('401') || error.message.includes('Unauthorized') ||
            error.message.includes('invalid_grant') || error.message.includes('Токены истекли')) {
            console.log('\n🔄 Проблема с OAuth авторизацией:');
            console.log('   Запустите: npm run setup-oauth');
        } else if (error.message.includes('OAuth credentials') || error.message.includes('CLIENT_ID')) {
            console.log('\n⚙️  Необходимо настроить OAuth credentials в .env файле:');
            console.log('   FIGMA_CLIENT_ID=your_client_id');
            console.log('   FIGMA_CLIENT_SECRET=your_client_secret');
        }

        process.exit(1);
    }
}

 function collectFolderNode(node, currentExportPath = '') {
    let collected = [];

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            if (child.name.startsWith('path/')) {
                const newPath = child.name.substring('path/'.length).trim();
                collected = collected.concat(collectFolderNode(child, path.join(currentExportPath, newPath)));
            } else{
                collected = collected.concat(collectElementsNode(child, currentExportPath));
            }
        }
    }

    return collected;
}

 function collectElementsNode(node, exportPath) {
    let collected = []

    for (const config of exportsConfig) {
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
                collected.push({node, exportPath, name: node.name, nodeName: node.name});
        }
    }

    return collected;
}

 function collectAllSubNodes(node, config, parentName, currentExportPath = '') {
    let collected = [];

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const name = config.nameTemplate.replace('[parent]', parentName).replace('[node]', child.name);
            collected.push({ node: child, exportPath: currentExportPath, name, config, nodeName: child.name });
        }
    }

    return collected;
}

function collectComponentVariants(node, parentName, currentExportPath = '') {
    let collected = [];

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const nodeName = child.name.replace('type=', '');
            const name = `${parentName}_${nodeName}`;
            collected.push({ node: child, exportPath: currentExportPath, name, nodeName });
        }
    }

    return collected;
}

main();
