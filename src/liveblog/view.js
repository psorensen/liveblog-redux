/**
 * Frontend polling for liveblog updates. Runs on the container block.
 * Polls the REST API and inserts new entries at the top, updates modified entries.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

( function () {
	const DEFAULT_INTERVAL = 5000;
	const INACTIVE_INTERVAL = 10000;
	const MIN_BACKOFF = 5000;
	const MAX_BACKOFF = 20000;

	function getPostIdFromBody() {
		if ( ! document.body || ! document.body.className ) {
			return null;
		}
		const m = document.body.className.match( /\b(?:page-id-|postid-)(\d+)\b/ );
		return m ? m[1] : null;
	}

	function getRestUrlFromPage() {
		if ( typeof window.wpApiSettings !== 'undefined' && window.wpApiSettings.root ) {
			return window.wpApiSettings.root.replace( /\/$/, '' );
		}
		const origin = window.location.origin || '';
		return origin + '/wp-json';
	}

	function getConfig( container ) {
		let postId = container.getAttribute( 'data-post-id' );
		let restUrl = ( container.getAttribute( 'data-rest-url' ) || '' ).replace( /\/$/, '' );
		if ( ! postId || postId === '0' ) {
			postId = getPostIdFromBody();
		}
		if ( ! restUrl ) {
			restUrl = getRestUrlFromPage();
		}
		return { postId, restUrl, DEFAULT_INTERVAL };
	}

	function formatTimestamp( ts ) {
		if ( ! ts ) return '';
		const d = new Date( ts * 1000 );
		return d.toLocaleTimeString( undefined, { hour: 'numeric', minute: '2-digit', hour12: true } );
	}

	function escapeHtml( text ) {
		if ( ! text ) return '';
		const div = document.createElement( 'div' );
		div.textContent = text;
		return div.innerHTML;
	}

	function applyUpdates( container, updates ) {
		updates.forEach( function ( update ) {
			const content = typeof update.content === 'string' ? update.content : '';
			const id = update.id;
			if ( update.change_type === 'modified' && id ) {
				if ( ! content.trim() ) return;
				const existing = container.querySelector(
					'[data-update-id="' + escapeSelectorAttr( id ) + '"]'
				);
				if ( existing && existing.parentNode ) {
					const wrap = document.createElement( 'div' );
					wrap.innerHTML = content.trim();
					const newEl = wrap.firstElementChild;
					if ( newEl ) {
						existing.parentNode.replaceChild( newEl, existing );
					}
				}
				return;
			}
			if ( update.change_type === 'new' ) {
				if ( id && container.querySelector( '[data-update-id="' + escapeSelectorAttr( id ) + '"]' ) ) {
					return;
				}
				let el = null;
				if ( content && content.trim() ) {
					const wrap = document.createElement( 'div' );
					wrap.innerHTML = content.trim();
					el = wrap.firstElementChild;
				}
				if ( ! el && id ) {
					el = document.createElement( 'div' );
					el.className = 'liveblog-entry';
					el.setAttribute( 'data-update-id', id );
					if ( update.timestamp ) el.setAttribute( 'data-timestamp', update.timestamp );
					var hasAuthor = update.author || ( update.coauthors && update.coauthors.length > 0 );
					if ( hasAuthor ) {
						var header = document.createElement( 'div' );
						header.className = 'liveblog-entry__header';
						var timeHtml = '<time class="liveblog-entry__time">' + formatTimestamp( update.timestamp ) + '</time> ';
						var authorsHtml = '';
						if ( update.coauthors && update.coauthors.length > 0 ) {
							var avatars = update.coauthors.map( function ( c ) {
								return c.avatar_url
									? '<img src="' + escapeHtml( c.avatar_url ) + '" alt="" width="24" height="24" />'
									: '';
							} ).filter( Boolean );
							var names = update.coauthors.map( function ( c ) {
								return escapeHtml( c.display_name || '' );
							} ).join( ', ' );
							authorsHtml = ( avatars.length ? '<span class="liveblog-entry__author-avatars">' + avatars.join( '' ) + '</span> ' : '' ) + '<span class="liveblog-entry__author-names">' + names + '</span>';
						} else {
							authorsHtml = escapeHtml( update.author );
						}
						header.innerHTML = timeHtml + '<span class="liveblog-entry__authors">' + authorsHtml + '</span>';
						el.appendChild( header );
					}
					var body = document.createElement( 'div' );
					body.className = 'liveblog-entry__content';
					body.innerHTML = '<p></p>';
					el.appendChild( body );
				}
				if ( el ) {
					container.insertBefore( el, container.firstChild );
				}
			}
		} );
	}

	function escapeSelectorAttr( value ) {
		return String( value )
			.replace( /\\/g, '\\\\' )
			.replace( /"/g, '\\22' );
	}

	function poll( container, config ) {
		const state = container._liveblogState || {
			lastModified: 0,
			nextPoll: 0,
			backoff: 0,
			timerId: null,
		};
		container._liveblogState = state;

		const url =
			config.restUrl +
			'/liveblog/v1/posts/' +
			encodeURIComponent( config.postId ) +
			'/updates?since=' +
			state.lastModified +
			'&per_page=50&_=' +
			Date.now();


		const wasInitialSync = state.lastModified === 0;
		fetch( url )
			.then( function ( res ) {
				if ( ! res.ok ) {
					throw new Error( 'HTTP ' + res.status );
				}
				return res.json();
			} )
			.then( function ( data ) {
				state.backoff = 0;
				if ( data.last_modified ) {
					state.lastModified = data.last_modified;
				}
				if ( ! wasInitialSync && data.updates && data.updates.length > 0 ) {
					applyUpdates( container, data.updates );
				}
			} )
			.catch( function () {
				state.backoff = Math.min(
					state.backoff ? Math.min( state.backoff * 2, MAX_BACKOFF ) : MIN_BACKOFF,
					MAX_BACKOFF
				);
			} )
			.finally( function () {
				scheduleNext( container, config );
			} );
	}

	function getInterval( container, config ) {
		const state = container._liveblogState;
		if ( state && state.backoff ) {
			return state.backoff;
		}
		if ( typeof document.hidden !== 'undefined' && document.hidden ) {
			return INACTIVE_INTERVAL;
		}
		return config.interval;
	}

	function scheduleNext( container, config ) {
		const state = container._liveblogState;
		if ( state && state.timerId ) {
			clearTimeout( state.timerId );
			state.timerId = null;
		}
		const delay = getInterval( container, config );
		state.timerId = setTimeout( function () {
			state.timerId = null;
			poll( container, config );
		}, delay );
	}

	function start( container ) {
		const config = getConfig( container );
		if ( ! config.postId || ! config.restUrl ) {
			return;
		}
		container.setAttribute( 'data-post-id', config.postId );
		container.setAttribute( 'data-rest-url', config.restUrl );
		poll( container, config );
	}

	function onVisibilityChange() {
		document.querySelectorAll( '.liveblog-container' ).forEach( function ( container ) {
			if ( ! container._liveblogState ) {
				return;
			}
			const state = container._liveblogState;
			if ( ! state || ! state.timerId ) {
				return;
			}
			clearTimeout( state.timerId );
			state.timerId = null;
			const config = getConfig( container );
			scheduleNext( container, config );
		} );
	}

	function init() {
		const containers = document.querySelectorAll( '.liveblog-container' );
		containers.forEach( function ( container ) {
			const config = getConfig( container );
			if ( config.postId && config.restUrl ) {
				start( container );
			}
		} );
		if ( typeof document.hidden !== 'undefined' ) {
			document.addEventListener( 'visibilitychange', onVisibilityChange );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
