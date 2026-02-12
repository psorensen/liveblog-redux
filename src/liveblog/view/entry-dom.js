/**
 * Build and update liveblog entry DOM nodes (new entries, apply updates, insert).
 */

import { ENTRY_ENTER_ANIMATION_MS } from './constants.js';
import {
	formatTimestamp,
	escapeSelectorAttr,
	safeParseHtml,
	triggerOembedLoad,
} from './utils.js';

/**
 * @param {Object} update API update object (id, content, timestamp, author, coauthors).
 * @returns {HTMLElement|null}
 */
export function buildNewEntryElement( update ) {
	const content = typeof update.content === 'string' ? update.content : '';
	const id = update.id;
	let el = null;
	if ( content && content.trim() ) {
		el = safeParseHtml( content );
	}
	if ( ! el && id ) {
		el = document.createElement( 'div' );
		el.className = 'liveblog-entry';
		el.setAttribute( 'data-update-id', id );
		if ( update.timestamp )
			el.setAttribute( 'data-timestamp', update.timestamp );
		const hasAuthor =
			update.author ||
			( update.coauthors && update.coauthors.length > 0 );
		if ( hasAuthor ) {
			const header = document.createElement( 'div' );
			header.className = 'liveblog-entry__header';
			const time = document.createElement( 'time' );
			time.className = 'liveblog-entry__time';
			time.textContent = formatTimestamp( update.timestamp );
			const authorsWrap = document.createElement( 'span' );
			authorsWrap.className = 'liveblog-entry__authors';
			if ( update.coauthors && update.coauthors.length > 0 ) {
				const avatarsSpan = document.createElement( 'span' );
				avatarsSpan.className = 'liveblog-entry__author-avatars';
				for ( const c of update.coauthors ) {
					const url = c.avatar_url;
					if (
						url &&
						( url.startsWith( 'https://' ) ||
							url.startsWith( 'http://' ) ||
							url.startsWith( '/' ) )
					) {
						const img = document.createElement( 'img' );
						img.src = url;
						img.alt = '';
						img.width = 24;
						img.height = 24;
						avatarsSpan.appendChild( img );
					}
				}
				const namesSpan = document.createElement( 'span' );
				namesSpan.className = 'liveblog-entry__author-names';
				namesSpan.textContent = update.coauthors
					.map( ( c ) => c.display_name || '' )
					.join( ', ' );
				authorsWrap.appendChild( avatarsSpan );
				authorsWrap.appendChild( document.createTextNode( ' ' ) );
				authorsWrap.appendChild( namesSpan );
			} else {
				authorsWrap.textContent = update.author || '';
			}
			header.appendChild( time );
			header.appendChild( document.createTextNode( ' ' ) );
			header.appendChild( authorsWrap );
			el.appendChild( header );
		}
		const body = document.createElement( 'div' );
		body.className = 'liveblog-entry__content';
		body.appendChild( document.createElement( 'p' ) );
		el.appendChild( body );
	}
	return el;
}

/**
 * @param {Element} container Liveblog container element.
 * @param {Object} update API update object with id and content.
 */
export function applyUpdateToEntry( container, update ) {
	const content = typeof update.content === 'string' ? update.content : '';
	const id = update.id;
	if ( ! id || ! content.trim() ) return;
	const existing = container.querySelector(
		`[data-update-id="${ escapeSelectorAttr( id ) }"]`
	);
	if ( ! existing || ! existing.parentNode ) return;
	const newEl = safeParseHtml( content );
	if ( newEl ) {
		existing.parentNode.replaceChild( newEl, existing );
		triggerOembedLoad( newEl );
	}
}

/**
 * @param {Element} container Liveblog container element.
 * @param {HTMLElement} el New entry element to insert.
 */
export function insertNewEntry( container, el ) {
	if ( ! el ) return;
	el.classList.add( 'liveblog-entry--enter' );
	// Always insert at top (newest first). Do not use load-more button as reference or new entries would appear at bottom.
	container.insertBefore( el, container.firstChild );
	triggerOembedLoad( el );
	setTimeout(
		() => el.classList.remove( 'liveblog-entry--enter' ),
		ENTRY_ENTER_ANIMATION_MS
	);
}
