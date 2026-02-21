#!/usr/bin/env node

const command = process.argv[2] || 'setup';

switch (command) {
    case 'setup': {
        const { run } = await import('../scripts/auth/setup-oauth.js');
        await run().catch(error => {
            console.error('❌ Ошибка настройки OAuth:', error.message);
            process.exit(1);
        });
        break;
    }
    case 'check': {
        const { run } = await import('../scripts/auth/check-setup.js');
        await run().catch(error => {
            console.error('❌ Ошибка проверки:', error.message);
            process.exit(1);
        });
        break;
    }
    default:
        console.log(`Unknown command: ${command}`);
        console.log('Usage: onearm-oauth-figma [setup|check]');
        console.log('  setup  - Setup OAuth authorization (default)');
        console.log('  check  - Check OAuth configuration');
        process.exit(1);
}
