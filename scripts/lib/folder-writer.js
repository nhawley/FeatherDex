import fs from 'fs';
import path from 'path';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.js';

/**
 * Write a modified page back to its existing .md file.
 * Preserves unknown frontmatter fields from the existing file.
 * The parent field is NOT written to frontmatter because parent relationships
 * are expressed through directory structure (handled by folder-reader.js).
 * @param {object} page - Feather Wiki page object
 * @param {string} filePath - Absolute path to the .md file
 */
export function writePageToFile(page, filePath) {
  let existingAttrs = {};

  // Read existing file to preserve unknown frontmatter fields
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    const { attributes } = parseFrontmatter(existing);
    existingAttrs = attributes;
  }

  // Build attributes from page metadata
  const attrs = { ...existingAttrs };
  attrs.title = page.name;
  if (page.tags) {
    attrs.tags = page.tags;
  } else {
    delete attrs.tags;
  }
  if (page.hide) {
    attrs.hide = true;
  } else {
    delete attrs.hide;
  }
  // Don't write parent to frontmatter — directory structure handles it

  const content = serializeFrontmatter(attrs, page.content || '');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/**
 * Create a new .md file for a page added in the wiki.
 * Places in subdirectory if page has a parent.
 * @param {object} page - Feather Wiki page object
 * @param {string} folderPath - Root folder path
 * @param {Map} mapping - id → { relativePath, fullPath }
 * @returns {string} The relative path of the new file
 */
export function createPageFile(page, folderPath, mapping) {
  // Determine directory: if page has a parent, place under parent's directory
  let dir = folderPath;
  if (page.parent && mapping.has(page.parent)) {
    const parentInfo = mapping.get(page.parent);
    const parentDir = path.dirname(parentInfo.fullPath);
    // If parent is an index.md, use its directory; otherwise create a subdir
    if (path.basename(parentInfo.relativePath) === 'index.md') {
      dir = parentDir;
    } else {
      const parentBasename = path.basename(parentInfo.relativePath, '.md');
      dir = path.join(parentDir, parentBasename);
    }
  }

  // Create filename from slug
  const filename = (page.slug || page.name.toLowerCase().replace(/\s+/g, '-')) + '.md';
  const filePath = path.join(dir, filename);
  const relativePath = path.relative(folderPath, filePath);

  const attrs = {};
  attrs.title = page.name;
  if (page.tags) attrs.tags = page.tags;
  if (page.hide) attrs.hide = true;

  const content = serializeFrontmatter(attrs, page.content || '');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);

  return relativePath;
}

/**
 * Move a deleted page's .md file to .trash/ instead of hard deleting.
 * @param {string} filePath - Absolute path to the .md file
 * @param {string} folderPath - Root folder path
 */
export function deletePageFile(filePath, folderPath) {
  if (!fs.existsSync(filePath)) return;

  const trashDir = path.join(folderPath, '.trash');
  fs.mkdirSync(trashDir, { recursive: true });

  const relativePath = path.relative(folderPath, filePath);
  const trashPath = path.join(trashDir, relativePath);
  fs.mkdirSync(path.dirname(trashPath), { recursive: true });

  fs.renameSync(filePath, trashPath);
}
