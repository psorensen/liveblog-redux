/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 *
 * When this file is defined as the value of the `viewScript` property
 * in `block.json` it will be enqueued on the front end of the site.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

function initReadMore() {
	document.addEventListener( 'click', ( event ) => {
		const btn = event.target.closest( '.liveblog-entry__read-more-btn' );
		if ( ! btn ) {
			return;
		}
		const entry = btn.closest( '.liveblog-entry' );
		if ( ! entry ) {
			return;
		}
		const moreEl = entry.querySelector( '.liveblog-entry__more' );
		if ( ! moreEl ) {
			return;
		}
		const expanded = btn.getAttribute( 'aria-expanded' ) === 'true';
		const readMore = btn.getAttribute( 'data-read-more' ) || 'Read more';
		const readLess = btn.getAttribute( 'data-read-less' ) || 'Read less';
		if ( expanded ) {
			moreEl.hidden = true;
			btn.setAttribute( 'aria-expanded', 'false' );
			btn.textContent = readMore;
		} else {
			moreEl.hidden = false;
			btn.setAttribute( 'aria-expanded', 'true' );
			btn.textContent = readLess;
		}
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initReadMore );
} else {
	initReadMore();
}
