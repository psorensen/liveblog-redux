# WordPress LiveBlog Plugin - Development Plan

## Overview

A custom WordPress LiveBlog plugin using Gutenberg blocks with real-time updates via REST API. Entries are editable, updates are non-disruptive, and visual indicators show new/modified content in the browser tab.

## Core Requirements

1. **Block Editor**: Parent/child block structure with nested blocks for each entry
2. **Real-time Updates**: REST API polling for live updates on frontend
3. **Visual Indicators**: Browser tab title shows update count
4. **Non-disruptive UX**: Users reading content aren't interrupted when updates arrive
5. **Editable Entries**: Editors can modify existing entries after publication
6. **Guest Authors**: Integration with Co-Authors Plus plugin for easy guest author selection per entry
7. **Schema.org Markup**: Proper structured data (LiveBlogPosting) for search engine visibility

## Architecture

### Plugin Structure

```
liveblog-plugin/
├── liveblog.php                    # Main plugin file
├── includes/
│   ├── class-liveblog-blocks.php   # Block registration
│   ├── class-liveblog-rest.php     # REST API endpoints
│   ├── class-liveblog-frontend.php # Frontend enqueue logic
│   ├── class-liveblog-meta.php     # Post meta management
│   ├── class-liveblog-schema.php   # Schema.org structured data
│   └── class-liveblog-coauthors.php # Co-Authors Plus integration
├── src/
│   ├── blocks/
│   │   ├── container/
│   │   │   ├── block.json
│   │   │   ├── edit.js
│   │   │   ├── save.js
│   │   │   └── style.scss
│   │   └── entry/
│   │       ├── block.json
│   │       ├── edit.js
│   │       ├── save.js
│   │       ├── style.scss
│   │       └── components/
│   │           └── coauthors-selector.js
│   └── frontend/
│       ├── liveblog-client.js      # Frontend polling & update logic
│       ├── notifications.js         # Update notifications
│       └── styles.scss
├── build/                          # Compiled assets (generated)
└── package.json
```

## Block Architecture

### Container Block (`liveblog/container`)

**Purpose**: Wrapper block that holds all liveblog entries

**Attributes**:

```json
{
  "updateInterval": {
    "type": "number",
    "default": 15000
  },
  "showTimestamps": {
    "type": "boolean",
    "default": true
  },
  "newestFirst": {
    "type": "boolean",
    "default": true
  },
  "allowedBlocks": {
    "type": "array",
    "default": ["liveblog/entry"]
  }
}
```

**Features**:

- Uses `InnerBlocks` to contain entry blocks
- Provides toolbar controls for liveblog settings
- Renders as a wrapper div with data attributes
- Auto-creates first entry block on insertion

### Entry Block (`liveblog/entry`)

**Purpose**: Individual liveblog update entry

**Attributes**:

```json
{
  "updateId": {
    "type": "string",
    "default": ""
  },
  "timestamp": {
    "type": "number",
    "default": 0
  },
  "modified": {
    "type": "number",
    "default": 0
  },
  "authorId": {
    "type": "number",
    "default": 0
  },
  "coauthors": {
    "type": "array",
    "default": []
  },
  "isPinned": {
    "type": "boolean",
    "default": false
  },
  "status": {
    "type": "string",
    "default": "published"
  }
}
```

**Notes on Authors**:

- `authorId`: WordPress user ID (for backwards compatibility)
- `coauthors`: Array of Co-Authors Plus author objects:

  ```json
  [
    {
      "id": "cap-12345",
      "display_name": "Jane Smith",
      "type": "wpuser|guest"
    }
  ]
  ```

- If Co-Authors Plus is not active, fall back to `authorId` only

**Features**:

