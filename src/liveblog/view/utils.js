/**
 * Pure helpers for liveblog frontend (time, escape, scroll, visibility).
 */

import { SCROLL_TOP_THRESHOLD } from './constants.js';

export function formatTimestamp( ts ) {
	if ( ! ts ) return '';
	const d = new Date( ts * 1000 );
	return d.toLocaleTimeString( undefined, {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	} );
}

/**
 * Escape for safe use in HTML content. Uses character replacement only (no innerHTML).
 */
export function escapeHtml( text ) {
	if ( ! text ) return '';
	const s = String( text );
	return s
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#039;' );
}

/**
 * Escape a value for safe use inside a CSS attribute selector [data-attr="VALUE"].
 * Prefer CSS.escape when available; otherwise escape backslash and double-quote.
 */
export function escapeSelectorAttr( value ) {
	const str = String( value );
	if ( typeof CSS !== 'undefined' && CSS.escape ) {
		return CSS.escape( str );
	}
	return str.replace( /\\/g, '\\\\' ).replace( /"/g, '\\22' );
}

/**
 * Parse HTML into a single element. Content is from the trusted REST API.
 *
 * @param {string} html - HTML string (e.g. server-rendered block content).
 * @returns {Element|null} First top-level element, or null.
 */
export function safeParseHtml( html ) {
	const str = typeof html === 'string' ? html.trim() : '';
	if ( ! str ) return null;
	const wrap = document.createElement( 'div' );
	wrap.innerHTML = str;
	return wrap.firstElementChild ?? null;
}

export function isAtTop() {
	return (
		typeof window !== 'undefined' && window.scrollY < SCROLL_TOP_THRESHOLD
	);
}

export function isTabVisible() {
	return (
		typeof document !== 'undefined' &&
		typeof document.visibilityState !== 'undefined' &&
		document.visibilityState === 'visible'
	);
}

/**
 * Initialize oEmbed widgets (Twitter, Instagram, Facebook) inside an element
 * after its HTML has been written to the DOM. Call after inserting or
 * updating entry content so SDKs can parse placeholder markup.
 *
 * @param {Element} element - Container element (e.g. entry node or liveblog container).
 */
export function triggerOembedLoad( element ) {
	if ( ! element || typeof element.querySelector !== 'function' ) return;

	if ( window.instgrm && element.querySelector( '.instagram-media' ) ) {
		window.instgrm.Embeds.process();
	}

	if ( window.twttr && element.querySelector( '.twitter-tweet' ) ) {
		element.querySelectorAll( '.twitter-tweet' ).forEach( ( el ) => {
			window.twttr.widgets.load( el );
		} );
	}

	if ( window.FB ) {
		window.FB.XFBML.parse( element );
	}

	if ( typeof window.dispatchEvent === 'function' ) {
		window.dispatchEvent( new CustomEvent( 'omembedTrigger' ) );
	}
}
