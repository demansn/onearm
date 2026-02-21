import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['tools/figma/src/cli.ts'],
    bundle: true,
    platform: 'node',
    target: 'es2022',
    format: 'esm',
    outfile: 'tools/figma/dist/cli.js',
    banner: { js: '#!/usr/bin/env node' },
    external: ['dotenv'],
});

console.log('tools/figma/dist/cli.js built successfully');
