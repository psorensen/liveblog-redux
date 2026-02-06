/**
 * Frontend polling for liveblog updates. Runs on the container block.
 * Polls the REST API and inserts new entries at the top, updates modified entries.
 * Non-disruptive: queues new entries when user is scrolled down; shows notification banner.
 * Edited entries always apply immediately.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

import { getConfig } from './view/constants.js';
import { getOriginalTitle, setUnreadCount } from './view/view-state.js';
import { poll, scheduleNext } from './view/polling.js';

function start(container) {
	const config = getConfig();
	if (!config.postId || !config.restUrl) {
		return;
	}
	container.setAttribute('data-post-id', config.postId);
	container.setAttribute('data-rest-url', config.restUrl);
	poll(container, config);
}

function onVisibilityChange() {
	if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
		setUnreadCount(0);
	}
	document.querySelectorAll('.liveblog-container').forEach((container) => {
		if (!container._liveblogState) {
			return;
		}
		const state = container._liveblogState;
		if (!state || !state.timerId) {
			return;
		}
		clearTimeout(state.timerId);
		state.timerId = null;
		const config = getConfig();
		scheduleNext(container, config);
	});
}

function init() {
	getOriginalTitle();
	const containers = document.querySelectorAll('.liveblog-container');
	let started = false;
	containers.forEach((container) => {
		const config = getConfig();
		if (config.postId && config.restUrl) {
			start(container);
			started = true;
		}
	});
	if (typeof document.hidden !== 'undefined') {
		document.addEventListener('visibilitychange', onVisibilityChange);
	}
	if (!started && containers.length > 0) {
		requestAnimationFrame(() => {
			containers.forEach((container) => {
				const config = getConfig();
				if (config.postId && config.restUrl) {
					start(container);
				}
			});
		});
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
