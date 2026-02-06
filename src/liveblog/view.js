/**
 * Frontend polling for liveblog updates. Runs on the container block.
 * Polls the REST API and inserts new entries at the top, updates modified entries.
 * Non-disruptive: queues new entries when user is scrolled down; shows notification banner. Edited entries always apply immediately.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

( () => {
	const DEFAULT_INTERVAL = 10000;
	const INACTIVE_INTERVAL = 10000;
	const MIN_BACKOFF = 5000;
	const MAX_BACKOFF = 20000;
	const SCROLL_TOP_THRESHOLD = 200;
	const BANNER_AUTO_DISMISS_MS = 30000;
	const ENTRY_ENTER_ANIMATION_MS = 300;
	const INITIAL_PAGE_SIZE = 5;
	const LOAD_MORE_PAGE_SIZE = 5;

	const getConfig = () => {
		const { postId, restUrl, interval } = liveblogData || {};
		return {
			postId: postId || 0,
			restUrl: restUrl || '',
			interval: typeof interval === 'number' && interval > 0 ? interval : DEFAULT_INTERVAL,
		};
	};

	const formatTimestamp = ( ts ) => {
		if ( ! ts ) return '';
		const d = new Date( ts * 1000 );
		return d.toLocaleTimeString( undefined, { hour: 'numeric', minute: '2-digit', hour12: true } );
	};

	const escapeHtml = ( text ) => {
		if ( ! text ) return '';
		const div = document.createElement( 'div' );
		div.textContent = text;
		return div.innerHTML;
	};

	const escapeSelectorAttr = ( value ) =>
		String( value )
			.replace( /\\/g, '\\\\' )
			.replace( /"/g, '\\22' );

	const isAtTop = () => typeof window !== 'undefined' && window.scrollY < SCROLL_TOP_THRESHOLD;

	const isTabVisible = () =>
		typeof document !== 'undefined' && typeof document.visibilityState !== 'undefined' && document.visibilityState === 'visible';

	const buildNewEntryElement = ( update ) => {
		const content = typeof update.content === 'string' ? update.content : '';
		const id = update.id;
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
			const hasAuthor = update.author || ( update.coauthors && update.coauthors.length > 0 );
			if ( hasAuthor ) {
				const header = document.createElement( 'div' );
				header.className = 'liveblog-entry__header';
				const timeHtml = `<time class="liveblog-entry__time">${ formatTimestamp( update.timestamp ) }</time> `;
				let authorsHtml = '';
				if ( update.coauthors && update.coauthors.length > 0 ) {
					const avatars = update.coauthors.map( ( c ) =>
						c.avatar_url
							? `<img src="${ escapeHtml( c.avatar_url ) }" alt="" width="24" height="24" />`
							: ''
					).filter( Boolean );
					const names = update.coauthors.map( ( c ) => escapeHtml( c.display_name || '' ) ).join( ', ' );
					authorsHtml = `${ avatars.length ? `<span class="liveblog-entry__author-avatars">${ avatars.join( '' ) }</span> ` : '' }<span class="liveblog-entry__author-names">${ names }</span>`;
				} else {
					authorsHtml = escapeHtml( update.author );
				}
				header.innerHTML = `${ timeHtml }<span class="liveblog-entry__authors">${ authorsHtml }</span>`;
				el.appendChild( header );
			}
			const body = document.createElement( 'div' );
			body.className = 'liveblog-entry__content';
			body.innerHTML = '<p></p>';
			el.appendChild( body );
		}
		return el;
	};

	const applyUpdateToEntry = ( container, update ) => {
		const content = typeof update.content === 'string' ? update.content : '';
		const id = update.id;
		if ( ! id || ! content.trim() ) return;
		const existing = container.querySelector( `[data-update-id="${ escapeSelectorAttr( id ) }"]` );
		if ( ! existing || ! existing.parentNode ) return;
		const wrap = document.createElement( 'div' );
		wrap.innerHTML = content.trim();
		const newEl = wrap.firstElementChild;
		if ( newEl ) {
			existing.parentNode.replaceChild( newEl, existing );
		}
	};

	const insertNewEntry = ( container, el ) => {
		if ( ! el ) return;
		el.classList.add( 'liveblog-entry--enter' );
		const loadMoreBtn = container.querySelector( '.liveblog-load-more' );
		const insertBefore = loadMoreBtn || container.firstChild;
		container.insertBefore( el, insertBefore );
		setTimeout( () => el.classList.remove( 'liveblog-entry--enter' ), ENTRY_ENTER_ANIMATION_MS );
	};

	const getOrCreateLoadMoreButton = ( container ) => {
		let btn = container.querySelector( '.liveblog-load-more' );
		if ( btn ) return btn;
		btn = document.createElement( 'button' );
		btn.type = 'button';
		btn.className = 'liveblog-load-more';
		btn.textContent = 'Load more';
		const state = container._liveblogState;
		btn.addEventListener( 'click', () => {
			if ( state.loadingMore || ! state.hasMore ) return;
			const cfg = getConfig( container );
			if ( ! cfg.restUrl ) return;
			state.loadingMore = true;
			btn.disabled = true;
			btn.textContent = 'Loading…';
			const url = `${ cfg.restUrl }?before=${ state.oldestTimestamp }&per_page=${ LOAD_MORE_PAGE_SIZE }&_=${ Date.now() }`;
			fetch( url )
				.then( ( res ) => {
					if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
					return res.json();
				} )
				.then( ( data ) => {
					if ( ! data.updates || data.updates.length === 0 ) {
						state.hasMore = false;
						btn.remove();
						return;
					}
					let minTs = state.oldestTimestamp;
					const fragment = document.createDocumentFragment();
					data.updates.forEach( ( update ) => {
						const el = buildNewEntryElement( update );
						if ( el ) {
							fragment.appendChild( el );
							const ts = update.timestamp || 0;
							if ( ts > 0 && ( minTs === 0 || ts < minTs ) ) minTs = ts;
						}
					} );
					container.insertBefore( fragment, btn );
					state.oldestTimestamp = minTs > 0 ? minTs : state.oldestTimestamp;
					state.hasMore = !! data.has_more;
					if ( ! state.hasMore ) btn.remove();
				} )
				.catch( () => {
					state.hasMore = true;
					btn.textContent = 'Load more';
					btn.disabled = false;
				} )
				.finally( () => {
					state.loadingMore = false;
					if ( btn.parentNode ) {
						btn.textContent = 'Load more';
						btn.disabled = false;
					}
				} );
		} );
		return btn;
	};

	const getGlobalQueuedNewCount = () => {
		let count = 0;
		document.querySelectorAll( '.liveblog-container' ).forEach( ( c ) => {
			const s = c._liveblogState;
			if ( s && s.queuedNew ) count += s.queuedNew.length;
		} );
		return count;
	};

	let unreadNewCount = 0;
	let originalTitle = '';

	const getOriginalTitle = () => {
		if ( originalTitle ) return originalTitle;
		const t = typeof document !== 'undefined' ? document.title : '';
		originalTitle = t.replace( /^\(\d+\s*(?:new\s*)?\)\s*/i, '' ).trim() || t;
		return originalTitle;
	};

	const updateTabTitle = ( newCount ) => {
		if ( typeof document === 'undefined' ) return;
		const base = getOriginalTitle();
		document.title = newCount > 0 ? `(${ newCount }) ${ base }` : base;
	};

	let notificationBanner = null;
	let bannerDismissTimer = null;

	const createNotificationBanner = () => {
		if ( notificationBanner ) return notificationBanner;
		const wrap = document.createElement( 'div' );
		wrap.className = 'liveblog-notification';
		wrap.setAttribute( 'aria-live', 'polite' );
		wrap.setAttribute( 'role', 'status' );
		wrap.innerHTML =
			'<span class="liveblog-notification__text"></span> ' +
			'<button type="button" class="liveblog-notification__show-btn">Show Updates</button> ' +
			'<button type="button" class="liveblog-notification__dismiss-btn" aria-label="Dismiss">×</button>';
		const textEl = wrap.querySelector( '.liveblog-notification__text' );
		const showBtn = wrap.querySelector( '.liveblog-notification__show-btn' );
		const dismissBtn = wrap.querySelector( '.liveblog-notification__dismiss-btn' );

		const hide = () => {
			wrap.classList.remove( 'liveblog-notification--visible' );
			if ( bannerDismissTimer ) {
				clearTimeout( bannerDismissTimer );
				bannerDismissTimer = null;
			}
		};

		const show = ( newCount ) => {
			textEl.textContent = newCount === 1 ? '1 new update available' : `${ newCount } new updates available`;
			wrap.classList.add( 'liveblog-notification--visible' );
			if ( bannerDismissTimer ) clearTimeout( bannerDismissTimer );
			bannerDismissTimer = setTimeout( hide, BANNER_AUTO_DISMISS_MS );
		};

		showBtn.addEventListener( 'click', () => {
			window.scrollTo( { top: 0, behavior: 'smooth' } );
			document.querySelectorAll( '.liveblog-container' ).forEach( ( container ) => {
				const state = container._liveblogState;
				if ( ! state || ! state.queuedNew || state.queuedNew.length === 0 ) return;
				state.queuedNew.forEach( ( update ) => {
					const el = buildNewEntryElement( update );
					if ( el ) insertNewEntry( container, el );
				} );
				state.queuedNew = [];
			} );
			unreadNewCount = 0;
			updateTabTitle( 0 );
			hide();
		} );

		dismissBtn.addEventListener( 'click', hide );

		document.body.appendChild( wrap );
		notificationBanner = { el: wrap, show, hide };
		return notificationBanner;
	};

	const updateBanner = () => {
		const queuedCount = getGlobalQueuedNewCount();
		updateTabTitle( unreadNewCount );
		if ( queuedCount === 0 ) {
			if ( notificationBanner ) notificationBanner.hide();
			return;
		}
		createNotificationBanner();
		notificationBanner.show( queuedCount );
	};

	const processUpdates = ( container, updates ) => {
		const state = container._liveblogState;
		if ( ! state.queuedNew ) state.queuedNew = [];

		updates.forEach( ( update ) => {
			const id = update.id;
			if ( update.change_type === 'modified' && id ) {
				applyUpdateToEntry( container, update );
				return;
			}
			if ( update.change_type === 'new' ) {
				if ( id && container.querySelector( `[data-update-id="${ escapeSelectorAttr( id ) }"]` ) ) return;
				if ( isAtTop() ) {
					const el = buildNewEntryElement( update );
					if ( el ) insertNewEntry( container, el );
					if ( isTabVisible() ) {
						unreadNewCount = 0;
					} else {
						unreadNewCount += 1;
					}
					updateTabTitle( unreadNewCount );
				} else {
					state.queuedNew.push( update );
					unreadNewCount += 1;
					updateBanner();
				}
			}
		} );
	};

	const poll = ( container, config ) => {
		const state = container._liveblogState || {
			lastModified: 0,
			backoff: 0,
			timerId: null,
			queuedNew: [],
			oldestTimestamp: 0,
			hasMore: false,
			loadingMore: false,
			initialized: false,
		};
		container._liveblogState = state;

		const perPage = state.lastModified === 0 ? INITIAL_PAGE_SIZE : 50;
		const url = `${ config.restUrl }?since=${ state.lastModified }&per_page=${ perPage }&_=${ Date.now() }`;

		const wasInitialSync = state.lastModified === 0;
		fetch( url )
			.then( ( res ) => {
				if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
				return res.json();
			} )
			.then( ( data ) => {
				state.backoff = 0;
				if ( data.last_modified ) state.lastModified = data.last_modified;
				if ( wasInitialSync && data.updates && ! state.initialized ) {
					state.initialized = true;
					let minTs = 0;
					const fragment = document.createDocumentFragment();
					data.updates.forEach( ( update ) => {
						const el = buildNewEntryElement( update );
						if ( el ) {
							fragment.appendChild( el );
							const ts = update.timestamp || 0;
							if ( ts > 0 && ( minTs === 0 || ts < minTs ) ) minTs = ts;
						}
					} );
					container.innerHTML = '';
					container.appendChild( fragment );
					state.oldestTimestamp = minTs;
					state.hasMore = !! data.has_more;
					if ( state.hasMore ) {
						container.appendChild( getOrCreateLoadMoreButton( container ) );
					}
				} else if ( ! wasInitialSync && data.updates && data.updates.length > 0 ) {
					processUpdates( container, data.updates );
				}
			} )
			.catch( () => {
				state.backoff = Math.min(
					state.backoff ? Math.min( state.backoff * 2, MAX_BACKOFF ) : MIN_BACKOFF,
					MAX_BACKOFF
				);
			} )
			.finally( () => scheduleNext( container, config ) );
	};

	const getInterval = ( container, config ) => {
		const state = container._liveblogState;
		if ( state && state.backoff ) return state.backoff;
		if ( typeof document.hidden !== 'undefined' && document.hidden ) return INACTIVE_INTERVAL;
		return config.interval ?? DEFAULT_INTERVAL;
	};

	const scheduleNext = ( container, config ) => {
		const state = container._liveblogState;
		if ( state && state.timerId ) {
			clearTimeout( state.timerId );
			state.timerId = null;
		}
		const delay = getInterval( container, config );
		state.timerId = setTimeout( () => {
			state.timerId = null;
			poll( container, config );
		}, delay );
	};

	const start = ( container ) => {
		const config = getConfig( container );
		if ( ! config.postId || ! config.restUrl ) {
			return;
		}
		container.setAttribute( 'data-post-id', config.postId );
		container.setAttribute( 'data-rest-url', config.restUrl );
		poll( container, config );
	};

	const onVisibilityChange = () => {
		if ( isTabVisible() ) {
			unreadNewCount = 0;
			updateTabTitle( 0 );
		}
		document.querySelectorAll( '.liveblog-container' ).forEach( ( container ) => {
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
	};

	const init = () => {
		getOriginalTitle();
		const containers = document.querySelectorAll( '.liveblog-container' );
		containers.forEach( ( container ) => {
			const config = getConfig( container );
			if ( config.postId && config.restUrl ) {
				start( container );
			}
		} );
		if ( typeof document.hidden !== 'undefined' ) {
			document.addEventListener( 'visibilitychange', onVisibilityChange );
		}
	};

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
