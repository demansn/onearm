import net from 'net';

function checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
    });
}

export async function run(_args: string[]): Promise<void> {
    console.log('Checking Figma OAuth configuration\n');

    const clientId = process.env.FIGMA_CLIENT_ID;
    const clientSecret = process.env.FIGMA_CLIENT_SECRET;
    const fileKey = process.env.FILE_KEY;

    console.log('OAuth Credentials:');
    console.log(`  FIGMA_CLIENT_ID: ${clientId ? 'OK' : 'NOT FOUND'}`);
    console.log(`  FIGMA_CLIENT_SECRET: ${clientSecret ? 'OK' : 'NOT FOUND'}`);
    console.log(`  FILE_KEY: ${fileKey ? 'OK' : 'NOT FOUND'}\n`);

    if (!clientId || !clientSecret) {
        console.log('Error: OAuth credentials not configured');
        process.exit(1);
    }

    console.log('Checking ports:');
    const port3000Available = await checkPort(3000);
    const port3001Available = await checkPort(3001);

    console.log(`  Port 3000: ${port3000Available ? 'available' : 'busy'}`);
    console.log(`  Port 3001: ${port3001Available ? 'available' : 'busy'}\n`);

    console.log('Recommended redirect URIs for Figma app:');
    console.log(`  https://www.figma.com/developers/apps`);
    console.log(`  Client ID: ${clientId}\n`);

    if (port3000Available) {
        console.log('  http://localhost:3000/callback (primary)');
        if (port3001Available) {
            console.log('  http://localhost:3001/callback (fallback)');
        }
    } else if (port3001Available) {
        console.log('  http://localhost:3000/callback (port busy)');
        console.log('  http://localhost:3001/callback (will be used)');
    } else {
        console.log('  Both ports (3000, 3001) are busy!');
    }

    console.log('\nAfter configuring redirect URIs, run:');
    console.log('  npx onearm-figma oauth-setup');
}
