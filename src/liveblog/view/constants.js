/**
 * Liveblog frontend constants and config.
 * Reads from global liveblogData (inlined by PHP).
 */

export const DEFAULT_INTERVAL = 10000;
export const INACTIVE_INTERVAL = 10000;
export const MIN_BACKOFF = 5000;
export const MAX_BACKOFF = 20000;
export const SCROLL_TOP_THRESHOLD = 200;
export const BANNER_AUTO_DISMISS_MS = 30000;
export const ENTRY_ENTER_ANIMATION_MS = 300;
export const INITIAL_PAGE_SIZE = 5;
export const LOAD_MORE_PAGE_SIZE = 5;
// Most extra pages a deep link may load while it looks for a hidden entry.
export const MAX_DEEP_LINK_PAGES = 20;

/**
 * @returns {{ postId: number, restUrl: string, interval: number, nonce: string }}
 */
export function getConfig() {
	const data =
		typeof window !== 'undefined' && window.liveblogData
			? window.liveblogData
			: {};
	const { postId, restUrl, interval, nonce } = data;
	return {
		postId: postId || 0,
		restUrl: restUrl || '',
		interval:
			typeof interval === 'number' && interval > 0
				? interval
				: DEFAULT_INTERVAL,
		nonce: typeof nonce === 'string' ? nonce : '',
	};
}

/**
 * Request options for the updates route. The page has a nonce only for a
 * draft or private live blog seen by a signed-in user, such as a preview.
 *
 * @param {{ nonce: string }} config Liveblog config.
 * @returns {RequestInit}
 */
export function fetchOptions( config ) {
	return config && config.nonce
		? { headers: { 'X-WP-Nonce': config.nonce } }
		: {};
}
