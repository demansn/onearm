import fs from 'fs';
import path from 'path';
import { findGameRoot } from '../utils/find-game-root.js';

export interface FigmaTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
}

export class FigmaAuth {
    tokenFile: string;
    clientId: string;
    clientSecret: string;

    constructor() {
        const gameRoot = findGameRoot();
        this.tokenFile = path.join(gameRoot, '.figma-tokens.json');
        this.clientId = process.env.FIGMA_CLIENT_ID || '';
        this.clientSecret = process.env.FIGMA_CLIENT_SECRET || '';

        if (!this.clientId || !this.clientSecret) {
            throw new Error('OAuth credentials required: FIGMA_CLIENT_ID and FIGMA_CLIENT_SECRET must be set in .env file');
        }
    }

    async getValidToken(): Promise<string> {
        return await this.getOAuthToken();
    }

    async getOAuthToken(): Promise<string> {
        const storedTokens = this.loadStoredTokens();

        if (!storedTokens || !storedTokens.refresh_token) {
            throw new Error(
                'OAuth tokens not found. Run: npx onearm-figma oauth-setup'
            );
        }

        if (this.isTokenValid(storedTokens)) {
            return storedTokens.access_token;
        }

        console.log('Updating access token via refresh token...');
        try {
            const newTokens = await this.refreshAccessToken(storedTokens.refresh_token);
            this.saveTokens(newTokens);
            console.log('Token updated successfully');
            return newTokens.access_token;
        } catch (error: any) {
            if (error.message.includes('invalid_grant')) {
                throw new Error(
                    'Refresh token expired. Re-authorize: npx onearm-figma oauth-setup'
                );
            }
            throw error;
        }
    }

    isTokenValid(tokens: FigmaTokens | null): boolean {
        if (!tokens || !tokens.access_token || !tokens.expires_at) {
            return false;
        }
        const bufferTime = 5 * 60 * 1000;
        return Date.now() < (tokens.expires_at - bufferTime);
    }

    async refreshAccessToken(refreshToken: string): Promise<FigmaTokens> {
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
            throw new Error(`Token refresh error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`OAuth error: ${data.error_description || data.error}`);
        }

        const expiresAt = Date.now() + (data.expires_in * 1000);

        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken,
            expires_in: data.expires_in,
            expires_at: expiresAt,
            token_type: data.token_type || 'Bearer'
        };
    }

    loadStoredTokens(): FigmaTokens | null {
        try {
            if (!fs.existsSync(this.tokenFile)) {
                return null;
            }
            const data = fs.readFileSync(this.tokenFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    saveTokens(tokens: FigmaTokens): void {
        const dir = path.dirname(this.tokenFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2));
    }

    async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
        const token = await this.getValidToken();

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            console.log('Got 401, refreshing token...');
            const storedTokens = this.loadStoredTokens();
            if (storedTokens?.refresh_token) {
                const newTokens = await this.refreshAccessToken(storedTokens.refresh_token);
                this.saveTokens(newTokens);
                headers['Authorization'] = `Bearer ${newTokens.access_token}`;
                return await fetch(url, { ...options, headers });
            }
            throw new Error('Refresh token not found. Run: npx onearm-figma oauth-setup');
        }

        return response;
    }

    getAuthorizationUrl(redirectUri: string = 'http://localhost:3000/callback'): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            scope: 'file_read',
            response_type: 'code',
            state: Math.random().toString(36).substring(7)
        });
        return `https://www.figma.com/oauth?${params.toString()}`;
    }

    async exchangeCodeForTokens(code: string, redirectUri: string): Promise<FigmaTokens> {
        const response = await fetch('https://api.figma.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: redirectUri,
                code,
                grant_type: 'authorization_code'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Code exchange error: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`OAuth error: ${data.error_description || data.error}`);
        }

        const expiresAt = Date.now() + (data.expires_in * 1000);
        const tokens: FigmaTokens = {
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
