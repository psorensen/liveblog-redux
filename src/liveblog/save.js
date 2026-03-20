/**
 * Container block save. Outputs wrapper div with data attributes for
 * frontend polling (updateInterval, showTimestamps, newestFirst).
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 */

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { status = 'live', showStatus = true } = attributes;
	const blockProps = useBlockProps.save( {
		className: 'liveblog-container',
		'data-status': status,
		...( showStatus === false && { 'data-show-status': 'false' } ),
	} );

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