- Supports `InnerBlocks` for rich content (paragraph, image, embed, etc.)
- Auto-generates unique `updateId` on creation using `wp.uuid()`
- Displays timestamp and author(s) in header
- **Co-Authors Plus Integration**:
  - Sidebar panel with author selector (uses CAP's author search)
  - Supports multiple authors per entry
  - Displays guest author avatars and names
  - Falls back gracefully if CAP not installed
- Shows "Edited" indicator if modified timestamp exists
- Toolbar option to pin/unpin entry
- Auto-updates `modified` timestamp on save

**Block Template**:

```javascript
[
  ['core/paragraph', { placeholder: 'Write update...' }]
]
```

## REST API Endpoints

### Base namespace: `/wp-json/liveblog/v1`

### 1. Get Updates

```
GET /posts/{post_id}/updates
```

**Query Parameters**:

- `since` (int): Unix timestamp - only return updates modified after this time
- `include_modified` (bool): Include edited entries (default: true)
- `per_page` (int): Number of entries to return (default: 50)

**Response**:

```json
{
  "updates": [
    {
      "id": "update-abc123",
      "timestamp": 1234567890,
      "modified": 1234567950,
      "author": "John Doe",
      "author_id": 1,
      "coauthors": [
        {
          "id": "cap-12345",
          "display_name": "Jane Smith",
          "avatar_url": "https://...",
          "type": "guest"
        },
        {
          "id": "cap-67890",
          "display_name": "Bob Jones",
          "avatar_url": "https://...",
          "type": "wpuser"
        }
      ],
      "content": "<div class='liveblog-entry'>...</div>",
      "status": "published",
      "change_type": "modified",
      "is_pinned": false
    }
  ],
  "last_modified": 1234567950,
  "has_more": false
}
```

**Change Types**:

- `new`: Entry created after `since` timestamp
- `modified`: Entry updated after `since` timestamp
- `deleted`: Entry soft-deleted after `since` timestamp

### 2. Create Update (Future/Optional)

```
POST /posts/{post_id}/updates
```

**Body**:

```json
{
  "content": "Block markup or HTML",
  "timestamp": 1234567890
}
```

### 3. Update Entry (Future/Optional)

```
PATCH /posts/{post_id}/updates/{update_id}
```

**Body**:

```json
{
  "content": "Updated block markup",
  "status": "published"
}
```

### 4. Delete Entry (Future/Optional)

```
DELETE /posts/{post_id}/updates/{update_id}
```

**Response**: Soft delete (marks as deleted, doesn't remove)

### 5. Get Update Count

```
GET /posts/{post_id}/updates/count
```

**Query Parameters**:

- `since` (int): Count updates since timestamp

**Response**:

```json
{
  "count": 5,
  "new_count": 3,
  "modified_count": 2
}
```

### Implementation Notes

**Data Source**:

- Parse post content to extract liveblog blocks
- Use `parse_blocks()` to get block data
- Extract attributes from each entry block
- Compare timestamps against `since` parameter

**Co-Authors Plus Integration**:

- Check if CAP is active: `function_exists('get_coauthors')`
- Extract coauthors from block attributes
- Enrich with avatar URLs and profile links
- Fallback to standard WordPress author if CAP not available

**Caching**:

- Use WordPress transients for parsed block data
- Cache key: `liveblog_updates_{post_id}_{last_modified}`
- Invalidate on post save
- TTL: 5 minutes

**Permissions**:

- Read endpoints: Public (if post is public)
- Write endpoints: Require `edit_post` capability
- Use nonce verification for authenticated requests

## Co-Authors Plus Integration

### Overview

The plugin integrates with the [Co-Authors Plus](https://wordpress.org/plugins/co-authors-plus/) plugin to allow editors to assign guest authors and multiple authors to individual liveblog entries.

### Detection and Graceful Degradation

```php
function liveblog_has_coauthors_plus() {
    return function_exists('get_coauthors') && class_exists('CoAuthors_Guest_Authors');
}
```

**Behavior**:

- If CAP active: Show author selector in entry block sidebar
- If CAP inactive: Use default WordPress author (current user)

### Block Editor Integration

**Entry Block Sidebar Panel**:

```javascript
// In edit.js
import { PanelBody } from '@wordpress/components';
import { InspectorControls } from '@wordpress/block-editor';

// Custom component for Co-Authors Plus integration
import CoAuthorsSelector from './components/coauthors-selector';

const Edit = (props) => {
  const { attributes, setAttributes } = props;
  
  return (
    <>
      <InspectorControls>
        <PanelBody title="Authors" initialOpen={true}>
          <CoAuthorsSelector
            value={attributes.coauthors}
            onChange={(coauthors) => setAttributes({ coauthors })}
          />
        </PanelBody>
      </InspectorControls>
      {/* Rest of block */}
    </>
  );
};
```

**CoAuthorsSelector Component**:

This component should:

1. Check if Co-Authors Plus is available via REST API
2. Provide an autocomplete search for authors (WordPress users + guest authors)
3. Display selected authors with avatars
4. Allow removing authors
5. Support multiple author selection

**REST API for Author Search**:

```php
// Endpoint to search Co-Authors Plus authors
register_rest_route('liveblog/v1', '/authors/search', [
    'methods' => 'GET',
    'callback' => 'liveblog_search_authors',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
    'args' => [
        'search' => [
            'required' => true,
            'type' => 'string',
        ],
    ],
]);

function liveblog_search_authors($request) {
    if (!liveblog_has_coauthors_plus()) {
        return new WP_Error('cap_not_available', 'Co-Authors Plus not installed');
    }
    
    $search = $request->get_param('search');
    $coauthors = new CoAuthors_Plus();
    
    // Search both WordPress users and guest authors
    $users = $coauthors->search_authors($search, [], 10);
    
    $results = array_map(function($author) {
        return [
            'id' => 'cap-' . $author->ID,
            'display_name' => $author->display_name,
            'avatar_url' => get_avatar_url($author->ID),
            'type' => isset($author->type) && $author->type === 'guest-author' ? 'guest' : 'wpuser',
        ];
    }, $users);
    
    return rest_ensure_response($results);
}
```

### Frontend Display

**Multiple Authors Display**:

```html
<div class="entry-header">
  <time datetime="2024-01-15T14:30:00">2:30 PM</time>
  <div class="entry-authors">
    <img src="avatar1.jpg" alt="Jane Smith" class="author-avatar" />
    <img src="avatar2.jpg" alt="Bob Jones" class="author-avatar" />
    <span class="author-names">
      <a href="/author/jane-smith/">Jane Smith</a> and 
      <a href="/author/bob-jones/">Bob Jones</a>
    </span>
  </div>
</div>
```

**CSS for Author Display**:

```scss
.entry-authors {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .author-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid white;
    
    &:not(:first-child) {
      margin-left: -12px; // Overlap avatars
    }
  }
  
  .author-names {
    font-size: 14px;
    
    a {
      color: inherit;
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
}
```

### Data Storage

**In Block Attributes**:

```json
{
  "coauthors": [
    {
      "id": "cap-12345",
      "display_name": "Jane Smith",
      "type": "guest"
    }
  ]
}
```

**In Rendered HTML**:

```html
<!-- wp:liveblog/entry {
  "updateId":"abc123",
  "coauthors":[
    {"id":"cap-12345","display_name":"Jane Smith","type":"guest"}
  ]
} -->
<div class="liveblog-entry" data-update-id="abc123">
  <!-- Content -->
</div>
<!-- /wp:liveblog/entry -->
```

### PHP Helper Functions

```php
/**
 * Get coauthors for a liveblog entry
 */
function liveblog_get_entry_coauthors($entry_attrs) {
    if (!liveblog_has_coauthors_plus() || empty($entry_attrs['coauthors'])) {
        // Fallback to standard author
        $author_id = $entry_attrs['authorId'] ?? get_current_user_id();
        return [get_userdata($author_id)];
    }
    
    $coauthors = [];
    foreach ($entry_attrs['coauthors'] as $coauthor) {
        // Extract CAP author ID (remove 'cap-' prefix)
        $cap_id = str_replace('cap-', '', $coauthor['id']);
        $author = get_user_by('id', $cap_id);
        
        if (!$author && function_exists('get_coauthor_by')) {
            // Try guest author
            $author = get_coauthor_by('id', $cap_id);
        }
        
        if ($author) {
            $coauthors[] = $author;
        }
    }
    
    return $coauthors;
}

/**
 * Format coauthors for REST API response
 */
function liveblog_format_coauthors_for_api($coauthors_data) {
    if (!liveblog_has_coauthors_plus() || empty($coauthors_data)) {
        return [];
    }
    
    return array_map(function($coauthor) {
        $cap_id = str_replace('cap-', '', $coauthor['id']);
        return [
            'id' => $coauthor['id'],
            'display_name' => $coauthor['display_name'],
            'avatar_url' => get_avatar_url($cap_id),
            'type' => $coauthor['type'],
            'link' => get_author_posts_url($cap_id),
        ];
    }, $coauthors_data);
}
```

## Schema.org Structured Data

### Overview

Implement proper [LiveBlogPosting](https://schema.org/LiveBlogPosting) schema markup so search engines can:

- Identify the content as a live blog
- Display individual updates in search results
- Show timestamps and update frequency
- Improve visibility in Google News and other news aggregators

### Implementation Location

**File**: `includes/class-liveblog-schema.php`

Inject JSON-LD structured data in the `<head>` of posts containing liveblog blocks.

### Schema Structure

```json
{
  "@context": "https://schema.org",
  "@type": "LiveBlogPosting",
  "headline": "Breaking News: Product Launch Event",
  "description": "Live coverage of the annual product launch event",
  "datePublished": "2024-01-15T10:00:00-05:00",
  "dateModified": "2024-01-15T15:30:00-05:00",
  "coverageStartTime": "2024-01-15T10:00:00-05:00",
  "coverageEndTime": null,
  "author": {
    "@type": "Organization",
    "name": "Example News",
    "url": "https://example.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Example News",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "liveBlogUpdate": [
    {
      "@type": "BlogPosting",
      "headline": "CEO announces new features",
      "datePublished": "2024-01-15T14:30:00-05:00",
      "dateModified": "2024-01-15T14:35:00-05:00",
      "articleBody": "The CEO took the stage to announce three major new features...",
      "author": [
        {
          "@type": "Person",
          "name": "Jane Smith",
          "url": "https://example.com/author/jane-smith"
        },
        {
          "@type": "Person",
          "name": "Bob Jones",
          "url": "https://example.com/author/bob-jones"
        }
      ]
    },
    {
      "@type": "BlogPosting",
      "headline": "Event begins",
      "datePublished": "2024-01-15T10:05:00-05:00",
      "articleBody": "The event has officially started with opening remarks...",
      "author": {
        "@type": "Person",
        "name": "Jane Smith",
        "url": "https://example.com/author/jane-smith"
      }
    }
  ]
}
```

### PHP Implementation

```php
class Liveblog_Schema {
    
    public function __construct() {
        add_action('wp_head', [$this, 'output_schema'], 1);
    }
    
    /**
     * Output schema only on posts with liveblog blocks
     */
    public function output_schema() {
        if (!is_singular() || !$this->has_liveblog_block()) {
            return;
        }
        
        $schema = $this->generate_schema();
        
        echo '<script type="application/ld+json">';
        echo wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        echo '</script>';
    }
    
    /**
     * Check if current post has liveblog block
     */
    private function has_liveblog_block() {
        global $post;
        return has_block('liveblog/container', $post);
    }
    
    /**
     * Generate complete schema object
     */
    private function generate_schema() {
        global $post;
        
        $blocks = parse_blocks($post->post_content);
        $liveblog_block = $this->find_liveblog_block($blocks);
        
        if (!$liveblog_block) {
            return null;
        }
        
        $entries = $this->extract_entries($liveblog_block);
        $updates = array_map([$this, 'entry_to_schema'], $entries);
        
        // Get first and last timestamps
        $timestamps = array_column($entries, 'timestamp');
        $start_time = min($timestamps);
        $last_modified = max(array_column($entries, 'modified'));
        
        return [
            '@context' => 'https://schema.org',
            '@type' => 'LiveBlogPosting',
            'headline' => get_the_title($post),
            'description' => get_the_excerpt($post),
            'datePublished' => get_post_time('c', false, $post),
            'dateModified' => date('c', $last_modified),
            'coverageStartTime' => date('c', $start_time),
            'coverageEndTime' => null, // Set when liveblog is marked complete
            'author' => $this->get_post_author_schema($post),
            'publisher' => $this->get_publisher_schema(),
            'liveBlogUpdate' => $updates,
        ];
    }
    
    /**
     * Convert entry block to BlogPosting schema
     */
    private function entry_to_schema($entry) {
        $content = $this->extract_text_content($entry['innerHTML']);
        
        $schema = [
            '@type' => 'BlogPosting',
            'headline' => $this->generate_headline($content),
            'datePublished' => date('c', $entry['attrs']['timestamp']),
            'articleBody' => wp_strip_all_tags($content),
        ];
        
        // Add modified date if edited
        if (!empty($entry['attrs']['modified'])) {
            $schema['dateModified'] = date('c', $entry['attrs']['modified']);
        }
        
        // Add authors
        $schema['author'] = $this->get_entry_authors_schema($entry['attrs']);
        
        return $schema;
    }
    
    /**
     * Get authors schema for entry
     */
    private function get_entry_authors_schema($attrs) {
        if (!empty($attrs['coauthors'])) {
            // Multiple authors from Co-Authors Plus
            return array_map(function($coauthor) {
                $cap_id = str_replace('cap-', '', $coauthor['id']);
                return [
                    '@type' => 'Person',
                    'name' => $coauthor['display_name'],
                    'url' => get_author_posts_url($cap_id),
                ];
            }, $attrs['coauthors']);
        }
        
        // Fallback to single author
        $author_id = $attrs['authorId'] ?? get_current_user_id();
        $author = get_userdata($author_id);
        
        return [
            '@type' => 'Person',
            'name' => $author->display_name,
            'url' => get_author_posts_url($author_id),
        ];
    }
    
    /**
     * Get publisher schema
     */
    private function get_publisher_schema() {
        $site_logo = get_theme_mod('custom_logo');
        $logo_url = $site_logo ? wp_get_attachment_image_url($site_logo, 'full') : '';
        
        return [
            '@type' => 'Organization',
            'name' => get_bloginfo('name'),
            'url' => home_url(),
            'logo' => [
                '@type' => 'ImageObject',
                'url' => $logo_url,
            ],
        ];
    }
    
    /**
     * Generate headline from content (first 100 chars)
     */
    private function generate_headline($content) {
        $text = wp_strip_all_tags($content);
        return wp_trim_words($text, 15, '...');
    }
    
    /**
     * Find liveblog container block in parsed blocks
     */
    private function find_liveblog_block($blocks) {
        foreach ($blocks as $block) {
            if ($block['blockName'] === 'liveblog/container') {
                return $block;
            }
        }
        return null;
    }
    
    /**
     * Extract all entry blocks from container
     */
    private function extract_entries($container_block) {
        $entries = [];
        
        if (!empty($container_block['innerBlocks'])) {
            foreach ($container_block['innerBlocks'] as $block) {
                if ($block['blockName'] === 'liveblog/entry') {
                    $entries[] = $block;
                }
            }
        }
        
        return $entries;
    }
    
    /**
     * Extract text content from block HTML
     */
    private function extract_text_content($html) {
        // Remove script and style tags
        $html = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
        $html = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $html);
        
        return $html;
    }
}

// Initialize
new Liveblog_Schema();
```

### Schema Validation

**Tools for Testing**:

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
2. [Schema.org Validator](https://validator.schema.org/)
3. Google Search Console - Rich Results report

### Benefits

- **Google Search**: Enhanced search result display with update snippets
- **Google News**: Better visibility in news aggregators
- **Social Sharing**: Improved Open Graph/Twitter Card data
- **Voice Assistants**: Better content understanding for Alexa, Google Assistant
- **SEO**: Clear signals about content freshness and structure

### Coverage End Time

Add a block attribute to mark liveblog as "complete":

```json
// Container block
{
  "isComplete": {
    "type": "boolean",
    "default": false
  },
  "coverageEndTime": {
    "type": "number",
    "default": 0
  }
}
```

When marked complete, set `coverageEndTime` in schema:

```json
{
  "coverageEndTime": "2024-01-15T18:00:00-05:00"
}
```

## Frontend Polling System

### Core Polling Logic

**File**: `src/frontend/liveblog-client.js`

```javascript
class LiveBlogClient {
  constructor(postId, options = {}) {
    this.postId = postId;
    this.updateInterval = options.updateInterval || 15000;
    this.lastPollTime = Date.now();
    this.isPolling = false;
    this.queuedUpdates = { new: [], modified: [], deleted: [] };
  }

  async poll() {
    // Fetch updates since last poll
    // Categorize: new, modified, deleted
    // Handle appropriately based on user context
  }

  handleNewUpdates(updates) {
    // Check if user is at top of page
    // If yes: insert immediately
    // If no: queue and show notification
  }

  handleModifiedUpdates(updates) {
    // Check if entry is in viewport
    // If visible: queue and show indicator on entry
    // If not visible: update immediately
  }

  handleDeletedUpdates(updates) {
    // Fade out and remove deleted entries
  }
}
```

### Polling Strategy

**Intervals**:

- Default: 15 seconds
- Tab inactive: 60 seconds (use Page Visibility API)
- Network error: Exponential backoff (max 2 minutes)

**Optimization**:

- Stop polling if no updates for 10 minutes
- Resume on tab focus
- Cancel pending requests on tab blur

**Error Handling**:

- Network timeout: Retry with backoff
- 404/403: Stop polling, show message
- 500: Continue with exponential backoff
- Show connection status indicator

## Non-Disruptive Update System

### Scroll Position Detection

```javascript
const isUserReading = () => {
  const scrollTop = window.scrollY;
  const isAtTop = scrollTop < 200; // Within 200px of top
  const isScrolling = Math.abs(lastScrollY - scrollTop) > 10;
  
  return !isAtTop || isScrolling;
};
```

### Update Queueing

**Rules**:

1. **New updates**:
   - User at top of page → Insert immediately with smooth animation
   - User scrolled down → Queue and show notification banner

2. **Modified updates**:
   - Entry not in viewport → Update immediately
   - Entry in viewport → Queue and show badge on entry
   - Entry near scroll position → Queue and show notification

3. **Deleted updates**:
   - Always remove with fade-out animation
   - Preserve scroll position

### Notification Banner

**Position**: Fixed top, slides down when updates available

**Content**:

```html
<div class="liveblog-notification">
  <span class="notification-text">
    3 new updates available
  </span>
  <button class="show-updates-btn">Show Updates</button>
  <button class="dismiss-btn">×</button>
</div>
```

**Behavior**:

- Appears when updates are queued
- Click "Show Updates": Scroll to top and insert queued updates
- Auto-dismiss after 30 seconds
- Combine multiple update types: "2 new, 1 edited"

### Entry Update Indicator

**For modified entries in viewport**:

```html
<div class="liveblog-entry modified-pending">
  <!-- Entry content -->
  <div class="update-badge">
    Updated - <button class="refresh-entry">Refresh</button>
  </div>
</div>
```

## Browser Tab Indicators

### Tab Title Updates

**Format**: `({count}) {original_title}`

**Examples**:

- `(3) Breaking News Live Blog`
- `(2 new, 1 edited) Product Launch Event`
- `(Updated) Live Coverage`

**Rules**:

- Update only when new/modified entries arrive
- Reset when user views updates
- Restore original title when no unread updates

**Implementation**:

```javascript
const updateTabTitle = (newCount, modifiedCount) => {
  const originalTitle = document.title.replace(/^\(\d+.*?\)\s*/, '');
  
  if (newCount > 0 && modifiedCount > 0) {
    document.title = `(${newCount} new, ${modifiedCount} edited) ${originalTitle}`;
  } else if (newCount > 0) {
    document.title = `(${newCount}) ${originalTitle}`;
  } else if (modifiedCount > 0) {
    document.title = `(${modifiedCount} edited) ${originalTitle}`;
  } else {
    document.title = originalTitle;
  }
};
```

### Favicon Badge (Optional Enhancement)

- Use Canvas API to draw notification count on favicon
- Update dynamically as count changes
- Fallback to title-only if Canvas not supported

## Data Persistence

### Post Meta

**Meta key**: `_liveblog_last_modified`

- Stores Unix timestamp of last liveblog update
- Updated on every post save
- Used for efficient change detection

### LocalStorage (Frontend)

**Keys**:

- `liveblog_{post_id}_last_seen`: Last viewed timestamp
- `liveblog_{post_id}_scroll_position`: Saved scroll position
- `liveblog_{post_id}_notification_prefs`: User notification preferences

### Block Attributes Storage

**Stored in post_content as block markup**:

```html
<!-- wp:liveblog/entry {
  "updateId":"abc123",
  "timestamp":1234567890,
  "modified":1234567950,
  "authorId":1,
  "status":"published"
} -->
<div class="liveblog-entry" data-update-id="abc123">
  <!-- Inner blocks content -->
</div>
<!-- /wp:liveblog/entry -->
```

## Styling Approach

### CSS Architecture

**File**: `src/blocks/entry/style.scss`

```scss
.liveblog-container {
  max-width: 800px;
  margin: 0 auto;
}

.liveblog-entry {
  border-left: 4px solid #0073aa;
  padding-left: 20px;
  margin-bottom: 30px;
  position: relative;
  
  &.modified {
    border-left-color: #f0b849;
  }
  
  &.pinned {
    background: #f9f9f9;
    border-left-color: #d63638;
  }
  
  &.entry-enter {
    animation: slideInFromTop 0.3s ease-out;
  }
  
  &.entry-exit {
    animation: fadeOut 0.3s ease-out;
  }
}

.entry-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
}

.edited-indicator {
  font-style: italic;
  color: #f0b849;
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

### Notification Styling

```scss
.liveblog-notification {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-100%);
  background: #0073aa;
  color: white;
  padding: 12px 24px;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 9999;
  transition: transform 0.3s ease-out;
  
  &.visible {
    transform: translateX(-50%) translateY(0);
  }
}
```

## Build Process

### package.json Scripts

```json
{
  "scripts": {
    "start": "wp-scripts start",
    "build": "wp-scripts build",
    "format": "wp-scripts format",
    "lint:css": "wp-scripts lint-style",
    "lint:js": "wp-scripts lint-js",
    "packages-update": "wp-scripts packages-update"
  },
  "devDependencies": {
    "@wordpress/scripts": "^27.0.0"
  }
}
```

### Entry Points

**webpack.config.js** (if customization needed):

```javascript
const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  entry: {
    'container': './src/blocks/container/index.js',
    'entry': './src/blocks/entry/index.js',
    'frontend': './src/frontend/liveblog-client.js'
  }
};
```

## Development Phases

### Phase 1: Core Block Structure (Week 1)

- [ ] Set up plugin structure and build process
- [ ] Register container block with InnerBlocks
- [ ] Register entry block with InnerBlocks support
- [ ] Implement unique ID generation for entries
- [ ] Add timestamp and author display
- [ ] **Detect Co-Authors Plus plugin availability**
- [ ] **Create CoAuthorsSelector component**
- [ ] **Add author selector to entry block sidebar**
- [ ] Basic styling for entries
- [ ] Test block saving and loading

### Phase 2: REST API (Week 2)

- [ ] Create custom REST endpoint class
- [ ] Implement GET /updates endpoint
- [ ] **Implement GET /authors/search endpoint (Co-Authors Plus)**
- [ ] Parse blocks from post content
- [ ] Return formatted update data (including coauthors)
- [ ] Add timestamp filtering (since parameter)
- [ ] Implement change detection (new/modified/deleted)
- [ ] Add caching with transients
- [ ] Test API responses

### Phase 3: Frontend Polling & Schema (Week 3)

- [ ] Create LiveBlogClient JavaScript class
- [ ] Implement basic polling mechanism
- [ ] Parse and categorize updates
- [ ] Enqueue scripts conditionally
- [ ] Pass post data to JavaScript
- [ ] Handle network errors
- [ ] Implement exponential backoff
- [ ] Add Page Visibility API support
- [ ] **Create Liveblog_Schema class**
- [ ] **Implement LiveBlogPosting schema generation**
- [ ] **Add schema output to wp_head**
- [ ] **Test schema with Google Rich Results Test**

### Phase 4: Non-Disruptive Updates (Week 4)

- [ ] Implement scroll position detection
- [ ] Create update queue system
- [ ] Build notification banner component
- [ ] Add smooth entry insertion animations
- [ ] Handle modified entry updates
- [ ] Implement entry update badges
- [ ] Add "Show Updates" functionality
- [ ] Test various user scenarios

### Phase 5: Tab Indicators (Week 5)

- [ ] Implement tab title updates
- [ ] Track unread update counts
- [ ] Store last-seen timestamp in localStorage
- [ ] Reset counts on user interaction
- [ ] Handle multiple update types in title
- [ ] Test cross-browser compatibility

### Phase 6: Polish & Testing (Week 6)

- [ ] Refine animations and transitions
- [ ] Add loading states
- [ ] Improve error messages
- [ ] **Style multiple author display with overlapping avatars**
- [ ] Accessibility improvements (ARIA)
- [ ] Mobile responsive design
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] **Validate Schema.org markup**
- [ ] Documentation

### Phase 7: Advanced Features (Optional)

- [ ] Pinned entries support
- [ ] Entry deletion with soft delete
- [ ] Edit history/revisions
- [ ] Sound notifications toggle
- [ ] Admin bar update indicator
- [ ] Quick-add entry form in sidebar
- [ ] Entry search/filter
- [ ] Export liveblog as HTML

## Technical Specifications

### WordPress Requirements

- WordPress 6.0+
- PHP 7.4+
- Gutenberg block editor enabled
- **Optional**: Co-Authors Plus plugin (for guest author support)

### Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

### Performance Targets

- Polling: Max 15-30s interval
- API response: < 500ms
- Animation: 60fps
- Bundle size: < 100KB (combined)

### Security Considerations

- Nonce verification for authenticated endpoints
- Capability checks (`edit_post` for modifications)
- Input sanitization and output escaping
- Rate limiting on API endpoints (future)
- XSS prevention in rendered content

### Accessibility

- ARIA live regions for new updates
- Keyboard navigation support
- Screen reader announcements
- Focus management on update insertion
- Color contrast compliance (WCAG AA)

## Testing Strategy

### Unit Tests

- Block attribute validation
- Update parsing logic
- Timestamp comparison functions
- Queue management

### Integration Tests

- REST API endpoints
- Block save/load cycle
- Polling mechanism
- Update notifications

### Manual Testing Scenarios

1. Create liveblog, add entries, verify save
2. Publish post, verify frontend rendering
3. Add new entry, verify it appears within interval
4. Edit entry, verify modified indicator
5. Scroll down, add entry, verify notification appears
6. Click notification, verify smooth scroll and insertion
7. Test with tab inactive
8. Test network disconnection/reconnection
9. Test with multiple users editing simultaneously
10. Test on mobile devices
11. **Test Co-Authors Plus integration: add guest authors to entries**
12. **Test fallback when Co-Authors Plus is deactivated**
13. **Validate Schema.org markup with Google Rich Results Test**
14. **Verify multiple authors display correctly on frontend**

## Deployment Checklist

- [ ] Version number updated in main plugin file
- [ ] Changelog updated
- [ ] Build assets compiled (`npm run build`)
- [ ] No console errors in browser
- [ ] Plugin tested with WordPress debug mode
- [ ] Screenshots prepared for documentation
- [ ] README.md updated
- [ ] License file included
- [ ] Tested plugin activation/deactivation
- [ ] Tested with other common plugins
- [ ] Tested with default WordPress themes

## Future Enhancements

### Version 1.1

- Email/push notifications for subscribers
- Liveblog archive/completion state
- Entry categories/tags
- Featured/highlighted entries
- Social media embeds optimization

### Version 1.2

- WebSocket support (as alternative to polling)
- Multi-author collaboration indicators
- Entry comments/reactions
- Analytics integration
- Custom timestamp formats

### Version 2.0

- Headless/REST-first architecture
- GraphQL endpoint option
- Real-time collaboration (similar to Google Docs)
- Advanced moderation tools
- Entry templates

## Resources

### WordPress Documentation

- [Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [REST API Handbook](https://developer.wordpress.org/rest-api/)
- [@wordpress/scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/)

### Co-Authors Plus

- [Plugin Repository](https://wordpress.org/plugins/co-authors-plus/)
- [GitHub Repository](https://github.com/Automattic/Co-Authors-Plus)
- [Documentation](https://github.com/Automattic/Co-Authors-Plus/wiki)

### Schema.org

- [LiveBlogPosting Documentation](https://schema.org/LiveBlogPosting)
- [Google Search Central - Live Blog](https://developers.google.com/search/docs/appearance/structured-data/article#live-blog)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

### Key WordPress Functions

- `register_block_type()`
- `register_rest_route()`
- `parse_blocks()`
- `wp_enqueue_script()`
- `wp_localize_script()`
- `set_transient()` / `get_transient()`
- `has_block()`
- `get_coauthors()` (Co-Authors Plus)

### Code References

- InnerBlocks: [@wordpress/block-editor](https://github.com/WordPress/gutenberg/tree/trunk/packages/block-editor/src/components/inner-blocks)
- REST API: [wp-includes/rest-api/](https://github.com/WordPress/WordPress/tree/master/wp-includes/rest-api)

## Notes for Cursor

- Follow WordPress coding standards
- Use ESNext syntax, @wordpress/scripts will transpile
- Leverage WordPress packages (@wordpress/blocks, @wordpress/element, etc.)
- All text should be internationalized with `__()` and `_e()`
- Use WordPress security functions (wp_verify_nonce, current_user_can, etc.)
- Prefix all function/class names with `liveblog_`
- CSS classes should use BEM methodology
- Comment complex logic thoroughly
- **Always check if Co-Authors Plus is active before using its functions**
- **Gracefully degrade to standard WordPress authors if CAP is not available**
- **Schema.org markup should be valid JSON-LD and pass Google Rich Results Test**
- **Include proper author attribution in schema for both single and multiple authors**

---

**Last Updated**: 2026-02-03
**Plugin Name**: LiveBlog
**Version**: 1.0.0
**Author**: [Your Name]
