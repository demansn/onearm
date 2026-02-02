#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

/**
 * Проверить доступность порта
 */
function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, () => {
            server.close(() => resolve(true));
        });
        
        server.on('error', () => resolve(false));
    });
}

/**
 * Основная функция проверки
 */
async function checkSetup() {
    console.log('🔍 Проверка настроек OAuth авторизации Figma\n');
    
    // Проверяем credentials
    const clientId = process.env.FIGMA_CLIENT_ID;
    const clientSecret = process.env.FIGMA_CLIENT_SECRET;
    const fileKey = process.env.FILE_KEY;
    
    console.log('📋 OAuth Credentials:');
    console.log(`   ✅ FIGMA_CLIENT_ID: ${clientId ? 'настроен' : '❌ НЕ НАЙДЕН'}`);
    console.log(`   ✅ FIGMA_CLIENT_SECRET: ${clientSecret ? 'настроен' : '❌ НЕ НАЙДЕН'}`);
    console.log(`   ✅ FILE_KEY: ${fileKey ? 'настроен' : '❌ НЕ НАЙДЕН'}\n`);
    
    if (!clientId || !clientSecret) {
        console.log('❌ Критическая ошибка: OAuth credentials не настроены');
        process.exit(1);
    }
    
    // Проверяем доступность портов
    console.log('🌐 Проверка портов:');
    const port3000Available = await checkPort(3000);
    const port3001Available = await checkPort(3001);
    
    console.log(`   Порт 3000: ${port3000Available ? '✅ свободен' : '❌ занят'}`);
    console.log(`   Порт 3001: ${port3001Available ? '✅ свободен' : '❌ занят'}\n`);
    
    // Рекомендации
    console.log('🎯 Рекомендации для Figma приложения:');
    console.log('   Перейдите на: https://www.figma.com/developers/apps');
    console.log(`   Найдите приложение с Client ID: ${clientId}`);
    console.log('   Убедитесь что настроены следующие Redirect URIs:\n');
    
    if (port3000Available) {
        console.log('   ✅ http://localhost:3000/callback (основной)');
        if (port3001Available) {
            console.log('   💡 http://localhost:3001/callback (резервный)');
        }
    } else {
        if (port3001Available) {
            console.log('   ⚠️  http://localhost:3000/callback (порт занят)');
            console.log('   ✅ http://localhost:3001/callback (будет использован)');
        } else {
            console.log('   ❌ Оба порта (3000, 3001) заняты!');
            console.log('   💡 Освободите один из портов или настройте другой порт');
        }
    }
    
    console.log('\n🚀 После настройки redirect URIs выполните:');
    console.log('   npm run setup-oauth');
}

// Запускаем если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    checkSetup().catch(error => {
        console.error('❌ Ошибка проверки:', error.message);
        process.exit(1);
    });
}