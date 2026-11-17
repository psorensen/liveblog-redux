/**
 * "Load more" button: fetches older entries and appends them above the button.
 */

import { getConfig, LOAD_MORE_PAGE_SIZE } from './constants.js';
import { buildNewEntryElement } from './entry-dom.js';
import { triggerOembedLoad } from './utils.js';

/**
 * Fetch the next page of older entries and insert it above the Load more button.
 * The button click and deep links share this. A call made while a page is
 * already loading returns that load instead of starting another.
 *
 * @param {Element} container Liveblog container element.
 * @returns {Promise<boolean>} Resolves true when entries were added, false otherwise.
 */
export function loadMoreEntries( container ) {
	const state = container._liveblogState;
	const cfg = getConfig();
	if ( ! state || ! cfg.restUrl ) return Promise.resolve( false );
	if ( state.loadingPromise ) return state.loadingPromise;
	if ( ! state.hasMore ) return Promise.resolve( false );

	const btn = container.querySelector( '.liveblog-load-more' );
	if ( btn ) {
		btn.disabled = true;
		btn.textContent = 'Loading…';
	}
	const url = `${ cfg.restUrl }?before=${
		state.oldestTimestamp
	}&per_page=${ LOAD_MORE_PAGE_SIZE }&_=${ Date.now() }`;

	state.loadingPromise = fetch( url )
		.then( ( res ) => {
			if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
			return res.json();
		} )
		.then( ( data ) => {
			if ( ! data.updates || data.updates.length === 0 ) {
				state.hasMore = false;
				if ( btn ) btn.remove();
				return false;
			}
			let minTs = state.oldestTimestamp;
			const fragment = document.createDocumentFragment();
			data.updates.forEach( ( update ) => {
				const el = buildNewEntryElement( update );
				if ( el ) {
					fragment.appendChild( el );
					const ts = update.timestamp || 0;
					if ( ts > 0 && ! update.is_pinned && ( minTs === 0 || ts < minTs ) )
						minTs = ts;
				}
			} );
			if ( btn && btn.parentNode === container ) {
				container.insertBefore( fragment, btn );
			} else {
				container.appendChild( fragment );
			}
			triggerOembedLoad( container );
			state.oldestTimestamp = minTs > 0 ? minTs : state.oldestTimestamp;
			state.hasMore = !! data.has_more;
			if ( ! state.hasMore && btn ) btn.remove();
			return true;
		} )
		.catch( () => {
			state.hasMore = true;
			return false;
		} )
		.finally( () => {
			state.loadingPromise = null;
			if ( btn && btn.parentNode ) {
				btn.textContent = 'Load more';
				btn.disabled = false;
			}
		} );
	return state.loadingPromise;
}

/**
 * @param {Element} container Liveblog container element.
 * @returns {HTMLButtonElement}
 */
export function getOrCreateLoadMoreButton( container ) {
	let btn = container.querySelector( '.liveblog-load-more' );
	if ( btn ) return btn;
	btn = document.createElement( 'button' );
	btn.type = 'button';
	btn.className = 'liveblog-load-more';
	btn.textContent = 'Load more';
	btn.addEventListener( 'click', () => {
		loadMoreEntries( container );
	} );
	return btn;
}
