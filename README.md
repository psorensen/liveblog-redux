# Liveblog Redux

Block-editor liveblogging for WordPress.
**Requirements:** WordPress 6.7+, PHP 7.4+.

**Quick start:** Install in `wp-content/plugins/liveblog-redux`, activate, then `npm install && npm run build`. Add the Liveblog block to a post and use the block appender to add entries (newest first).

**Theme override:** Add `liveblog/entry-header.php` in your theme; it receives `$args` (timestamp, formatted_time, modified, is_modified, authors, update_id).

**Development:** `npm run build` (production), `npm run start` (watch), `npm run plugin-zip` (distributable zip).

**Committed build:** `build/` is in git, because Composer installs this plugin without building it. After any change to `src/`, run `nvm use && npm ci && npm run build` and commit `build/`. The Build Check workflow fails a PR whose `build/` does not match `src/`.

GPL-2.0-or-later.
