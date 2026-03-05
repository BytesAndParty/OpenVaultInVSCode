import esbuild from 'esbuild';
import process from 'node:process';

const isProduction = process.argv.includes('--production');

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*'],
  format: 'cjs',
  platform: 'node',
  target: 'es2020',
  outfile: 'main.js',
  sourcemap: isProduction ? false : 'inline',
  logLevel: 'info'
});

if (isProduction) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log('[open-vault-in-vscode] Watching for changes...');
}
