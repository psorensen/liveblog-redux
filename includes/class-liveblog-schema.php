<?php
/**
 * Schema.org LiveBlogPosting structured data for posts containing the liveblog block.
 *
 * Outputs JSON-LD in wp_head so search engines can identify live blog content and
 * display update snippets (e.g. Google Rich Results).
 *
 * @package Liveblog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Liveblog_Schema
 */
class Liveblog_Schema {

	/**
	 * Register hooks.
	 */
	public function __construct() {
		add_action( 'wp_head', array( $this, 'output_schema' ) );
	}

	/**
	 * Output LiveBlogPosting JSON-LD only on singular posts that contain the liveblog block.
	 */
	public function output_schema() {
		$post_id = get_the_ID();
		if ( ! $post_id ) {
			return;
		}
		$post = get_post();
		if ( ! $post || ! has_block( 'liveblog/container', $post ) ) {
			return;
		}

		$schema = $this->generate_schema( $post );
		if ( empty( $schema ) ) {
			return;
		}

		echo '<script type="application/ld+json">' . "\n";
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-LD is encoded; schema values are escaped in generation.
		echo wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT );
		echo "\n" . '</script>' . "\n";
	}

	/**
	 * Build the full LiveBlogPosting schema object.
	 *
	 * @param \WP_Post $post Post object.
	 * @return array|null Schema array or null if no entries.
	 */
	private function generate_schema( $post ) {
		$blocks    = parse_blocks( $post->post_content );
		$container = $this->find_liveblog_container( $blocks );
		if ( ! $container || empty( $container['innerBlocks'] ) ) {
			return null;
		}

		$entries = $this->extract_entries( $container );
		if ( empty( $entries ) ) {
			return null;
		}

		$updates       = array();
		$timestamps    = array();
		$last_modified = (int) get_post_modified_time( 'U', false, $post );

		foreach ( $entries as $entry ) {
			$update = $this->entry_to_blog_posting_schema( $entry );
			if ( $update ) {
				$updates[] = $update;
				$ts        = isset( $entry['attrs']['timestamp'] ) ? (int) $entry['attrs']['timestamp'] : 0;
				if ( $ts > 0 ) {
					$timestamps[] = $ts;
				}
				$mod = isset( $entry['attrs']['modified'] ) ? (int) $entry['attrs']['modified'] : 0;
				if ( $mod > $last_modified ) {
					$last_modified = $mod;
				}
			}
		}

		if ( empty( $updates ) ) {
			return null;
		}

		$coverage_start = ! empty( $timestamps ) ? min( $timestamps ) : (int) get_post_time( 'U', false, $post );

		$schema = array(
			'@context'          => 'https://schema.org',
			'@type'             => 'LiveBlogPosting',
			'headline'          => get_the_title( $post ),
			'description'       => has_excerpt( $post ) ? get_the_excerpt( $post ) : wp_trim_words( wp_strip_all_tags( $post->post_content ), 35 ),
			'datePublished'     => get_post_time( 'c', false, $post ),
			'dateModified'      => gmdate( 'c', $last_modified ),
			'coverageStartTime' => gmdate( 'c', $coverage_start ),
			'author'            => $this->get_post_author_schema( $post ),
			'publisher'         => $this->get_publisher_schema(),
			'liveBlogUpdate'    => $updates,
		);

		return $schema;
	}

	/**
	 * Convert an entry block to BlogPosting schema.
	 *
	 * @param array $entry Entry with 'attrs' and 'block' keys.
	 * @return array|null BlogPosting schema or null.
	 */
	private function entry_to_blog_posting_schema( $entry ) {
		$attrs     = $entry['attrs'];
		$timestamp = isset( $attrs['timestamp'] ) ? (int) $attrs['timestamp'] : 0;
		if ( $timestamp <= 0 ) {
			return null;
		}

		$content = '';
		if ( ! empty( $entry['block'] ) ) {
			$content = (string) render_block( $entry['block'] );
		}
		$content  = wp_strip_all_tags( $content );
		$headline = wp_trim_words( $content, 15 );
		if ( empty( $headline ) ) {
			$headline = __( 'Update', 'liveblog' ) . ' ' . date_i18n( get_option( 'time_format' ), $timestamp );
		}

		$schema = array(
			'@type'         => 'BlogPosting',
			'headline'      => $headline,
			'datePublished' => gmdate( 'c', $timestamp ),
			'articleBody'   => $content,
			'author'        => $this->get_entry_authors_schema( $attrs ),
		);

		$modified = isset( $attrs['modified'] ) ? (int) $attrs['modified'] : 0;
		if ( $modified > 0 && $modified > $timestamp ) {
			$schema['dateModified'] = gmdate( 'c', $modified );
		}

		return $schema;
	}

	/**
	 * Get author schema for the post (single author).
	 *
	 * @param \WP_Post $post Post object.
	 * @return array Author Person or Organization.
	 */
	private function get_post_author_schema( $post ) {
		$author_id = (int) $post->post_author;
		if ( $author_id <= 0 ) {
			return $this->get_publisher_schema();
		}

		$author = get_userdata( $author_id );
		if ( ! $author ) {
			return $this->get_publisher_schema();
		}

		$person = array(
			'@type' => 'Person',
			'name'  => $author->display_name,
		);
		$url    = get_author_posts_url( $author_id );
		if ( $url ) {
			$person['url'] = $url;
		}

		return $person;
	}

	/**
	 * Get authors schema for a single entry (primary author + coauthors).
	 *
	 * @param array $attrs Entry block attributes.
	 * @return array List of Person schema (one or more).
	 */
	private function get_entry_authors_schema( $attrs ) {
		$authors = array();

		if ( ! empty( $attrs['coauthors'] ) && is_array( $attrs['coauthors'] ) ) {
			foreach ( $attrs['coauthors'] as $coauthor ) {
				$name = isset( $coauthor['display_name'] ) ? $coauthor['display_name'] : '';
				if ( '' === $name ) { // Yoda Condition
					continue;
				}
				$person = array(
					'@type' => 'Person',
					'name'  => $name,
				);
				$id     = isset( $coauthor['id'] ) ? $coauthor['id'] : '';
				if ( '' !== $id ) {
					$cap_id = is_numeric( $id ) ? (int) $id : (int) preg_replace( '/^cap-/', '', $id );
					if ( $cap_id > 0 ) {
						$url = get_author_posts_url( $cap_id );
						if ( $url ) {
							$person['url'] = $url;
						}
					}
				}
				$authors[] = $person;
			}
		}

		if ( empty( $authors ) ) {
			$author_id = isset( $attrs['authorId'] ) ? (int) $attrs['authorId'] : 0;
			if ( $author_id <= 0 ) {
				$authors[] = array(
					'@type' => 'Person',
					'name'  => __( 'Unknown', 'liveblog' ),
				);
			} else {
				$user   = get_userdata( $author_id );
				$person = array(
					'@type' => 'Person',
					'name'  => $user ? $user->display_name : __( 'Unknown', 'liveblog' ),
				);
				$url    = get_author_posts_url( $author_id );
				if ( $url ) {
					$person['url'] = $url;
				}
				$authors[] = $person;
			}
		}

		return $authors;
	}

	/**
	 * Get publisher schema (site name and logo).
	 *
	 * @return array Publisher Organization schema.
	 */
	private function get_publisher_schema() {
		$logo_url    = '';
		$custom_logo = get_theme_mod( 'custom_logo' );
		if ( $custom_logo ) {
			$logo_url = wp_get_attachment_image_url( $custom_logo, 'full' );
		}
		$logo = array(
			'@type' => 'ImageObject',
			'url'   => $logo_url ? $logo_url : '',
		);

		return array(
			'@type' => 'Organization',
			'name'  => get_bloginfo( 'name' ),
			'url'   => home_url( '/' ),
			'logo'  => $logo,
		);
	}

	/**
	 * Find liveblog/container in top-level blocks.
	 *
	 * @param array $blocks Parsed blocks.
	 * @return array|null Container block or null.
	 */
	private function find_liveblog_container( array $blocks ) {
		foreach ( $blocks as $block ) {
			if ( ( $block['blockName'] ?? '' ) === 'liveblog/container' ) {
				return $block;
			}
		}
		return null;
	}

	/**
	 * Extract entry blocks from container (attrs + block for rendering).
	 *
	 * @param array $container Container block with innerBlocks.
	 * @return array List of entries with 'attrs' and 'block'.
	 */
	private function extract_entries( $container ) {
		$entries = array();
		foreach ( $container['innerBlocks'] ?? array() as $block ) {
			if ( ( $block['blockName'] ?? '' ) !== 'liveblog/entry' ) {
				continue;
			}
			$entries[] = array(
				'attrs' => $block['attrs'] ?? array(),
				'block' => $block,
			);
		}
		return $entries;
	}
}
