/**
 * Zero-dependency YAML frontmatter parser/serializer.
 * Supports simple key: value pairs, not nested YAML.
 */

/**
 * Parse frontmatter delimited by --- from file content.
 * @param {string} content - Raw file content
 * @returns {{ attributes: object, body: string }}
 */
export function parseFrontmatter(content) {
  const attributes = {};
  if (!content.startsWith('---')) {
    return { attributes, body: content };
  }

  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return { attributes, body: content };
  }

  const frontmatterBlock = content.slice(4, end).trim();
  const body = content.slice(end + 4).replace(/^\r?\n/, '');

  for (const line of frontmatterBlock.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    if (!key) continue;
    let value = line.slice(colon + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse booleans
    if (value === 'true') { attributes[key] = true; continue; }
    if (value === 'false') { attributes[key] = false; continue; }

    attributes[key] = value;
  }

  return { attributes, body };
}

/**
 * Serialize attributes and body back into frontmatter format.
 * @param {object} attributes - Key/value pairs for frontmatter
 * @param {string} body - Markdown body content
 * @returns {string}
 */
export function serializeFrontmatter(attributes, body) {
  const keys = Object.keys(attributes).filter(k => {
    const v = attributes[k];
    return v !== undefined && v !== null && v !== '' && v !== false;
  });

  if (keys.length === 0) return body;

  const lines = keys.map(key => {
    const val = attributes[key];
    if (typeof val === 'boolean') return `${key}: ${val}`;
    // Quote values that contain colons, quotes, or special yaml chars
    if (/[:#"'{}\[\],&*?|>!%@`]/.test(String(val))) {
      return `${key}: "${String(val).replace(/"/g, '\\"')}"`;
    }
    return `${key}: ${val}`;
  });

  return `---\n${lines.join('\n')}\n---\n${body}`;
}
