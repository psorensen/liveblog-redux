/**
 * Notification banner and tab title for queued new updates when user is scrolled down.
 */

import { BANNER_AUTO_DISMISS_MS } from './constants.js';
import { buildNewEntryElement, insertNewEntry } from './entry-dom.js';
import {
	getGlobalQueuedNewCount,
	getUnreadCount,
	setUnreadCount,
	updateTabTitle,
} from './view-state.js';

let notificationBanner = null;
let bannerDismissTimer = null;

/**
 * @returns {{ el: HTMLElement, show: (n: number) => void, hide: () => void }}
 */
export function createNotificationBanner() {
	if ( notificationBanner ) return notificationBanner;
	const wrap = document.createElement( 'div' );
	wrap.className = 'liveblog-notification';
	wrap.setAttribute( 'aria-live', 'polite' );
	wrap.setAttribute( 'role', 'status' );
	const textEl = document.createElement( 'span' );
	textEl.className = 'liveblog-notification__text';
	const showBtn = document.createElement( 'button' );
	showBtn.type = 'button';
	showBtn.className = 'liveblog-notification__show-btn';
	showBtn.textContent = 'Show Updates';
	const dismissBtn = document.createElement( 'button' );
	dismissBtn.type = 'button';
	dismissBtn.className = 'liveblog-notification__dismiss-btn';
	dismissBtn.setAttribute( 'aria-label', 'Dismiss' );
	dismissBtn.textContent = '×';
	wrap.appendChild( textEl );
	wrap.appendChild( document.createTextNode( ' ' ) );
	wrap.appendChild( showBtn );
	wrap.appendChild( document.createTextNode( ' ' ) );
	wrap.appendChild( dismissBtn );

	const hide = () => {
		wrap.classList.remove( 'liveblog-notification--visible' );
		if ( bannerDismissTimer ) {
			clearTimeout( bannerDismissTimer );
			bannerDismissTimer = null;
		}
	};

	const show = ( newCount ) => {
		textEl.textContent =
			newCount === 1
				? '1 new update available'
				: `${ newCount } new updates available`;
		wrap.classList.add( 'liveblog-notification--visible' );
		if ( bannerDismissTimer ) clearTimeout( bannerDismissTimer );
		bannerDismissTimer = setTimeout( hide, BANNER_AUTO_DISMISS_MS );
	};

	showBtn.addEventListener( 'click', () => {
		window.scrollTo( { top: 0, behavior: 'smooth' } );
		document
			.querySelectorAll( '.liveblog-container' )
			.forEach( ( container ) => {
				const state = container._liveblogState;
				if (
					! state ||
					! state.queuedNew ||
					state.queuedNew.length === 0
				)
					return;
				state.queuedNew.forEach( ( update ) => {
					const el = buildNewEntryElement( update );
					if ( el ) insertNewEntry( container, el );
				} );
				state.queuedNew = [];
			} );
		setUnreadCount( 0 );
		hide();
	} );

	dismissBtn.addEventListener( 'click', hide );

	document.body.appendChild( wrap );
	notificationBanner = { el: wrap, show, hide };
	return notificationBanner;
}

export function updateBanner() {
	const queuedCount = getGlobalQueuedNewCount();
	updateTabTitle( getUnreadCount() );
	if ( queuedCount === 0 ) {
		if ( notificationBanner ) notificationBanner.hide();
		return;
	}
	createNotificationBanner();
	notificationBanner.show( queuedCount );
}
