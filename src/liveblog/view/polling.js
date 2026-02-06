/**
 * REST polling: fetch updates, process new/modified, schedule next poll.
 */

import {
	getConfig,
	DEFAULT_INTERVAL,
	INACTIVE_INTERVAL,
	MIN_BACKOFF,
	MAX_BACKOFF,
	INITIAL_PAGE_SIZE,
} from './constants.js';
import { isAtTop, isTabVisible } from './utils.js';
import { escapeSelectorAttr } from './utils.js';
import { buildNewEntryElement, applyUpdateToEntry, insertNewEntry } from './entry-dom.js';
import { getOrCreateLoadMoreButton } from './load-more.js';
import { updateBanner } from './notification-banner.js';
import { setUnreadCount, incrementUnreadCount } from './view-state.js';

/**
 * @param {Element} container Liveblog container element.
 * @param {Object[]} updates API update objects.
 */
function processUpdates(container, updates) {
	const state = container._liveblogState;
	if (!state.queuedNew) state.queuedNew = [];

	updates.forEach((update) => {
		const id = update.id;
		if (update.change_type === 'modified' && id) {
			applyUpdateToEntry(container, update);
			return;
		}
		if (update.change_type === 'new') {
			if (id && container.querySelector(`[data-update-id="${escapeSelectorAttr(id)}"]`))
				return;
			if (isAtTop()) {
				const el = buildNewEntryElement(update);
				if (el) insertNewEntry(container, el);
				if (isTabVisible()) {
					setUnreadCount(0);
				} else {
					incrementUnreadCount();
				}
			} else {
				state.queuedNew.push(update);
				incrementUnreadCount();
				updateBanner();
			}
		}
	});
}

/**
 * @param {Element} container Liveblog container element.
 * @param {{ postId: number, restUrl: string, interval: number }} config
 */
export function poll(container, config) {
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
	const url = `${config.restUrl}?since=${state.lastModified}&per_page=${perPage}&_=${Date.now()}`;

	const wasInitialSync = state.lastModified === 0;
	fetch(url)
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		})
		.then((data) => {
			state.backoff = 0;
			// Always advance lastModified from response so next poll uses updated since (never reuse stale since).
			if (typeof data.last_modified === 'number' && data.last_modified >= 0) {
				state.lastModified = Math.max(state.lastModified, data.last_modified);
			}
			// Initial sync: when since=0 and we have updates, replace container.
			if (wasInitialSync && data.updates && data.updates.length > 0) {
				state.initialized = true;
				let minTs = 0;
				const fragment = document.createDocumentFragment();
				data.updates.forEach((update) => {
					const el = buildNewEntryElement(update);
					if (el) {
						fragment.appendChild(el);
						const ts = update.timestamp || 0;
						if (ts > 0 && (minTs === 0 || ts < minTs)) minTs = ts;
					}
				});
				container.innerHTML = '';
				container.appendChild(fragment);
				state.oldestTimestamp = minTs;
				state.hasMore = !!data.has_more;
				if (state.hasMore) {
					container.appendChild(getOrCreateLoadMoreButton(container));
				}
			} else if (wasInitialSync && data.updates && data.updates.length === 0) {
				state.initialized = true;
			} else if (!wasInitialSync && data.updates && data.updates.length > 0) {
				processUpdates(container, data.updates);
			}
		})
		.catch(() => {
			state.backoff = Math.min(
				state.backoff ? Math.min(state.backoff * 2, MAX_BACKOFF) : MIN_BACKOFF,
				MAX_BACKOFF
			);
		})
		.finally(() => scheduleNext(container, config));
}

function getInterval(container, config) {
	const state = container._liveblogState;
	if (state && state.backoff) return state.backoff;
	if (typeof document.hidden !== 'undefined' && document.hidden) return INACTIVE_INTERVAL;
	return config.interval ?? DEFAULT_INTERVAL;
}

/**
 * @param {Element} container Liveblog container element.
 * @param {{ postId: number, restUrl: string, interval: number }} config
 */
export function scheduleNext(container, config) {
	const state = container._liveblogState;
	if (state && state.timerId) {
		clearTimeout(state.timerId);
		state.timerId = null;
	}
	const delay = getInterval(container, config);
	state.timerId = setTimeout(() => {
		state.timerId = null;
		poll(container, config);
	}, delay);
}
