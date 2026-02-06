/**
 * Entry block header: timestamp, author(s), and "Edited" label.
 *
 * @param {Object}   props
 * @param {number}   props.timestamp Unix timestamp in seconds.
 * @param {Array}    props.authors  Author objects with id (for PostContext).
 * @param {number}   props.modified Unix timestamp of last edit, or 0.
 */

import { __ } from '@wordpress/i18n';
import { PostContext, PostTitle } from '@10up/block-components';
import { formatTime } from '../utils';

export default function EntryHeader({ timestamp, authors, modified }) {
	return (
		<div className="liveblog-entry__header">
			{timestamp > 0 && (
				<time
					className="liveblog-entry__time"
					dateTime={new Date(timestamp * 1000).toISOString()}
				>
					{formatTime(timestamp)}
				</time>
			)}
			{authors && authors.length > 0 &&
				authors.map((author) => (
					<PostContext
						key={author.id}
						postId={author.id}
						postType="guest-author"
						isEditable={false}
					>
						<PostTitle tagName="span" />
					</PostContext>
				))}
			{modified > 0 && (
				<span className="liveblog-entry__edited">{__('Edited', 'liveblog')}</span>
			)}
		</div>
	);
}
