/**
 * Folder Wiki — Browse & edit a folder of .md files as a Feather Wiki.
 *
 * Usage: node scripts/folder-wiki.js <folder> [--port 3000] [--build]
 */
import path from 'path';
import fs from 'fs';
import http from 'http';
import esbuild from 'esbuild';
import { readFolder } from './lib/folder-reader.js';
import { diffPages } from './lib/page-differ.js';
import { writePageToFile, createPageFile, deletePageFile } from './lib/folder-writer.js';
import { compress } from '../helpers/jsonCompress.js';

// --- CLI args ---
const args = process.argv.slice(2);
const folderArg = args.find(a => !a.startsWith('--'));
if (!folderArg) {
  console.error('Usage: node scripts/folder-wiki.js <folder> [--port 3000] [--build]');
  process.exit(1);
}

const folderPath = path.resolve(process.cwd(), folderArg);
if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
  console.error(`Error: "${folderArg}" is not a directory`);
  process.exit(1);
}

const portIdx = args.indexOf('--port');
const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3000;
const buildOnly = args.includes('--build');

// --- State ---
let currentPages = [];
let currentMapping = null;
let currentReverseMapping = null;
let currentHtml = '';
let writePaused = false; // Pause fs.watch while we write

// --- Build pipeline (reuses develop.js pattern) ---
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

async function buildHtml() {
  // Read folder
  const { pages, images, mapping, reverseMapping, wikiMeta } = readFolder(folderPath);
  currentPages = pages;
  currentMapping = mapping;
  currentReverseMapping = reverseMapping;

  // esbuild bundle (same config as develop.js)
  const result = await esbuild.build({
    entryPoints: [path.join(projectRoot, 'index.js')],
    define: {
      'process.env.NODE_ENV': '"development"',
      'process.env.NODE_DEBUG': '"debug"',
    },
    sourcemap: 'inline',
    write: false,
    bundle: true,
    minify: false,
    platform: 'browser',
    format: 'iife',
    target: ['es2015'],
    outdir: 'build',
  });

  // CSS build
  const cssResult = esbuild.buildSync({
    entryPoints: [path.join(projectRoot, 'index.css')],
    write: false,
    bundle: true,
    minify: false,
    outdir: 'build',
  });

  // Read HTML template
  let html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

  // Inject CSS and JS
  for (const out of [...cssResult.outputFiles, ...result.outputFiles]) {
    const output = new TextDecoder().decode(out.contents);
    if (/\.css$/.test(out.path)) {
      html = html.replace('{{cssOutput}}', output);
    } else if (/\.js$/.test(out.path)) {
      const htmlParts = html.split('{{jsOutput}}');
      html = htmlParts[0] + output + htmlParts[1];
    }
  }

  // Inject package.json variables
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const matches = html.match(/(?<={{)package\.json:.+?(?=}})/g);
  if (matches?.length > 0) {
    matches.map(match => {
      const value = match.replace('package.json:', '').trim();
      const replace = value.split('.').reduce((result, current) => {
        if (result === null) return packageJson[current] ?? '';
        return result[current] ?? '';
      }, null);
      return { match: `{{${match}}}`, replace };
    }).forEach(m => {
      html = html.replace(m.match, m.replace);
    });
  }

  // Replace locale placeholder with en-US
  html = html.replace(/\{\{localeName\}\}/g, 'en-US');

  // Replace translation placeholders with English values
  const localePath = path.join(projectRoot, 'locales', 'en-US.json');
  const locale = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
  for (const [key, value] of Object.entries(locale)) {
    const regex = new RegExp('\\{\\{translate: ?' + key + '\\}\\}', 'g');
    let translation = value;
    if (key === 'javascriptRequired') {
      translation = `<a href="https://src.feather.wiki/#browser-compatibility">${translation}</a>`;
    }
    html = html.replace(regex, translation);
  }

  // Build wiki data object
  const wikiData = {
    name: wikiMeta.name,
    desc: wikiMeta.desc,
    pages: pages,
    img: images,
  };
  if (wikiMeta.home) wikiData.home = wikiMeta.home;

  // Inject compressed wiki data into <script id="p">
  const compressedData = JSON.stringify(compress(wikiData));
  html = html.replace(
    /<script id="p" type="application\/json">\{\}<\/script>/,
    `<script id="p" type="application/json">${compressedData}</script>`
  );

  currentHtml = html;
  return html;
}

// --- Main ---
try {
  console.log(`Reading folder: ${folderPath}`);
  await buildHtml();
  console.log(`Built wiki with ${currentPages.length} pages`);

  if (buildOnly) {
    const buildDir = path.join(folderPath, '_build');
    fs.mkdirSync(buildDir, { recursive: true });
    const outPath = path.join(buildDir, 'wiki.html');
    fs.writeFileSync(outPath, currentHtml);
    console.log(`Static wiki written to ${outPath}`);
    process.exit(0);
  }

  // Start HTTP server with WebDAV support
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(currentHtml);
    } else if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        DAV: '1',
        Allow: 'GET, PUT, OPTIONS',
        'Content-Length': '0',
      });
      res.end();
    } else if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { wikiData, modified, added, deleted } = diffPages(body, currentPages, currentMapping);

          // Pause file watcher while we write
          writePaused = true;

          for (const page of modified) {
            const info = currentMapping.get(page.id);
            if (info) {
              console.log(`  Updated: ${info.relativePath}`);
              writePageToFile(page, info.fullPath);
            }
          }

          for (const page of added) {
            const relativePath = createPageFile(page, folderPath, currentMapping);
            console.log(`  Created: ${relativePath}`);
          }

          for (const page of deleted) {
            const info = currentMapping.get(page.id);
            if (info) {
              console.log(`  Deleted: ${info.relativePath} → .trash/`);
              deletePageFile(info.fullPath, folderPath);
            }
          }

          const totalChanges = modified.length + added.length + deleted.length;
          if (totalChanges > 0) {
            console.log(`Synced ${totalChanges} change(s) to disk`);
          }

          // Rebuild from disk to pick up any changes
          await buildHtml();

          // Resume file watcher after a short delay
          setTimeout(() => { writePaused = false; }, 500);

          res.writeHead(204);
          res.end();
        } catch (err) {
          console.error('Error processing PUT:', err);
          writePaused = false;
          res.writeHead(500);
          res.end(err.message);
        }
      });
    } else {
      res.writeHead(405);
      res.end();
    }
  });

  server.listen(port, 'localhost');
  console.log(`Folder wiki server running at http://localhost:${port}`);

  // File watcher with debounce
  let watchTimeout = null;
  fs.watch(folderPath, { recursive: true }, (eventType, filename) => {
    if (writePaused) return;
    if (!filename) return;
    // Ignore hidden/special directories and non-md files (unless in _images or _wiki.md)
    if (filename.startsWith('.')) return;
    const isRelevant = filename.endsWith('.md')
      || filename.startsWith('_images' + path.sep)
      || filename === '_wiki.md';
    if (!isRelevant) return;

    clearTimeout(watchTimeout);
    watchTimeout = setTimeout(async () => {
      try {
        console.log(`File changed: ${filename}, rebuilding...`);
        await buildHtml();
        console.log(`Rebuilt wiki with ${currentPages.length} pages`);
      } catch (err) {
        console.error('Rebuild error:', err.message);
      }
    }, 300);
  });

  console.log('Watching for file changes...');
} catch (err) {
  console.error(err);
  process.exit(1);
}
