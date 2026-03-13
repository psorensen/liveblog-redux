/**
 * Entry block save. Outputs wrapper div with data attributes and InnerBlocks content.
 * data-update-id is required so frontend polling can find and replace this node when the entry is modified.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 */

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { updateId, timestamp, pinned } = attributes || {};
	const id = updateId || ( timestamp ? `update-${ timestamp }` : '' );

	const blockProps = useBlockProps.save( {
		className: [ 'liveblog-entry', pinned && 'is-pinned' ].filter( Boolean ),
		...( id && { 'data-update-id': id } ),
		...( timestamp && { 'data-timestamp': String( timestamp ) } ),
		...( pinned && { 'data-pinned': 'true' } ),
	} );

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
