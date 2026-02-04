<?php
/**
 * Plugin Name:       Liveblog Redux
 * Description:       A modernized version of the Liveblog plugin.
 * Version:           0.1.0
 * Requires at least: 6.7
 * Requires PHP:      7.4
 * Author:            Peter Sorensen, Robots
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       liveblog-redux
 *
 * @package Liveblog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once __DIR__ . '/includes/class-liveblog-rest.php';
require_once __DIR__ . '/includes/class-liveblog-schema.php';

/**
 * Registers the block using a `blocks-manifest.php` file, which improves the performance of block type registration.
 * Behind the scenes, it also registers all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://make.wordpress.org/core/2025/03/13/more-efficient-block-type-registration-in-6-8/
 * @see https://make.wordpress.org/core/2024/10/17/new-block-type-registration-apis-to-improve-performance-in-wordpress-6-7/
 */
function liveblog_liveblog_block_block_init() {
	/**
	 * Registers the block(s) metadata from the `blocks-manifest.php` and registers the block type(s)
	 * based on the registered block metadata.
	 * Added in WordPress 6.8 to simplify the block metadata registration process added in WordPress 6.7.
	 *
	 * @see https://make.wordpress.org/core/2025/03/13/more-efficient-block-type-registration-in-6-8/
	 */
	if ( function_exists( 'wp_register_block_types_from_metadata_collection' ) ) {
		wp_register_block_types_from_metadata_collection( __DIR__ . '/build', __DIR__ . '/build/blocks-manifest.php' );
		return;
	}

	/**
	 * Registers the block(s) metadata from the `blocks-manifest.php` file.
	 * Added to WordPress 6.7 to improve the performance of block type registration.
	 *
	 * @see https://make.wordpress.org/core/2024/10/17/new-block-type-registration-apis-to-improve-performance-in-wordpress-6-7/
	 */
	if ( function_exists( 'wp_register_block_metadata_collection' ) ) {
		wp_register_block_metadata_collection( __DIR__ . '/build', __DIR__ . '/build/blocks-manifest.php' );
	}
	/**
	 * Registers the block type(s) in the `blocks-manifest.php` file.
	 *
	 * @see https://developer.wordpress.org/reference/functions/register_block_type/
	 */
	$manifest_data = require __DIR__ . '/build/blocks-manifest.php';
	foreach ( array_keys( $manifest_data ) as $block_type ) {
		register_block_type( __DIR__ . "/build/{$block_type}" );
	}
}
add_action( 'init', 'liveblog_liveblog_block_block_init' );

/**
 * Bootstrap REST API and cache invalidation.
 */
function liveblog_rest_init() {
	new Liveblog_REST();
}
add_action( 'init', 'liveblog_rest_init' );

/**
 * Bootstrap Schema.org LiveBlogPosting output.
 */
function liveblog_schema_init() {
	new Liveblog_Schema();
}
add_action( 'init', 'liveblog_schema_init' );

/**
 * Print data to footer.
 */
function print_data_to_footer() {

	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return;
	}

	/**
	 * Filter the interval for liveblog polling. (Defaults to 10 seconds.)
	 *
	 * @param int $interval The interval in milliseconds.
	 */
	$polling_interval = apply_filters( 'liveblog_update_interval', 10000 );

	?>
	<script>
		var liveblogData = 
		<?php
			echo wp_json_encode(
				array(
					'restUrl'  => rest_url( "liveblog/v1/posts/{$post_id}/updates" ),
					'postId'   => $post_id,
					'interval' => $polling_interval,
				)
			);
		?>
		;
	</script>
	<?php
}

add_action( 'wp_footer', 'print_data_to_footer' );

