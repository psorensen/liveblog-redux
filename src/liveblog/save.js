/**
 * Container block save. Outputs wrapper div with data attributes for
 * frontend polling (updateInterval, showTimestamps, newestFirst).
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 */

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { updateInterval = 15000, showTimestamps = true, newestFirst = true } = attributes;
	const blockProps = useBlockProps.save( {
		className: 'liveblog-container',
		'data-update-interval': updateInterval,
		'data-show-timestamps': showTimestamps ? '1' : '0',
		'data-newest-first': newestFirst ? '1' : '0',
	} );

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
