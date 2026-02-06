/**
 * Shared utilities for the liveblog entry block.
 */

/**
 * Generate a unique ID for a new entry update.
 *
 * @returns {string}
 */
export function generateUpdateId() {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `lb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Format a Unix timestamp for display (e.g. "3:45 PM").
 *
 * @param {number} ts Unix timestamp in seconds.
 * @returns {string}
 */
export function formatTime(ts) {
	if (!ts) return '';
	const d = new Date(ts * 1000);
	return d.toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
}
