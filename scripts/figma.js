require('dotenv').config();

const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FILE_KEY;
const OUTPUT_DIR = path.join(__dirname, '../assets/img');
const BASE_ASSET_URL = './assets/img';

async function main() {
    try {
        const figmaData = await getFigmaFile(FILE_KEY);
        const document = figmaData.document;
        const firstPage = document.children[1];

        console.log(firstPage);
    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

async function getFigmaFile(fileKey) {
    const url = `https://api.figma.com/v1/files/${fileKey}`;
    const response = await fetch(url, {
        headers: { 'X-Figma-Token': FIGMA_TOKEN }
    });
    if (!response.ok) {
        throw new Error(`Ошибка получения файла: ${response.statusText}`);
    }
    return await response.json();
}


await main();
