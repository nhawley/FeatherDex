import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseFrontmatter } from './frontmatter.js';

/**
 * Generate a stable 9-character ID from a relative path.
 * Matches Feather Wiki's 9-char ID format.
 */
function stableId(relativePath) {
  return crypto.createHash('sha256').update(relativePath).digest('base64url').slice(0, 9);
}

/**
 * Replicate FW.slug: lowercase, spaces→_, special ASCII chars→-
 */
function slug(s) {
  return s?.toLowerCase().replace(/\s/g, '_').replace(/[\x00-\x2F\x3A-\x40[\\\]^`\x7B-\x7F]/g, '-');
}

/**
 * Title-case a filename (without extension).
 * e.g. "getting-started" → "Getting Started"
 */
function titleCase(filename) {
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Recursively discover .md files in a directory.
 * Skips directories starting with _ or .
 */
function discoverFiles(dir, rootDir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      discoverFiles(fullPath, rootDir, results);
    } else if (entry.name.endsWith('.md')) {
      const relativePath = path.relative(rootDir, fullPath);
      results.push({ fullPath, relativePath });
    }
  }
  return results;
}

/**
 * Read a folder of .md files and produce Feather Wiki page objects.
 * @param {string} folderPath - Absolute path to the folder
 * @returns {{ pages: object[], images: object, mapping: Map, wikiMeta: object }}
 */
export function readFolder(folderPath) {
  const mapping = new Map(); // id → { relativePath, fullPath }
  const reverseMapping = new Map(); // relativePath → id
  const pages = [];
  const images = {};

  // Read wiki meta from _wiki.md if it exists
  const wikiMeta = { name: 'Wiki', desc: '' };
  const wikiMetaPath = path.join(folderPath, '_wiki.md');
  if (fs.existsSync(wikiMetaPath)) {
    const content = fs.readFileSync(wikiMetaPath, 'utf-8');
    const { attributes } = parseFrontmatter(content);
    if (attributes.name) wikiMeta.name = attributes.name;
    if (attributes.desc) wikiMeta.desc = attributes.desc;
    if (attributes.description) wikiMeta.desc = attributes.description;
  }

  // Discover all .md files
  const files = discoverFiles(folderPath, folderPath);

  // First pass: generate IDs and build mapping
  for (const { fullPath, relativePath } of files) {
    const id = stableId(relativePath);
    mapping.set(id, { relativePath, fullPath });
    reverseMapping.set(relativePath, id);
  }

  // Second pass: build page objects (without frontmatter parent overrides)
  let homeId = null;
  const frontmatterParents = new Map(); // id → parent slug from frontmatter
  for (const { fullPath, relativePath } of files) {
    const id = reverseMapping.get(relativePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const { attributes, body } = parseFrontmatter(content);

    const basename = path.basename(relativePath, '.md');
    const dirPart = path.dirname(relativePath);

    // Derive page name
    const name = attributes.title || titleCase(basename);

    // Derive slug
    const pageSlug = slug(name);

    // Ensure unique slug
    let finalSlug = pageSlug;
    let d = 0;
    while (pages.some(p => p.slug === finalSlug)) {
      d++;
      finalSlug = pageSlug + '_' + d;
    }

    // Build page object
    const page = {
      id,
      name,
      slug: finalSlug,
      content: body,
      editor: 'md',
      cd: Date.now(),
      md: Date.now(),
    };

    // Tags
    if (attributes.tags) {
      page.tags = attributes.tags;
    }

    // Parent: directory-based by default
    if (attributes.parent) {
      // Defer frontmatter parent resolution to third pass (all slugs must exist first)
      frontmatterParents.set(id, slug(attributes.parent));
    } else if (dirPart !== '.') {
      // Directory-based parent: look for index.md in the directory
      const indexRelPath = path.join(dirPart, 'index.md');
      const parentId = reverseMapping.get(indexRelPath);
      if (parentId && parentId !== id) {
        page.parent = parentId;
      }
    }

    // Hide from sidebar
    if (attributes.hide === true) {
      page.hide = true;
    }

    // Home page
    if (attributes.home === true || (basename === 'index' && dirPart === '.')) {
      homeId = id;
    }

    pages.push(page);
  }

  // Third pass: resolve frontmatter parent overrides (now all slugs exist)
  for (const [id, parentSlug] of frontmatterParents) {
    const parentPage = pages.find(p => p.slug === parentSlug);
    if (parentPage) {
      const page = pages.find(p => p.id === id);
      if (page) page.parent = parentPage.id;
    }
  }

  if (homeId) wikiMeta.home = homeId;

  // Read images from _images/ directory
  const imagesDir = path.join(folderPath, '_images');
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir).filter(f => !f.startsWith('.'));
    for (const imgFile of imageFiles) {
      const imgPath = path.join(imagesDir, imgFile);
      if (!fs.statSync(imgPath).isFile()) continue;

      const ext = path.extname(imgFile).slice(1).toLowerCase();
      const mimeMap = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
        ico: 'image/x-icon', bmp: 'image/bmp',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      const data = fs.readFileSync(imgPath);
      const b64 = data.toString('base64');
      const src = `data:${mime};base64,${b64}`;

      // Use hashString-style ID
      const imgId = stableId('_images/' + imgFile);
      images[imgId] = { src, alt: path.basename(imgFile, path.extname(imgFile)) };
    }
  }

  return { pages, images, mapping, reverseMapping, wikiMeta };
}
