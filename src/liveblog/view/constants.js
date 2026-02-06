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

/**
 * @returns {{ postId: number, restUrl: string, interval: number }}
 */
export function getConfig() {
	const data =
		typeof window !== 'undefined' && window.liveblogData
			? window.liveblogData
			: {};
	const { postId, restUrl, interval } = data;
	return {
		postId: postId || 0,
		restUrl: restUrl || '',
		interval:
			typeof interval === 'number' && interval > 0
				? interval
				: DEFAULT_INTERVAL,
	};
}
