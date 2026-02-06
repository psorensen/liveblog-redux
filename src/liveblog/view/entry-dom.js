/**
 * Build and update liveblog entry DOM nodes (new entries, apply updates, insert).
 */

import { ENTRY_ENTER_ANIMATION_MS } from './constants.js';
import { formatTimestamp, escapeHtml, escapeSelectorAttr } from './utils.js';

/**
 * @param {Object} update API update object (id, content, timestamp, author, coauthors).
 * @returns {HTMLElement|null}
 */
export function buildNewEntryElement(update) {
	const content = typeof update.content === 'string' ? update.content : '';
	const id = update.id;
	let el = null;
	if (content && content.trim()) {
		const wrap = document.createElement('div');
		wrap.innerHTML = content.trim();
		el = wrap.firstElementChild;
	}
	if (!el && id) {
		el = document.createElement('div');
		el.className = 'liveblog-entry';
		el.setAttribute('data-update-id', id);
		if (update.timestamp) el.setAttribute('data-timestamp', update.timestamp);
		const hasAuthor = update.author || (update.coauthors && update.coauthors.length > 0);
		if (hasAuthor) {
			const header = document.createElement('div');
			header.className = 'liveblog-entry__header';
			const timeHtml = `<time class="liveblog-entry__time">${formatTimestamp(update.timestamp)}</time> `;
			let authorsHtml = '';
			if (update.coauthors && update.coauthors.length > 0) {
				const avatars = update.coauthors
					.map((c) =>
						c.avatar_url ? `<img src="${escapeHtml(c.avatar_url)}" alt="" width="24" height="24" />` : ''
					)
					.filter(Boolean);
				const names = update.coauthors.map((c) => escapeHtml(c.display_name || '')).join(', ');
				authorsHtml = `${avatars.length ? `<span class="liveblog-entry__author-avatars">${avatars.join('')}</span> ` : ''}<span class="liveblog-entry__author-names">${names}</span>`;
			} else {
				authorsHtml = escapeHtml(update.author);
			}
			header.innerHTML = `${timeHtml}<span class="liveblog-entry__authors">${authorsHtml}</span>`;
			el.appendChild(header);
		}
		const body = document.createElement('div');
		body.className = 'liveblog-entry__content';
		body.innerHTML = '<p></p>';
		el.appendChild(body);
	}
	return el;
}

/**
 * @param {Element} container Liveblog container element.
 * @param {Object} update API update object with id and content.
 */
export function applyUpdateToEntry(container, update) {
	const content = typeof update.content === 'string' ? update.content : '';
	const id = update.id;
	if (!id || !content.trim()) return;
	const existing = container.querySelector(`[data-update-id="${escapeSelectorAttr(id)}"]`);
	if (!existing || !existing.parentNode) return;
	const wrap = document.createElement('div');
	wrap.innerHTML = content.trim();
	const newEl = wrap.firstElementChild;
	if (newEl) {
		existing.parentNode.replaceChild(newEl, existing);
	}
}

/**
 * @param {Element} container Liveblog container element.
 * @param {HTMLElement} el New entry element to insert.
 */
export function insertNewEntry(container, el) {
	if (!el) return;
	el.classList.add('liveblog-entry--enter');
	const loadMoreBtn = container.querySelector('.liveblog-load-more');
	const insertBefore = loadMoreBtn || container.firstChild;
	container.insertBefore(el, insertBefore);
	setTimeout(() => el.classList.remove('liveblog-entry--enter'), ENTRY_ENTER_ANIMATION_MS);
}
