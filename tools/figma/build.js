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

// Build Figma plugin
await esbuild.build({
    entryPoints: ['tools/figma/plugin/code.ts'],
    bundle: true,
    platform: 'neutral',
    target: 'es2022',
    format: 'iife',
    outfile: 'tools/figma/plugin/dist/code.js',
});

console.log('tools/figma/plugin/dist/code.js built successfully');
