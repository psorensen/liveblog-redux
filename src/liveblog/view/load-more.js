/**
 * "Load more" button: fetches older entries and appends them above the button.
 */

import { getConfig } from './constants.js';
import { LOAD_MORE_PAGE_SIZE } from './constants.js';
import { buildNewEntryElement } from './entry-dom.js';

/**
 * @param {Element} container Liveblog container element.
 * @returns {HTMLButtonElement}
 */
export function getOrCreateLoadMoreButton(container) {
	let btn = container.querySelector('.liveblog-load-more');
	if (btn) return btn;
	btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 'liveblog-load-more';
	btn.textContent = 'Load more';
	const state = container._liveblogState;
	btn.addEventListener('click', () => {
		if (state.loadingMore || !state.hasMore) return;
		const cfg = getConfig();
		if (!cfg.restUrl) return;
		state.loadingMore = true;
		btn.disabled = true;
		btn.textContent = 'Loading…';
		const url = `${cfg.restUrl}?before=${state.oldestTimestamp}&per_page=${LOAD_MORE_PAGE_SIZE}&_=${Date.now()}`;
		fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (!data.updates || data.updates.length === 0) {
					state.hasMore = false;
					btn.remove();
					return;
				}
				let minTs = state.oldestTimestamp;
				const fragment = document.createDocumentFragment();
				data.updates.forEach((update) => {
					const el = buildNewEntryElement(update);
					if (el) {
						fragment.appendChild(el);
						const ts = update.timestamp || 0;
						if (ts > 0 && (minTs === 0 || ts < minTs)) minTs = ts;
					}
				});
				container.insertBefore(fragment, btn);
				state.oldestTimestamp = minTs > 0 ? minTs : state.oldestTimestamp;
				state.hasMore = !!data.has_more;
				if (!state.hasMore) btn.remove();
			})
			.catch(() => {
				state.hasMore = true;
				btn.textContent = 'Load more';
				btn.disabled = false;
			})
			.finally(() => {
				state.loadingMore = false;
				if (btn.parentNode) {
					btn.textContent = 'Load more';
					btn.disabled = false;
				}
			});
	});
	return btn;
}
