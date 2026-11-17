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

// True when the reader scrolled, touched or typed before the first reveal ran.
let readerTookOver = false;
// Removes the listeners that set readerTookOver.
let stopEarlyWatch = null;

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

// The forms an entry id can take: crypto.randomUUID(), the editor's fallback
// "lb-<time>-<random>", and the server's "update-<timestamp>".
const ENTRY_ID_PATTERN =
	/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|lb-[0-9a-z]+-[0-9a-z]+|update-\d+)$/;

/**
 * Entry ids in the server-rendered markup. Read these before the first sync
 * replaces the container's children.
 *
 * @param {Element} container Liveblog container element.
 * @returns {Set<string>}
 */
export function collectEntryIds( container ) {
	const ids = new Set();
	container.querySelectorAll( '[data-update-id]' ).forEach( ( el ) => {
		const id = el.getAttribute( 'data-update-id' );
		if ( id ) ids.add( id );
	} );
	return ids;
}

/**
 * Whether the hash id names a live blog entry. True when the page was built
 * with that entry, or when the id has the form of an entry id. Any other hash,
 * such as a heading anchor or one added by another script, is not an entry link.
 *
 * @param {Object} state Liveblog container state.
 * @param {string} id    Hash id.
 * @returns {boolean}
 */
function isEntryLink( state, id ) {
	if ( state.serverEntryIds && state.serverEntryIds.has( id ) ) return true;
	return ENTRY_ID_PATTERN.test( id );
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
	// The theme scrolls smoothly; jump instead for readers who ask for less motion.
	const reduceMotion =
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	entry.scrollIntoView( {
		block: 'start',
		behavior: reduceMotion ? 'instant' : 'auto',
	} );
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
	if ( stopEarlyWatch ) {
		stopEarlyWatch();
		stopEarlyWatch = null;
	}
	// The reader moved before the first reveal, so leave the page where they put it.
	if ( readerTookOver ) return;

	let entry = findEntry( container, id );
	if ( ! entry ) {
		// A hash that is not an entry link, or that names some other element
		// on the page, loads nothing.
		if ( ! isEntryLink( state, id ) || document.getElementById( id ) ) return;
	}

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

/**
 * Before the first sync, note reader input so the first reveal does not pull a
 * reader who has already scrolled, touched or typed. Call once at start-up.
 */
export function watchEarlyInput() {
	if ( ! getHashId() ) return;
	const mark = () => {
		readerTookOver = true;
	};
	CANCEL_EVENTS.forEach( ( type ) =>
		window.addEventListener( type, mark, { passive: true } )
	);
	stopEarlyWatch = () =>
		CANCEL_EVENTS.forEach( ( type ) =>
			window.removeEventListener( type, mark )
		);
}

/**
 * A hash change is a new request from the reader, so earlier input no longer
 * counts against it.
 *
 * @param {Element} container Liveblog container element.
 */
export function onHashChange( container ) {
	if ( stopEarlyWatch ) {
		stopEarlyWatch();
		stopEarlyWatch = null;
	}
	readerTookOver = false;
	revealHashEntry( container );
}
