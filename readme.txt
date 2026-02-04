=== Liveblog Redux ===
Contributors:      psorensen
Tags:              block, liveblog, gutenberg, real-time
Tested up to:      6.7
Stable tag:        0.1.0
Requires at least: 6.7
Requires PHP:      7.4
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Gutenberg blocks for liveblogging. Newest entries first. A block-based, modernized take on liveblog functionality.

== Description ==

This plugin adds two Gutenberg blocks for running a liveblog on a post: a **Liveblog** container and **Liveblog Entry** blocks inside it. Entries are shown in reverse chronological order (newest first). On the front end, the liveblog can poll the REST API for new or updated entries so readers see updates without refreshing the page.

**Blocks**

* **Liveblog** (`liveblog/container`) – Wrapper that holds all entries. Only Liveblog Entry blocks are allowed as children. In the editor, use "Add new entry" at the top to add updates. On the front end it renders entries and can attach a view script for real-time polling.
* **Liveblog Entry** (`liveblog/entry`) – A single update with:
  * Timestamp and optional modified time
  * Primary author (WP user) and optional Co-Authors Plus co-authors
  * Rich content (paragraphs, images, blockquotes, etc.) edited via TipTap
  * Pinning (pinned entries can be shown at the top)
  * Status (e.g. published)

**Backend**

* **REST API** (`liveblog/v1`) – Endpoints to fetch updates for a post, with optional `since` timestamp for polling, and author search for Co-Authors Plus. Responses are cached (transient) and invalidated on post save.
* **Block registration** – Uses the blocks manifest (WordPress 6.7+) when available for efficient block type registration; falls back to per-block registration for older WP.

**Requirements**

* WordPress 6.7+
* The parent **Liveblog** plugin must be installed and activated (this plugin extends/replaces its block-based experience).
* Optional: **Co-Authors Plus** for multiple authors per entry (WP users and guest authors).

== Installation ==

1. Install and activate the parent Liveblog plugin.
2. Install and activate this plugin.
3. Build assets: `npm install` then `npm run build` (see Development).
4. Add the Liveblog block to a post. Add entries with "Add new entry" at the top; new entries appear at the top of the list.

== REST API ==

* `GET /wp-json/liveblog/v1/posts/{post_id}/updates` – List updates. Query args: `since` (Unix timestamp; only new/modified after this), `include_modified` (default true), `per_page` (1–100, default 50). Response: `updates`, `last_modified`, `has_more`.
* `GET /wp-json/liveblog/v1/posts/{post_id}/updates/count` – Count of new and modified updates since `since`. Requires `read_post` for the post.
* `GET /wp-json/liveblog/v1/authors/search?search=...` – Search authors (Co-Authors Plus). Requires `edit_posts`. Returns id, display_name, avatar_url, type (wpuser|guest).

Cache: full list is stored in a transient keyed by post ID and last-modified meta; TTL 5 minutes. Cache is cleared when the post is saved.

== Development ==

* **Build:** `npm run build` – Compiles blocks and generates `build/` (including `blocks-manifest.php` when using WP 6.7+).
* **Watch:** `npm run start` – Development build with file watch.
* **Lint JS:** `npm run lint:js`
* **Lint CSS:** `npm run lint:css`
* **Plugin zip:** `npm run plugin-zip`

Source blocks live under `src/liveblog/` (container) and `src/liveblog-entry/` (entry). PHP: main plugin file `liveblog-block.php`, REST and cache logic in `includes/class-liveblog-rest.php`.

== Project structure ==

* `liveblog-block.php` – Bootstrap; block registration (manifest or fallback), REST init.
* `includes/class-liveblog-rest.php` – REST routes, cache invalidation, Co-Authors Plus author search, footer data for front-end polling.
* `src/liveblog/` – Container block (edit, save, view).
* `src/liveblog-entry/` – Entry block (edit with TipTap, save, view, coauthors selector).
* `build/` – Built block assets and manifest (after `npm run build`).

== Changelog ==

= 0.1.0 =
* Initial release. Container and entry blocks, reverse chronological order.
* REST API: updates list, count, author search; transient cache and invalidation on save.
* Co-Authors Plus support for Liveblog Entry (search and display).
* Rich content editing (TipTap) for entry body; pinning and status.
* Block registration via blocks manifest (WP 6.7+) when available.
