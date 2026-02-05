/**
 * Entry block save. Outputs wrapper div with data attributes and InnerBlocks content.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 */

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save() {

	const blockProps = useBlockProps.save( {
		className: [ 'liveblog-entry' ]
	} );

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
