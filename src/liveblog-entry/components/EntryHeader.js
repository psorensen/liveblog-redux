/**
 * Entry block header: timestamp, author(s), optional pinned icon.
 *
 * @param {Object}   props
 * @param {number}   props.timestamp Unix timestamp in seconds.
 * @param {Array}    props.authors  Author objects with id (for PostContext).
 * @param {number}   props.modified Unix timestamp of last edit, or 0.
 * @param {boolean} props.pinned   Whether the entry is pinned to top.
 */

import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/components';
import { pin } from '@wordpress/icons';
import { PostContext, PostTitle } from '@10up/block-components';
import { formatTime } from '../utils';

export default function EntryHeader( { timestamp, authors, pinned } ) {
	return (
		<div className="liveblog-entry__header">
			{ pinned && (
				<span
					className="liveblog-entry__pinned-icon"
					title={ __( 'Pinned to top', 'liveblog' ) }
					aria-hidden="true"
				>
					<Icon icon={ pin } size={ 20 } />
				</span>
			) }
			{ timestamp > 0 && (
				<time
					className="liveblog-entry__time"
					dateTime={ new Date( timestamp * 1000 ).toISOString() }
				>
					{ formatTime( timestamp ) }
				</time>
			) }
			{ authors &&
				authors.length > 0 &&
				authors.map( ( author ) => (
					<PostContext
						key={ author.id }
						postId={ author.id }
						postType="guest-author"
						isEditable={ false }
					>
						<PostTitle tagName="span" />
					</PostContext>
				) ) }
		</div>
	);
}
