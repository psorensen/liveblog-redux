/**
 * Deep links: when the URL hash names an entry that Load more has not loaded
 * yet, load older entries until it appears, then scroll to it and focus it.
 */

import { MAX_DEEP_LINK_PAGES } from './constants.js';
import { escapeSelectorAttr } from './utils.js';
import { loadMoreEntries } from './load-more.js';

// Lets a newer hash change cancel a search that is still loading pages.
let activeRun = 0;

// Reader input that cancels a search in progress.
const CANCEL_EVENTS = [ 'wheel', 'touchstart', 'keydown' ];

/**
 * @returns {string} The entry id named by the URL hash, or an empty string.
 */
function getHashId() {
	const hash = window.location.hash;
	if ( ! hash || hash.length < 2 ) return '';
	try {
		return decodeURIComponent( hash.slice( 1 ) );
	} catch ( e ) {
		return hash.slice( 1 );
	}
}

/**
 * @param {Element} container Liveblog container element.
 * @param {string}  id        Entry id.
 * @returns {Element|null}
 */
function findEntry( container, id ) {
	return container.querySelector(
		`[data-update-id="${ escapeSelectorAttr( id ) }"]`
	);
}

/**
 * Scroll an entry into view and move focus to it for keyboard and screen reader users.
 *
 * @param {Element} entry Entry element.
 */
function revealEntry( entry ) {
	if ( ! entry.hasAttribute( 'tabindex' ) ) {
		entry.setAttribute( 'tabindex', '-1' );
	}
	entry.scrollIntoView( { block: 'start' } );
	entry.focus( { preventScroll: true } );
}

/**
 * Find the entry named by the URL hash, loading older pages when needed.
 * Stops at MAX_DEEP_LINK_PAGES pages, when no older entries remain, or when
 * a page fails to load. If the entry is never found, the page does not move.
 *
 * @param {Element} container Liveblog container element.
 * @returns {Promise<void>}
 */
export async function revealHashEntry( container ) {
	// Count every call, even one that returns early, so an empty hash cancels
	// a search that is still loading pages.
	const run = ++activeRun;
	const id = getHashId();
	const state = container._liveblogState;
	if ( ! id || ! state || ! state.initialized ) return;

	let entry = findEntry( container, id );
	// A hash that names some other element on the page is not an entry link.
	if ( ! entry && document.getElementById( id ) ) return;

	// A reader who scrolls, touches or types during the search keeps control.
	const cancel = () => {
		if ( run === activeRun ) activeRun++;
	};
	CANCEL_EVENTS.forEach( ( type ) =>
		window.addEventListener( type, cancel, { passive: true } )
	);
	try {
		let pages = 0;
		while ( ! entry && pages < MAX_DEEP_LINK_PAGES ) {
			if ( ! state.hasMore && ! state.loadingPromise ) break;
			const loaded = await loadMoreEntries( container );
			if ( run !== activeRun ) return;
			if ( ! loaded ) break;
			pages++;
			entry = findEntry( container, id );
		}
		if ( run === activeRun && entry ) revealEntry( entry );
	} finally {
		CANCEL_EVENTS.forEach( ( type ) =>
			window.removeEventListener( type, cancel )
		);
	}
}
