/**
 * Entry block header: timestamp and optional pinned icon (editor).
 *
 * @param {Object}   props
 * @param {number}   props.timestamp Unix timestamp in seconds.
 * @param {boolean} props.pinned   Whether the entry is pinned to top.
 */

import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/components';
import { pin } from '@wordpress/icons';
import { formatTime } from '../utils';

export default function EntryHeader( { timestamp, pinned } ) {
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
		</div>
	);
}
