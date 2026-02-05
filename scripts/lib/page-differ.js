import { decompress } from '../../helpers/jsonCompress.js';

/**
 * Extract the wiki data JSON from a full Feather Wiki HTML string.
 * Looks for <script id="p" type="application/json">...</script>
 */
function extractWikiData(html) {
  const match = html.match(/<script\s+id="p"\s+type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    // Try alternate attribute order
    const match2 = html.match(/<script\s+type="application\/json"\s+id="p">([\s\S]*?)<\/script>/);
    if (!match2) throw new Error('Could not find wiki data <script id="p"> in HTML');
    return JSON.parse(match2[1]);
  }
  return JSON.parse(match[1]);
}

/**
 * Diff incoming wiki state (from PUT HTML) against current pages.
 * @param {string} incomingHtml - Full HTML from the wiki PUT request
 * @param {object[]} currentPages - Current in-memory page objects
 * @param {Map} mapping - id → { relativePath, fullPath }
 * @returns {{ wikiData: object, modified: object[], added: object[], deleted: object[] }}
 */
export function diffPages(incomingHtml, currentPages, mapping) {
  const compressed = extractWikiData(incomingHtml);
  const wikiData = decompress(compressed);

  const incomingPages = wikiData.pages || [];
  const currentById = new Map(currentPages.map(p => [p.id, p]));
  const incomingById = new Map(incomingPages.map(p => [p.id, p]));

  const modified = [];
  const added = [];
  const deleted = [];

  // Check for modified and new pages
  for (const page of incomingPages) {
    const current = currentById.get(page.id);
    if (!current) {
      added.push(page);
    } else if (hasChanged(current, page)) {
      modified.push(page);
    }
  }

  // Check for deleted pages
  for (const page of currentPages) {
    if (!incomingById.has(page.id)) {
      deleted.push(page);
    }
  }

  return { wikiData, modified, added, deleted };
}

/**
 * Check if a page has meaningfully changed.
 */
function hasChanged(old, incoming) {
  return old.content !== incoming.content
    || old.name !== incoming.name
    || old.slug !== incoming.slug
    || old.tags !== incoming.tags
    || old.parent !== incoming.parent
    || old.hide !== incoming.hide
    || old.editor !== incoming.editor;
}
