import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const root = process.cwd();
const outDir = path.join(root, 'dist-standalone');

await build({
  root,
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.join(root, 'src/main.tsx'),
      name: 'FieldnotesApp',
      formats: ['iife'],
      fileName: () => 'fieldnotes.iife.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

const files = fs.readdirSync(outDir);
const jsFile = files.find((f) => f.endsWith('.js'));
const cssFile = files.find((f) => f.endsWith('.css'));

if (!jsFile || !cssFile) {
  throw new Error(`Expected .js and .css in ${outDir}, found: ${files.join(', ')}`);
}

const js = fs
  .readFileSync(path.join(outDir, jsFile), 'utf8')
  .replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(outDir, cssFile), 'utf8');
const wasmB64 = fs.readFileSync(path.join(root, 'public/sql-wasm.wasm')).toString('base64');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#FAF8F5" />
    <title>Fieldnotes — Return Visit &amp; Bible Study Journal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,400&display=swap"
      rel="stylesheet"
    />
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__SQL_WASM_BASE64__ = "${wasmB64}";
    </script>
    <script>${js}</script>
  </body>
</html>
`;

const repoOut = path.join(root, 'fieldnotes.html');
fs.writeFileSync(repoOut, html, 'utf8');

const artifactArg = process.argv[2];
if (artifactArg) {
  fs.writeFileSync(artifactArg, html, 'utf8');
}

fs.rmSync(outDir, { recursive: true, force: true });
console.log(`Built standalone fieldnotes.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
