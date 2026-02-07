/**
 * Pure helpers for liveblog frontend (time, escape, scroll, visibility).
 * DOM updates follow VIP JS: avoid innerHTML; use DOM APIs or DOMPurify for HTML.
 */

import DOMPurify from 'dompurify';
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
 * Parse HTML into a single element. Sanitizes to prevent XSS (VIP JS: use DOMPurify for HTML strings).
 * Prefers native Sanitizer API when available; otherwise uses DOMPurify. No raw innerHTML on untrusted data.
 *
 * @param {string} html - HTML string (e.g. server-rendered block content).
 * @returns {Element|null} First top-level element, or null.
 */
export function safeParseHtml( html ) {
	const str = typeof html === 'string' ? html.trim() : '';
	if ( ! str ) return null;
	if (
		typeof Sanitizer !== 'undefined' &&
		typeof Sanitizer.prototype.sanitizeFor === 'function'
	) {
		const sanitizer = new Sanitizer();
		const wrapper = sanitizer.sanitizeFor( 'div', str );
		return wrapper?.firstElementChild ?? null;
	}
	const fragment = DOMPurify.sanitize( str, { RETURN_DOM_FRAGMENT: true } );
	return fragment?.firstElementChild ?? null;
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
