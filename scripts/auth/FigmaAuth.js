import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FigmaAuth {
    constructor() {
        this.tokenFile = path.join(__dirname, '../../../../.figma-tokens.json');
        this.clientId = process.env.FIGMA_CLIENT_ID;
        this.clientSecret = process.env.FIGMA_CLIENT_SECRET;
        
        // Validate required OAuth credentials
        if (!this.clientId || !this.clientSecret) {
            throw new Error('OAuth credentials required: FIGMA_CLIENT_ID and FIGMA_CLIENT_SECRET must be set in .env file');
        }
    }

    /**
     * Получить валидный OAuth токен
     */
    async getValidToken() {
        return await this.getOAuthToken();
    }

    /**
     * Получить или обновить OAuth токен
     */
    async getOAuthToken() {
        const storedTokens = this.loadStoredTokens();
        
        if (!storedTokens || !storedTokens.refresh_token) {
            throw new Error(
                'OAuth токены не найдены. Выполните первичную авторизацию командой: npm run setup-oauth'
            );
        }

        // Проверяем, не истек ли access token
        if (this.isTokenValid(storedTokens)) {
            return storedTokens.access_token;
        }

        // Обновляем токен через refresh token
        console.log('🔄 Access token истек, обновляем через refresh token...');
        try {
            const newTokens = await this.refreshAccessToken(storedTokens.refresh_token);
            this.saveTokens(newTokens);
            console.log('✅ Токен успешно обновлен');
            return newTokens.access_token;
        } catch (error) {
            // Если refresh token тоже истек
            if (error.message.includes('invalid_grant')) {
                throw new Error(
                    'Refresh token истек. Требуется повторная авторизация: npm run setup-oauth'
                );
            }
            throw error;
        }
    }

    /**
     * Проверить, действителен ли токен
     */
    isTokenValid(tokens) {
        if (!tokens || !tokens.access_token || !tokens.expires_at) {
            return false;
        }

        // Добавляем буфер в 5 минут для безопасности
        const bufferTime = 5 * 60 * 1000; // 5 минут в миллисекундах
        return Date.now() < (tokens.expires_at - bufferTime);
    }

    /**
     * Обновить access token через refresh token
     */
    async refreshAccessToken(refreshToken) {
        const response = await fetch('https://api.figma.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка обновления токена: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`OAuth ошибка: ${data.error_description || data.error}`);
        }

        // Вычисляем время истечения
        const expiresAt = Date.now() + (data.expires_in * 1000);
        
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken, // Некоторые сервисы не возвращают новый refresh token
            expires_in: data.expires_in,
            expires_at: expiresAt,
            token_type: data.token_type || 'Bearer'
        };
    }

    /**
     * Загрузить сохраненные токены
     */
    loadStoredTokens() {
        try {
            if (!fs.existsSync(this.tokenFile)) {
                return null;
            }

            const data = fs.readFileSync(this.tokenFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.warn('Ошибка загрузки сохраненных токенов:', error.message);
            return null;
        }
    }

    /**
     * Сохранить токены
     */
    saveTokens(tokens) {
        try {
            const dir = path.dirname(this.tokenFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2));
            console.log('💾 Токены успешно сохранены');
        } catch (error) {
            console.error('Ошибка сохранения токенов:', error.message);
            throw error;
        }
    }

    /**
     * Выполнить авторизованный запрос с автоматическим retry
     */
    async makeAuthenticatedRequest(url, options = {}) {
        const token = await this.getValidToken();

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Если 401, пытаемся обновить токен и повторить запрос
            if (response.status === 401) {
                console.log('🔄 Получен 401, пытаемся обновить токен...');
                
                // Принудительно обновляем токен
                const storedTokens = this.loadStoredTokens();
                if (storedTokens?.refresh_token) {
                    try {
                        const newTokens = await this.refreshAccessToken(storedTokens.refresh_token);
                        this.saveTokens(newTokens);
                        
                        // Повторяем запрос с новым токеном
                        headers['Authorization'] = `Bearer ${newTokens.access_token}`;
                        console.log('🔄 Повторяем запрос с обновленным токеном...');
                        return await fetch(url, { ...options, headers });
                    } catch (refreshError) {
                        if (refreshError.message.includes('invalid_grant')) {
                            throw new Error(
                                'Токены истекли. Требуется повторная авторизация: npm run setup-oauth'
                            );
                        }
                        throw refreshError;
                    }
                } else {
                    throw new Error('Refresh token не найден. Выполните: npm run setup-oauth');
                }
            }

            return response;
        } catch (error) {
            console.error('❌ Ошибка авторизованного запроса:', error.message);
            throw error;
        }
    }

    /**
     * Получить URL для первичной OAuth авторизации
     */
    getAuthorizationUrl(redirectUri = 'http://localhost:3000/callback') {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            scope: 'file_read',
            response_type: 'code',
            state: Math.random().toString(36).substring(7) // Простая защита от CSRF
        });

        return `https://www.figma.com/oauth?${params.toString()}`;
    }

    /**
     * Обменять authorization code на токены
     */
    async exchangeCodeForTokens(code, redirectUri) {
        const tokenParams = {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: redirectUri,
            code: code,
            grant_type: 'authorization_code'
        };
        
        console.log('🔄 Обмениваем authorization code на токены...');
        console.log('📋 Параметры запроса:');
        console.log(`   client_id: ${tokenParams.client_id}`);
        console.log(`   redirect_uri: ${tokenParams.redirect_uri}`);
        console.log(`   grant_type: ${tokenParams.grant_type}`);
        console.log(`   code: ${code.substring(0, 10)}...`);
        
        // Используем правильный Figma OAuth endpoint
        const url = 'https://api.figma.com/v1/oauth/token';
        console.log('🌐 URL запроса:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'SlotGameEngine/1.0.0',
            },
            body: new URLSearchParams(tokenParams)
        });
        
        console.log(`📡 Ответ сервера: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Детали ошибки:', errorText);
            throw new Error(`Ошибка обмена кода на токены: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`OAuth ошибка: ${data.error_description || data.error}`);
        }

        const expiresAt = Date.now() + (data.expires_in * 1000);
        const tokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            expires_at: expiresAt,
            token_type: data.token_type
        };

        this.saveTokens(tokens);
        return tokens;
    }
}