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

function copyToClipboard( text ) {
	if ( navigator.clipboard && typeof navigator.clipboard.writeText === 'function' ) {
		return navigator.clipboard.writeText( text );
	}
	// Fallback for insecure context (e.g. HTTP) or older browsers.
	const textarea = document.createElement( 'textarea' );
	textarea.value = text;
	textarea.setAttribute( 'readonly', '' );
	textarea.style.position = 'absolute';
	textarea.style.left = '-9999px';
	document.body.appendChild( textarea );
	textarea.select();
	try {
		document.execCommand( 'copy' );
	} catch ( err ) {
		// Copy may fail in some contexts; still resolve so UI can show feedback.
	} finally {
		document.body.removeChild( textarea );
	}
	return Promise.resolve();
}

function initCopyLink() {
	document.addEventListener( 'click', ( event ) => {
		const btn = event.target.closest( '.liveblog-entry__copy-link-btn' );
		if ( ! btn ) {
			return;
		}
		const entryId = btn.getAttribute( 'data-entry-id' );
		if ( ! entryId ) {
			return;
		}
		const url = window.location.origin + window.location.pathname + ( window.location.search || '' ) + '#' + entryId;
		const copiedLabel = btn.dataset.copiedLabel || 'Link copied.';
		const originalContent = btn.innerHTML;
		const originalAriaLabel = btn.getAttribute( 'aria-label' );

		copyToClipboard( url ).then( () => {
			btn.classList.add( 'is-copied' );
			btn.setAttribute( 'aria-label', copiedLabel );
			btn.innerHTML = '';
			btn.textContent = copiedLabel;
			setTimeout( () => {
				btn.classList.remove( 'is-copied' );
				btn.setAttribute( 'aria-label', originalAriaLabel );
				btn.innerHTML = originalContent;
			}, 2000 );
		} );
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', () => {
		initReadMore();
		initCopyLink();
	} );
} else {
	initReadMore();
	initCopyLink();
}
