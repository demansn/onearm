#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { FigmaAuth } from './FigmaAuth.js';
import http from 'http';
import { parse } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

let PORT = 3000; // Стандартный порт для Figma OAuth
let REDIRECT_URI = `http://localhost:${PORT}/callback`;

/**
 * Утилита для настройки OAuth авторизации с Figma
 */
class OAuthSetup {
    constructor() {
        this.auth = null; // Будет инициализирован позже
        this.server = null;
    }

    /**
     * Найти свободный порт начиная с 3000
     */
    async findAvailablePort(startPort = 3000) {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            
            server.listen(startPort, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            
            server.on('error', () => {
                // Порт занят, пробуем следующий
                this.findAvailablePort(startPort + 1).then(resolve).catch(reject);
            });
        });
    }

    /**
     * Запустить процесс OAuth авторизации
     */
    async setup() {
        console.log('🔐 Настройка OAuth авторизации для Figma API\n');

        // Проверяем OAuth credentials (обязательно для OAuth-only режима)
        try {
            // Проверяем credentials через конструктор FigmaAuth
            this.auth = new FigmaAuth();
        } catch (error) {
            console.error('❌ Критическая ошибка:', error.message);
            console.error('   Система теперь работает только с OAuth авторизацией.\n');
            this.showSetupInstructions();
            process.exit(1);
        }

        try {
            // Проверяем, есть ли уже валидные токены
            const existingToken = await this.auth.getOAuthToken();
            console.log('✅ OAuth токены уже настроены и действительны!');
            console.log('🚀 OAuth-only авторизация готова к использованию.\n');
            return;
        } catch (error) {
            console.log('📝 OAuth токены не найдены или истекли, запускаем процесс авторизации...\n');
        }

        // Находим свободный порт
        PORT = await this.findAvailablePort(3000);
        REDIRECT_URI = `http://localhost:${PORT}/callback`;
        
        if (PORT !== 3000) {
            console.log(`⚠️  Порт 3000 занят, используем порт ${PORT}`);
            console.log(`📋 Убедитесь что в Figma приложении настроен redirect URI: ${REDIRECT_URI}\n`);
        }

        await this.startOAuthFlow();
    }

    /**
     * Запустить OAuth flow
     */
    async startOAuthFlow() {
        return new Promise((resolve, reject) => {
            // Создаем временный HTTP сервер для получения authorization code
            this.server = http.createServer(async (req, res) => {
                const parsedUrl = parse(req.url, true);
                
                if (parsedUrl.pathname === '/callback') {
                    try {
                        await this.handleCallback(parsedUrl.query, res);
                        resolve();
                    } catch (error) {
                        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`
                            <html>
                                <body style="font-family: Arial, sans-serif; padding: 40px;">
                                    <h1>❌ Ошибка авторизации</h1>
                                    <p>${error.message}</p>
                                    <p><a href="javascript:window.close();">Закрыть окно</a></p>
                                </body>
                            </html>
                        `);
                        reject(error);
                    }
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                }
            });

            this.server.listen(PORT, () => {
                const authUrl = this.auth.getAuthorizationUrl(REDIRECT_URI);
                console.log(`🌐 Временный сервер запущен на http://localhost:${PORT}`);
                console.log(`\n🚀 Откройте следующую ссылку в браузере для авторизации:`);
                console.log(`\n${authUrl}\n`);
                console.log(`📋 Или скопируйте и вставьте эту ссылку в адресную строку браузера\n`);
                console.log(`⏱️  Ожидаем завершения авторизации...`);
            });

            // Таймаут на 10 минут
            setTimeout(() => {
                reject(new Error('Таймаут авторизации (10 минут)'));
            }, 10 * 60 * 1000);
        });
    }

    /**
     * Обработать callback от Figma
     */
    async handleCallback(query, res) {
        if (query.error) {
            throw new Error(`Ошибка авторизации: ${query.error_description || query.error}`);
        }

        if (!query.code) {
            throw new Error('Authorization code не получен');
        }

        console.log('✅ Authorization code получен, обмениваем на токены...');

        // Обмениваем код на токены
        const tokens = await this.auth.exchangeCodeForTokens(query.code, REDIRECT_URI);

        // Отправляем успешный ответ
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <html>
                <head>
                    <title>Авторизация успешна</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                        .success { color: #22c55e; font-size: 48px; }
                        .message { font-size: 18px; margin: 20px 0; }
                        .details { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="success">✅</div>
                    <h1>Авторизация успешна!</h1>
                    <p class="message">OAuth токены сохранены и готовы к использованию.</p>
                    <div class="details">
                        <p><strong>Срок действия токена:</strong> ${Math.round(tokens.expires_in / 3600)} часов</p>
                        <p><strong>Тип токена:</strong> ${tokens.token_type}</p>
                    </div>
                    <p><a href="javascript:window.close();">Закрыть это окно</a></p>
                </body>
            </html>
        `);

        console.log('🎉 OAuth авторизация успешно завершена!');
        console.log(`💾 Токены сохранены в: ${this.auth.tokenFile}`);
        console.log(`⏰ Срок действия access token: ${Math.round(tokens.expires_in / 3600)} часов`);
        console.log('🔄 Refresh token обеспечивает автоматическое обновление');
        console.log('🚀 Система работает в OAuth-only режиме\n');

        // Закрываем сервер
        setTimeout(() => {
            this.server?.close();
        }, 1000);
    }

    /**
     * Показать инструкции по настройке
     */
    showSetupInstructions() {
        console.log('📚 Обязательная настройка OAuth (система работает только с OAuth):\n');
        console.log('1. Создайте приложение в Figma:');
        console.log('   - Перейдите на https://www.figma.com/developers/apps');
        console.log('   - Нажмите "Create new app"');
        console.log('   - Заполните название и описание\n');
        
        console.log('2. Настройте redirect URI:');
        console.log(`   - Добавьте: http://localhost:3000/callback`);
        console.log(`   - Или: http://localhost:3001/callback (если порт 3000 занят)\n`);
        
        console.log('3. Скопируйте Client ID и Client Secret в .env файл:');
        console.log('   FIGMA_CLIENT_ID=your_client_id_here');
        console.log('   FIGMA_CLIENT_SECRET=your_client_secret_here\n');
        
        console.log('4. Запустите эту команду снова после настройки\n');
        console.log('⚠️  Обратите внимание: Personal Access Token (FIGMA_TOKEN) больше не поддерживается.');
        console.log('   Система полностью перешла на OAuth 2.0 авторизацию.\n');
    }
}

// Запускаем если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new OAuthSetup();
    setup.setup().catch(error => {
        console.error('❌ Ошибка настройки OAuth:', error.message);
        process.exit(1);
    });
}