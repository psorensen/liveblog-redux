<?php
/**
 * REST API endpoints for liveblog updates.
 *
 * @package Liveblog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Liveblog_REST
 */
class Liveblog_REST {

	const NAMESPACE          = 'liveblog/v1';
	const CACHE_TTL          = 300; // 5 minutes.
	const CACHE_KEY_PREFIX   = 'liveblog_updates_';
	const META_LAST_MODIFIED = '_liveblog_last_modified';

	/**
	 * Register REST routes.
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_action( 'save_post', array( $this, 'invalidate_cache_on_save' ), 10, 2 );
	}

	/**
	 * Register REST API routes.
	 */
	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/posts/(?P<post_id>\d+)/updates',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_updates' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'post_id'          => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => array( $this, 'validate_post_id' ),
					),
					'since'            => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'default'           => 0,
					),
					'include_modified' => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'per_page'         => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'default'           => 50,
						'minimum'           => 1,
						'maximum'           => 100,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/posts/(?P<post_id>\d+)/updates/count',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_updates_count' ),
				'permission_callback' => array( $this, 'check_read_post' ),
				'args'                => array(
					'post_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => array( $this, 'validate_post_id' ),
					),
					'since'   => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'default'           => 0,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/authors/search',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'search_authors' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'search' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Permission callback: user can read the post.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return bool
	 */
	public function check_read_post( $request ) {
		$post_id = (int) $request['post_id'];
		return current_user_can( 'read_post', $post_id );
	}

	/**
	 * Validate post_id: post exists and has liveblog block.
	 *
	 * @param int $value   Post ID.
	 * @return true|\WP_Error
	 */
	public function validate_post_id( $value ) {
		$post = get_post( $value );
		if ( ! $post ) {
			return new \WP_Error( 'rest_post_invalid_id', __( 'Invalid post ID.', 'liveblog' ), array( 'status' => 404 ) );
		}
		if ( ! has_block( 'liveblog/container', $post ) ) {
			return new \WP_Error( 'rest_no_liveblog', __( 'Post does not contain a liveblog.', 'liveblog' ), array( 'status' => 404 ) );
		}
		return true;
	}

	/**
	 * GET /posts/{post_id}/updates
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_updates( $request ) {
		$post_id          = (int) $request['post_id'];
		$since            = (int) $request['since'];
		$include_modified = (bool) $request['include_modified'];
		$per_page         = (int) $request['per_page'];

		$last_modified = (int) get_post_meta( $post_id, self::META_LAST_MODIFIED, true );
		$cache_key     = self::CACHE_KEY_PREFIX . $post_id . '_' . $last_modified;
		$cached        = false;
		if ( $since === 0 ) {
			$cached = get_transient( $cache_key );
		}
		if ( false !== $cached ) {
			$all_entries = $cached;
		} else {
			if ( $since > 0 ) {
				wp_cache_delete( $post_id, 'posts' );
			}
			$all_entries = $this->get_entries_from_post( $post_id );
			if ( is_wp_error( $all_entries ) ) {
				return $all_entries;
			}
			if ( $since === 0 ) {
				set_transient( $cache_key, $all_entries, self::CACHE_TTL );
			}
		}

		$updates = array();
		$count   = 0;
		foreach ( $all_entries as $entry ) {
			if ( $count >= $per_page ) {
				break;
			}
			$attrs     = $entry['attrs'];
			$ts        = isset( $attrs['timestamp'] ) ? (int) $attrs['timestamp'] : 0;
			$modified  = isset( $attrs['modified'] ) ? (int) $attrs['modified'] : 0;
			$update_id = isset( $attrs['updateId'] ) ? $attrs['updateId'] : '';

			if ( $since > 0 ) {
				// New = created after client's snapshot (timestamp > since). Do not require modified <= since,
				// because new entries often have modified set by the editor when the user types before save.
				$is_new = $ts > $since || ( $ts === 0 && $modified === 0 );
				// Modified = existed at since (timestamp <= since) but edited after (modified > since).
				$is_modified = $include_modified && $ts <= $since && $modified > $since;
				if ( ! $is_new && ! $is_modified ) {
					continue;
				}
			}

			$change_type = 'new';
			if ( $since > 0 && $ts <= $since && $modified > $since ) {
				$change_type = 'modified';
			}
			if ( ! $include_modified && $change_type === 'modified' ) {
				continue;
			}

			$author_id   = isset( $attrs['authorId'] ) ? (int) $attrs['authorId'] : 0;
			$author_name = '';
			if ( $author_id ) {
				$user        = get_userdata( $author_id );
				$author_name = $user ? $user->display_name : '';
			}
			$coauthors_data      = isset( $attrs['coauthors'] ) && is_array( $attrs['coauthors'] ) ? $attrs['coauthors'] : array();
			$coauthors_formatted = $this->format_coauthors_for_api( $coauthors_data );
			if ( ! empty( $coauthors_formatted ) && empty( $author_name ) ) {
				$author_name = $coauthors_formatted[0]['display_name'];
			}

			$content = '';
			if ( ! empty( $entry['block'] ) ) {
				$content = (string) render_block( $entry['block'] );
			}

			$updates[] = array(
				'id'          => $update_id ? $update_id : 'update-' . $ts,
				'timestamp'   => $ts,
				'modified'    => $modified,
				'author'      => $author_name,
				'author_id'   => $author_id,
				'coauthors'   => $coauthors_formatted,
				'content'     => $content,
				'status'      => isset( $attrs['status'] ) ? $attrs['status'] : 'published',
				'change_type' => $change_type,
				'is_pinned'   => ! empty( $attrs['isPinned'] ),
			);
			++$count;
		}

		$last_modified_response = 0;
		foreach ( $all_entries as $e ) {
			$m = isset( $e['attrs']['modified'] ) ? (int) $e['attrs']['modified'] : (int) ( $e['attrs']['timestamp'] ?? 0 );
			if ( $m > $last_modified_response ) {
				$last_modified_response = $m;
			}
		}

		return rest_ensure_response(
			array(
				'updates'       => $updates,
				'last_modified' => $last_modified_response,
				'has_more'      => count( $all_entries ) > $count,
			)
		);
	}

	/**
	 * GET /posts/{post_id}/updates/count
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_updates_count( $request ) {
		$post_id = (int) $request['post_id'];
		$since   = (int) $request['since'];

		$last_modified = (int) get_post_meta( $post_id, self::META_LAST_MODIFIED, true );
		$cache_key     = self::CACHE_KEY_PREFIX . $post_id . '_' . $last_modified;
		$cached        = get_transient( $cache_key );

		if ( false !== $cached ) {
			$all_entries = $cached;
		} else {
			$all_entries = $this->get_entries_from_post( $post_id );
			if ( is_wp_error( $all_entries ) ) {
				return $all_entries;
			}
			set_transient( $cache_key, $all_entries, self::CACHE_TTL );
		}

		$new_count      = 0;
		$modified_count = 0;
		foreach ( $all_entries as $entry ) {
			$attrs    = $entry['attrs'];
			$ts       = isset( $attrs['timestamp'] ) ? (int) $attrs['timestamp'] : 0;
			$modified = isset( $attrs['modified'] ) ? (int) $attrs['modified'] : 0;
			if ( $since === 0 ) {
				++$new_count;
				continue;
			}
			if ( $ts > $since || ( $ts === 0 && $modified === 0 ) ) {
				++$new_count;
			} elseif ( $ts <= $since && $modified > $since ) {
				++$modified_count;
			}
		}

		return rest_ensure_response(
			array(
				'count'          => $new_count + $modified_count,
				'new_count'      => $new_count,
				'modified_count' => $modified_count,
			)
		);
	}

	/**
	 * GET /authors/search (Co-Authors Plus).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function search_authors( $request ) {
		if ( ! $this->has_coauthors_plus() ) {
			return new \WP_Error( 'cap_not_available', __( 'Co-Authors Plus is not installed.', 'liveblog' ), array( 'status' => 501 ) );
		}

		$search = $request->get_param( 'search' );
		if ( strlen( $search ) < 2 ) {
			return rest_ensure_response( array() );
		}

		$authors = $this->search_cap_authors( $search, 10 );

		$items = [];

		foreach ( $authors as $author ) {
			$items[] = [
				'id'         => $author['id'],
				'name'       => $author['display_name'],
				'type'       => 'user',
				'avatar_url' => $this->get_coauthor_avatar_url( $author['id'] ),
			];
		}

		return new \WP_REST_Response( $items );
	}

	/**
	 * Invalidate cache when post is saved.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 */
	public function invalidate_cache_on_save( $post_id, $post ) {
		if ( ! $post || ! has_block( 'liveblog/container', $post ) ) {
			return;
		}
		clean_post_cache( $post_id );
		$last = (int) get_post_meta( $post_id, self::META_LAST_MODIFIED, true );
		delete_transient( self::CACHE_KEY_PREFIX . $post_id . '_' . $last );
		update_post_meta( $post_id, self::META_LAST_MODIFIED, time() );
	}

	/**
	 * Get parsed entry blocks from post (with block object for rendering).
	 *
	 * @param int $post_id Post ID.
	 * @return array|\WP_Error Array of { attrs, block } or WP_Error.
	 */
	private function get_entries_from_post( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return new \WP_Error( 'rest_post_invalid_id', __( 'Invalid post ID.', 'liveblog' ), array( 'status' => 404 ) );
		}
		$blocks    = parse_blocks( $post->post_content );
		$container = $this->find_liveblog_container( $blocks );
		if ( ! $container ) {
			return array();
		}
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

	/**
	 * Find liveblog/container in block tree.
	 *
	 * @param array $blocks Parsed blocks.
	 * @return array|null Block array or null.
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
	 * Format coauthors array for API (avatar_url, etc.).
	 * For guest authors (Co-Authors Plus), uses guest author email for avatar when available.
	 *
	 * @param array $coauthors_data From block attributes.
	 * @return array
	 */
	private function format_coauthors_for_api( array $coauthors_data ) {
		if ( empty( $coauthors_data ) ) {
			return array();
		}
		$out = array();
		foreach ( $coauthors_data as $c ) {
			$id         = isset( $c['id'] ) ? $c['id'] : '';
			$type       = isset( $c['type'] ) ? $c['type'] : 'wpuser';
			$cap_id     = is_string( $id ) ? preg_replace( '/^cap-/', '', $id ) : $id;
			$avatar_url = $this->get_coauthor_avatar_url( $cap_id, $type );
			$out[]      = array(
				'id'           => $id,
				'display_name' => isset( $c['display_name'] ) ? $c['display_name'] : '',
				'avatar_url'   => $avatar_url,
				'type'         => $type,
			);
		}
		return $out;
	}

	/**
	 * Get avatar URL for a coauthor (WP user or Co-Authors Plus guest author).
	 *
	 * @param int|string $cap_id Numeric ID (WP user ID or guest author post ID).
	 * @return string Avatar URL.
	 */
	private function get_coauthor_avatar_url( $cap_id ) {
		return get_avatar_url( $cap_id, array( 'size' => 96 ) );
	}

	/**
	 * Whether Co-Authors Plus is available.
	 *
	 * @return bool
	 */
	private function has_coauthors_plus() {
		return function_exists( 'get_coauthors' ) && class_exists( 'CoAuthors_Guest_Authors' );
	}

	/**
	 * Search Co-Authors Plus authors (WP users + guest authors).
	 * CAP's search_authors() can miss guest authors when their taxonomy term
	 * description is empty or slug resolution fails. We merge CAP results with
	 * a direct guest-author post type search so guest authors always appear.
	 *
	 * @param string $search Search term.
	 * @param int    $limit  Max results.
	 * @return array
	 */
	private function search_cap_authors( $search, $limit = 10 ) {
		$seen_ids = array();
		$results  = array();

		if ( class_exists( 'CoAuthors_Plus' ) ) {
			global $coauthors_plus;
			if ( $coauthors_plus instanceof \CoAuthors_Plus && method_exists( $coauthors_plus, 'search_authors' ) ) {
				$users = $coauthors_plus->search_authors( $search, array(), $limit );
				foreach ( (array) $users as $author ) {
					$id = isset( $author->ID ) ? $author->ID : 0;
					if ( $id && ! isset( $seen_ids[ $id ] ) ) {
						$seen_ids[ $id ] = true;
						$type            = isset( $author->type ) && $author->type === 'guest-author' ? 'guest' : 'wpuser';
						$results[]       = array(
							'id'           => 'cap-' . $id,
							'display_name' => isset( $author->display_name ) ? $author->display_name : '',
							'avatar_url'   => $this->get_coauthor_avatar_url( $id, $type ),
							'type'         => $type,
						);
					}
				}
			}
		}

		return array_slice( $results, 0, $limit );
	}
}
