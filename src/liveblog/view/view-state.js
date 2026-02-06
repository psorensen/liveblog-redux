/**
 * Shared frontend state: unread count, document title, and global queued count.
 */

let unreadNewCount = 0;
let originalTitle = '';

export function getOriginalTitle() {
	if ( originalTitle ) return originalTitle;
	const t = typeof document !== 'undefined' ? document.title : '';
	originalTitle = t.replace( /^\(\d+\s*(?:new\s*)?\)\s*/i, '' ).trim() || t;
	return originalTitle;
}

export function updateTabTitle( newCount ) {
	if ( typeof document === 'undefined' ) return;
	const base = getOriginalTitle();
	document.title = newCount > 0 ? `(${ newCount }) ${ base }` : base;
}

export function getUnreadCount() {
	return unreadNewCount;
}

export function setUnreadCount( n ) {
	unreadNewCount = n;
	updateTabTitle( unreadNewCount );
}

export function incrementUnreadCount() {
	unreadNewCount += 1;
	updateTabTitle( unreadNewCount );
}

/**
 * Total number of queued new updates across all liveblog containers.
 */
export function getGlobalQueuedNewCount() {
	let count = 0;
	document.querySelectorAll( '.liveblog-container' ).forEach( ( c ) => {
		const s = c._liveblogState;
		if ( s && s.queuedNew ) count += s.queuedNew.length;
	} );
	return count;
}
