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

export function escapeHtml( text ) {
	if ( ! text ) return '';
	const div = document.createElement( 'div' );
	div.textContent = text;
	return div.innerHTML;
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
