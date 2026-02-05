# Liveblog Redux

Gutenberg blocks for liveblogging on WordPress. Newest entries first, with optional real-time updates on the front end.

## What it does

Adds two blocks to the block editor:

- **Liveblog** — A container that holds all entries. Add updates with “Add new entry” at the top; entries are ordered newest first.
- **Liveblog Entry** — A single update with timestamp, author(s), rich content (paragraphs, images, blockquotes, etc.) via TipTap, optional pinning, and optional [Co-Authors Plus](https://wordpress.org/plugins/co-authors-plus/) support for multiple authors.

On the front end, the liveblog can poll the REST API so readers see new and updated entries without refreshing the page.

## Requirements

- **WordPress** 6.7+
- **PHP** 7.4+
- **Parent Liveblog plugin** — Must be installed and activated; this plugin provides the block-based experience on top of it.
- **Co-Authors Plus** (optional) — For multiple authors per entry (WP users and guest authors).

## Installation

1. Install and activate the parent [Liveblog](https://wordpress.org/plugins/liveblog/) plugin.
2. Install and activate this plugin (e.g. upload and activate, or clone into `wp-content/plugins/liveblog-block`).
3. Build assets from the plugin directory:

   ```bash
   npm install
   npm run build
   ```

4. In the editor, add the **Liveblog** block to a post, then use **Add new entry** to add updates. New entries appear at the top.

## REST API

Base namespace: `liveblog/v1`.

| Endpoint | Description |
|----------|-------------|
| `GET /wp-json/liveblog/v1/posts/{post_id}/updates` | List updates. Query: `since` (Unix timestamp), `include_modified` (default `true`), `per_page` (1–100, default 50). Returns `updates`, `last_modified`, `has_more`. |
| `GET /wp-json/liveblog/v1/posts/{post_id}/updates/count` | Count of new/modified updates since `since`. Requires `read_post` for the post. |
| `GET /wp-json/liveblog/v1/authors/search?search=...` | Search authors (Co-Authors Plus). Requires `edit_posts`. Returns `id`, `display_name`, `avatar_url`, `type` (`wpuser` or `guest`). |

Responses for the updates list are cached in a transient (5-minute TTL, keyed by post ID and last-modified). Cache is cleared when the post is saved.

## Customizing the entry header

The entry header (time, authors, “Edited” label) is rendered on the server via the `render_block_liveblog/entry` filter. Themes can override it by adding a template part so developers control the markup. The plugin uses `get_template_part( 'liveblog/entry-header', null, $header_data )`, so WordPress’s normal theme lookup applies: **active theme first** (child theme if in use), then **parent theme**. On multisite, each site’s active theme is used.

1. In your theme directory, add a file at **`liveblog/entry-header.php`**. The plugin loads it when present (in the active/child theme or the parent theme).

2. In that file, the header data is passed as the third argument to `get_template_part`. In the template, use **`$args`** to retrieve the array, then:

   ```php
   $timestamp      = $args['timestamp'];
   $formatted_time = $args['formatted_time'];
   $modified       = $args['modified'];
   $is_modified    = $args['is_modified'];
   $authors        = $args['authors'];
   $update_id      = $args['update_id'];
   ```

   | Key | Type | Description |
   |-----|------|-------------|
   | `timestamp` | int | Unix timestamp of the entry. |
   | `formatted_time` | string | Time formatted per site’s time format. |
   | `modified` | int | Unix timestamp of last edit, or 0. |
   | `is_modified` | bool | Whether the entry was edited. |
   | `authors` | array | When Co-Authors Plus is active, array of co-author objects (e.g. `$author->display_name`). |
   | `update_id` | string | Unique ID for the entry (for DOM/JS). |

   If the theme does not define `liveblog/entry-header.php`, the plugin outputs a default header using BEM classes (e.g. `liveblog-entry__header`, `liveblog-entry__time`, `liveblog-entry__authors`).

## Development

From the plugin root:

| Command | Description |
|---------|-------------|
| `npm run build` | Production build; outputs to `build/` and generates `blocks-manifest.php` (WordPress 6.7+). |
| `npm run start` | Development build with watch. |
| `npm run lint:js` | Lint JavaScript. |
| `npm run lint:css` | Lint styles. |
| `npm run plugin-zip` | Create a distributable plugin zip. |

Block registration uses the [blocks manifest](https://make.wordpress.org/core/2024/10/17/new-block-type-registration-apis-to-improve-performance-in-wordpress-6-7/) when available (WordPress 6.7+).

### Project structure

| Path | Purpose |
|------|---------|
| `liveblog-redux.php` | Plugin bootstrap; block registration, REST init. |
| `includes/class-liveblog-rest.php` | REST routes, cache invalidation, author search, footer data for front-end polling. |
| `includes/class-liveblog-entry-render.php` | Server-side entry render via `render_block_liveblog/entry` filter; loads theme `liveblog/entry-header.php` when present. |
| `src/liveblog/` | Container block (edit, save, view). |
| `src/liveblog-entry/` | Entry block (TipTap editor, save, view, coauthors selector). |
| `build/` | Compiled block assets (after `npm run build`). |

## License

GPL-2.0-or-later. See [license URI](https://www.gnu.org/licenses/gpl-2.0.html).
