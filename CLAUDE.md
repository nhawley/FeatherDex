# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Feather Wiki is a lightweight (~58KB) self-contained wiki that runs as a single HTML file (quine). The wiki stores its own data inside itself — pages, images, styles, and scripts are all embedded in the HTML document. Licensed under GNU AGPL v3.

## Commands

- `npm start` — Dev server at http://localhost:3000 with file watching (output in `develop/`)
- `npm run build` — Production build for all locales (output in `builds/v{major}.{minor}.x/`)
- `npm test` — Runs build then starts a test server with WebDAV support

No automated test framework exists; testing is manual in-browser.

## Architecture

### Framework

Built on a heavily modified [Choo](https://github.com/choojs/choo) framework (`nanochoo.js`) with nano-* dependencies (nanobus, nanohtml, nanomorph, nanohref, nanoraf). Uses a unidirectional data flow: state → views → DOM, with events triggering state mutations and re-renders.

### Quine Structure

The final HTML file embeds everything:
- `<style id="s">` — App CSS
- `<style id="c">` — User custom CSS
- `<script id="p" type="application/json">` — Compressed wiki data (pages, images, metadata)
- `<script id="a">` — App JavaScript
- `<script id="j">` — User custom JavaScript

### Key Source Files

- `index.js` — Entry point, initializes the Choo app
- `initState.js` — Defines the central state object (abbreviated property names like `p` for wiki data, `pg` for current page, `sb` for sidebar)
- `initEmitter.js` — All event handlers (navigation, CRUD, saving). Event names are abbreviated (e.g., `'cp'` for create page, `'go'` for navigation)
- `nanochoo.js` — Custom Choo framework core

### Directory Layout

- `views/` — UI components using nanohtml template literals. `global.js` is the root layout; `page/` contains display/edit views with both HTML (`ed-editor.js`) and Markdown (`md-editor.js`) editors
- `helpers/` — Utilities: `md.js` (markdown parser), `ed.js` (rich text editor), `jsonCompress.js` (data compression), `injection.js` (wiki link/image processing), `generateWikiHtml.js` (produces the saveable HTML quine)
- `extensions/` — Optional plugins loaded via `FW.ready()` callbacks. Not bundled into core
- `locales/` — JSON translation files. `en-US.json` is the canonical source; other locales fall back to English for missing keys
- `nests/` — Server implementations for WebDAV-based saving (Node.js, PHP, Caddy)

### Build Pipeline

Uses esbuild with custom plugins that:
1. Replace `{{translate:key}}` placeholders with strings from locale JSON files
2. Replace `{{package.json:field}}` with values from package.json
3. Convert `let`/`const` to `var` (saves bytes after minification)
4. Minify HTML template literals via `minify-html-literals`
5. Inject bundled CSS and JS into `index.html` template
6. Final HTML minification via `html-minifier`

Production builds generate one HTML file per locale. The en-US build size is written back to README.md.

## Conventions

- **Size is paramount.** Every byte matters in a quine. Use abbreviated names, avoid unnecessary abstractions.
- State properties and event names use short abbreviations (see `initState.js` and `initEmitter.js`).
- ES modules throughout (`"type": "module"` in package.json), bundled by esbuild targeting ES2015.
- SPA routing uses URL query parameters (`?page=slug`, `?tag=name`) — no hash or path-based routing.
- Primary repo is on Codeberg; GitHub is a mirror. PRs preferred on Codeberg.
