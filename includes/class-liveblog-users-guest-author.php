<?php
/**
 * REST API support for guest authors on the WordPress users endpoint.
 *
 * Registers a route under /wp/v2/users/ so that requests for cap-{id} return
 * Co-Authors Plus guest author data in the same shape as a standard user object.
 *
 * @package Liveblog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use CoAuthors_Plus;

/**
 * Class Liveblog_Users_Guest_Author
 */
class Liveblog_Users_Guest_Author {

	const GUEST_AUTHOR_ID_PREFIX = 'cap-';
	const USERS_NAMESPACE        = 'wp/v2';
	const USERS_REST_BASE        = 'users';

	/**
	 * Register REST route and collection filter.
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_route' ), 9 );
		add_filter( 'rest_pre_dispatch', array( $this, 'maybe_serve_users_collection_with_guests' ), 10, 3 );
	}


	/**
	 * Check permissions for a single guest author request.
	 *
	 * Mirrors core users endpoint: view/embed allowed for request context,
	 * edit context requires list_users.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return true|\WP_Error
	 */
	public function get_item_permissions_check( $request ) {
		$context = $request->get_param( 'context' );
		if ( 'edit' === $context && ! current_user_can( 'list_users' ) ) {
			return new \WP_Error(
				'rest_forbidden_context',
				__( 'Sorry, you are not allowed to use the edit context for guest authors.', 'liveblog-redux' ),
				array( 'status' => rest_authorization_required_code() )
			);
		}
		return true;
	}

	/**
	 * Get a single guest author formatted as a user object.
	 *
	 * @param \WP_REST_Request $request Request (cap_id from route).
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_guest_author( $request ) {
		$cap_id = (int) $request['cap_id'];
		$guest  = $this->get_guest_author_by_id( $cap_id );

		if ( ! $guest ) {
			return new \WP_Error(
				'rest_guest_author_invalid_id',
				__( 'Invalid guest author ID.', 'liveblog-redux' ),
				array( 'status' => 404 )
			);
		}

		$data = $this->guest_author_to_user_response( $guest, $request );
		return rest_ensure_response( $data );
	}

	/**
	 * Retrieve a guest author by numeric ID.
	 *
	 * @param int $cap_id Guest author (post) ID.
	 * @return object|false Guest author object or false.
	 */
	private function get_guest_author_by_id( $cap_id ) {
		if ( ! $this->has_coauthors_plus() ) {
			return false;
		}

		global $coauthors_plus;
		// Co-Authors Plus plugin class; optional dependency.
		if ( ! function_exists( 'get_coauthors' ) ) {
			return false;
		}

		$guest = $coauthors_plus->get_coauthor_by( 'ID', $cap_id );
		if ( ! is_object( $guest ) || empty( $guest->ID ) ) {
			return false;
		}

		// Ensure we have a guest author, not a linked WP user.
		if ( empty( $guest->type ) || 'guest-author' !== $guest->type ) {
			return false;
		}

		return $guest;
	}

	/**
	 * Map a Co-Authors Plus guest author to WP user response shape.
	 *
	 * @param object           $guest   Guest author from get_coauthor_by( 'ID', ... ).
	 * @param \WP_REST_Request $request Request (for context).
	 * @return array User-shaped array for REST response.
	 */
	private function guest_author_to_user_response( $guest, $request ) {
		$context = $request->get_param( 'context' );
		$link    = apply_filters( 'author_link', '', $guest->ID, $guest->user_nicename );
		$link    = is_string( $link ) ? $link : '';

		$avatar_sizes = array( 24, 48, 96 );
		$avatar_urls  = array();
		$avatar_arg   = ! empty( $guest->user_email ) ? $guest->user_email : $guest->ID;
		foreach ( $avatar_sizes as $size ) {
			$avatar_urls[ (string) $size ] = get_avatar_url( $avatar_arg, array( 'size' => $size ) );
		}

		$data = array(
			'id'          => (int) $guest->ID,
			'name'        => isset( $guest->display_name ) ? $guest->display_name : '',
			'slug'        => isset( $guest->user_nicename ) ? $guest->user_nicename : '',
			'description' => isset( $guest->description ) ? $guest->description : '',
			'avatar_urls' => $avatar_urls,
			'link'        => $link,
			'url'         => isset( $guest->website ) ? $guest->website : '',
		);

		if ( 'view' === $context || 'embed' === $context ) {
			return $data;
		}

		if ( 'edit' === $context ) {
			$data['username']           = isset( $guest->user_login ) ? $guest->user_login : '';
			$data['first_name']         = isset( $guest->first_name ) ? $guest->first_name : '';
			$data['last_name']          = isset( $guest->last_name ) ? $guest->last_name : '';
			$data['email']              = isset( $guest->user_email ) ? $guest->user_email : '';
			$data['nickname']           = isset( $guest->nickname ) ? $guest->nickname : '';
			$data['registered_date']    = '';
			$data['roles']              = array();
			$data['capabilities']       = new \stdClass();
			$data['extra_capabilities'] = new \stdClass();
		}

		return $data;
	}

	/**
	 * Whether Co-Authors Plus (with guest authors) is available.
	 *
	 * @return bool
	 */
	private function has_coauthors_plus() {
		return function_exists( 'get_coauthors' ) && class_exists( 'CoAuthors_Guest_Authors' );
	}
}
