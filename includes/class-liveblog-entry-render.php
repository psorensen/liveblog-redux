<?php
/**
 * Server-side render for the liveblog entry block with pluggable header via template part.
 *
 * Hooks into the block via the render_block_liveblog/entry filter. Renders the entry
 * wrapper, then the header (from theme template part or default), then the block inner
 * content.
 *
 * Header template part: if the theme defines liveblog/entry-header.php in its root
 * (i.e. get_template_directory() . '/liveblog/entry-header.php' exists), that file is
 * loaded with get_template_part( 'liveblog/entry-header', null, $header_data ). The
 * template receives the header data as the third parameter (typically $args): timestamp,
 * formatted_time, modified, is_modified, authors, update_id. When Co-Authors Plus is
 * active, authors is an array of co-author objects (e.g. ->display_name). If the theme
 * file does not exist or outputs nothing, the default header markup is used instead.
 *
 * @package Liveblog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Liveblog_Entry_Render
 */
class Liveblog_Entry_Render {

	/**
	 * Query var name (reserved). Header data is passed to the template via get_template_part( ..., null, $header_data ), not this query var.
	 *
	 * @var string
	 */
	const HEADER_DATA_QUERY_VAR = 'liveblog_entry_header_data';

	/**
	 * Register the entry block render filter.
	 */
	public static function register() {
		add_filter( 'render_block_liveblog/entry', array( __CLASS__, 'render' ), 10, 3 );
	}

	/**
	 * Render the entry block: wrapper + header (template part or default) + inner content.
	 *
	 * @param string   $block_content Block content (unused; we output our own markup).
	 * @param array    $block         Parsed block array (attrs, innerBlocks, etc.).
	 * @param WP_Block $instance      Block instance.
	 * @return string HTML output.
	 */
	public static function render( $block_content, $block, WP_Block $instance ) {
		$attrs = is_array( $block['attrs'] ) ? $block['attrs'] : [];

		$header_data = self::prepare_header_data( $attrs );

		// If the theme has liveblog/entry-header.php, load it with $header_data as $args; else use default markup.
		ob_start();
		if ( file_exists( get_template_directory() . '/liveblog/entry-header.php' ) ) {
			get_template_part( 'liveblog/entry-header', null, $header_data );
		} else {
			self::default_header_markup( $header_data );
		}
		$header = ob_get_clean();

		if ( '' === trim( (string) $header ) ) {
			$header = self::default_header_markup( $header_data );
		}

		$wrapper_attrs = array(
			'class' => 'liveblog-entry',
		);

		if ( $attrs['updateId'] ) {
			$wrapper_attrs['data-update-id'] = $attrs['updateId'];
		}
		if ( $attrs['timestamp'] ) {
			$wrapper_attrs['data-timestamp'] = (string) $attrs['timestamp'];
		}

		$attr_string = self::build_attribute_string( $wrapper_attrs );

		// render the inner blocks.
		$inner_blocks_rendered = array_map(
			function ( $block ) {
				return $block['innerHTML'];
			},
			$block['innerBlocks']
		);

		return sprintf(
			'<div %1$s>%2$s<div class="liveblog-entry__content">%3$s</div></div>',
			$attr_string,
			$header,
			implode( '', $inner_blocks_rendered )
		);
	}

	/**
	 * Prepare data array for the header (template part or default markup).
	 *
	 * When Co-Authors Plus is active, authors are resolved to co-author objects (e.g. with display_name).
	 *
	 * @param array $attrs Block attributes.
	 * @return array {
	 *     @type int    $timestamp       Unix timestamp.
	 *     @type string $formatted_time  Localized time string.
	 *     @type int    $modified        Unix timestamp of last edit, or 0.
	 *     @type bool   $is_modified     True if entry was edited.
	 *     @type array  $authors         List of author objects (e.g. Co-Authors Plus co-author objects with display_name).
	 *     @type string $update_id       Unique entry id for the DOM.
	 * }
	 */
	public static function prepare_header_data( $attrs ) {
		$ts        = isset( $attrs['timestamp'] ) ? (int) $attrs['timestamp'] : 0;
		$modified  = isset( $attrs['modified'] ) ? (int) $attrs['modified'] : 0;
		$update_id = isset( $attrs['updateId'] ) ? $attrs['updateId'] : '';

		$formatted_time = '';
		if ( $ts ) {
			$formatted_time = date_i18n( get_option( 'time_format' ), $ts );
		}

		$authors = array();
		if ( ! empty( $attrs['authors'] ) && is_array( $attrs['authors'] ) ) {
			if ( function_exists( 'get_coauthors' ) ) {
				$authors = array_map(
					function ( $author ) {
						global $coauthors_plus;
						return $coauthors_plus->get_coauthor_by( 'id', $author['id'] );
					},
					$attrs['authors']
				);
			}
		}

		// todo: support WP Users without Co-Authors Plus,

		return array(
			'timestamp'      => $ts,
			'formatted_time' => $formatted_time,
			'modified'       => $modified,
			'is_modified'    => $modified > 0 && $modified >= $ts,
			'authors'        => $authors,
			'update_id'      => $update_id ? $update_id : ( $ts ? 'update-' . $ts : '' ),
		);
	}

	/**
	 * Default header markup when no theme template part exists (BEM classes for existing CSS).
	 *
	 * Expects $data['authors'] to be objects with a display_name property (e.g. Co-Authors Plus co-author objects).
	 * Outputs HTML directly (no return value). Call inside output buffer when capture is needed.
	 *
	 * @param array $data Output of prepare_header_data().
	 */
	private static function default_header_markup( $data ) {
		$timestamp      = $data['timestamp'];
		$formatted_time = $data['formatted_time'];
		$authors        = $data['authors'];
		?>

		<div class="liveblog-entry__header">
			<?php if ( $timestamp ) : ?>
				<time class="liveblog-entry__time" datetime="<?php echo esc_attr( $timestamp ); ?>"><?php echo esc_html( $formatted_time ); ?></time>
			<?php endif; ?>
			<?php if ( ! empty( $authors ) ) : ?>
				<span class="liveblog-entry__authors">
					<?php foreach ( $authors as $author ) : ?>
						<span class="liveblog-entry__author"><?php echo esc_html( $author->display_name ); ?></span>
					<?php endforeach; ?>
				</span>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Build a string of HTML attributes from an associative array.
	 *
	 * @param array $attrs Key-value attributes (values escaped).
	 * @return string Attribute string for use in an opening tag.
	 */
	private static function build_attribute_string( $attrs ) {
		$out = [];
		foreach ( $attrs as $k => $v ) {
			if ( '' === $v && 'class' !== $k ) {
				continue;
			}
			$out[] = sprintf( '%s="%s"', sanitize_key( $k ), esc_attr( $v ) );
		}
		return implode( ' ', $out );
	}
}
