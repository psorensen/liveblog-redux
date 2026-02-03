/**
 * Entry block save. Outputs wrapper div with data attributes and InnerBlocks content.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 */

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const {
		updateId = '',
		timestamp = 0,
		modified = 0,
		authorId = 0,
		coauthors = [],
		isPinned = false,
		status = 'published',
	} = attributes;

	const blockProps = useBlockProps.save( {
		className: [
			'liveblog-entry',
			isPinned && 'is-pinned',
			modified > 0 && 'has-modified',
		].filter( Boolean ).join( ' ' ),
		'data-update-id': updateId || undefined,
		'data-timestamp': timestamp || undefined,
		'data-modified': modified || undefined,
		'data-author-id': authorId || undefined,
		'data-status': status,
		'data-pinned': isPinned ? '1' : undefined,
	} );

	const coauthorsJson = coauthors.length > 0 ? JSON.stringify( coauthors ) : undefined;
	if ( coauthorsJson ) {
		blockProps[ 'data-coauthors' ] = coauthorsJson;
	}

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
