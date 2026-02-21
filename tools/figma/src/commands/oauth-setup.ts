import http from 'http';
import net from 'net';
import { parse } from 'url';
import { FigmaAuth, FigmaTokens } from '../auth/FigmaAuth.js';

async function findAvailablePort(startPort: number = 3000): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.listen(startPort, () => {
            const addr = server.address();
            const port = typeof addr === 'object' && addr ? addr.port : startPort;
            server.close(() => resolve(port));
        });

        server.on('error', () => {
            findAvailablePort(startPort + 1).then(resolve).catch(reject);
        });
    });
}

export async function run(_args: string[]): Promise<void> {
    console.log('OAuth authorization setup for Figma API\n');

    let auth: FigmaAuth;

    try {
        auth = new FigmaAuth();
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        showSetupInstructions();
        process.exit(1);
    }

    try {
        await auth.getOAuthToken();
        console.log('OAuth tokens are already configured and valid!');
        return;
    } catch {
        console.log('OAuth tokens not found or expired, starting authorization...\n');
    }

    const port = await findAvailablePort(3000);
    const redirectUri = `http://localhost:${port}/callback`;

    if (port !== 3000) {
        console.log(`Port 3000 is busy, using port ${port}`);
        console.log(`Make sure this redirect URI is configured in Figma app: ${redirectUri}\n`);
    }

    return new Promise<void>((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const parsedUrl = parse(req.url || '', true);

            if (parsedUrl.pathname === '/callback') {
                try {
                    const query = parsedUrl.query;

                    if (query.error) {
                        throw new Error(`Authorization error: ${query.error_description || query.error}`);
                    }

                    if (!query.code || typeof query.code !== 'string') {
                        throw new Error('Authorization code not received');
                    }

                    console.log('Authorization code received, exchanging for tokens...');

                    const tokens: FigmaTokens = await auth.exchangeCodeForTokens(query.code, redirectUri);

                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <html>
                            <head><title>Authorization successful</title>
                            <style>
                                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                                .success { color: #22c55e; font-size: 48px; }
                            </style></head>
                            <body>
                                <div class="success">OK</div>
                                <h1>Authorization successful!</h1>
                                <p>OAuth tokens saved. You can close this window.</p>
                                <p>Token expires in: ${Math.round(tokens.expires_in / 3600)} hours</p>
                            </body>
                        </html>
                    `);

                    console.log('OAuth authorization complete!');
                    console.log(`Tokens saved to: ${auth.tokenFile}`);
                    console.log(`Access token expires in: ${Math.round(tokens.expires_in / 3600)} hours`);

                    setTimeout(() => {
                        server.close();
                        resolve();
                    }, 1000);
                } catch (error: any) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <html><body style="font-family: Arial, sans-serif; padding: 40px;">
                            <h1>Authorization error</h1>
                            <p>${error.message}</p>
                        </body></html>
                    `);
                    reject(error);
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });

        server.listen(port, () => {
            const authUrl = auth.getAuthorizationUrl(redirectUri);
            console.log(`Temporary server running on http://localhost:${port}`);
            console.log(`\nOpen the following link in your browser:\n`);
            console.log(authUrl);
            console.log(`\nWaiting for authorization...`);
        });

        setTimeout(() => {
            server.close();
            reject(new Error('Authorization timeout (10 minutes)'));
        }, 10 * 60 * 1000);
    });
}

function showSetupInstructions(): void {
    console.log('\nOAuth setup instructions:\n');
    console.log('1. Create a Figma app:');
    console.log('   https://www.figma.com/developers/apps\n');
    console.log('2. Configure redirect URI:');
    console.log('   http://localhost:3000/callback\n');
    console.log('3. Add credentials to .env:');
    console.log('   FIGMA_CLIENT_ID=your_client_id');
    console.log('   FIGMA_CLIENT_SECRET=your_client_secret\n');
    console.log('4. Run this command again\n');
}
