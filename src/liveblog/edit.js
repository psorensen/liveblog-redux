/**
 * Container block edit component. Renders InnerBlocks for liveblog entries
 * in reverse chronological order (newest first). New entries are inserted at the top.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */

import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { __experimentalHStack as HStack } from '@wordpress/components';
import AddEntryButton from './components/AddEntryButton';
import Badge from './components/Badge';
import './editor.scss';

const ALLOWED_BLOCKS = [ 'liveblog/entry' ];

export default function Edit( { clientId, attributes } ) {
	const { allowedBlocks = ALLOWED_BLOCKS } = attributes;
	const blockProps = useBlockProps( {
		className: 'liveblog-container',
	} );

	const innerBlockCount = useSelect(
		( select ) => {
			const { getBlock, getBlockCount } = select( 'core/block-editor' );
			const block = getBlock( clientId );
			return block ? getBlockCount( clientId ) : 0;
		},
		[ clientId ]
	);

	// Resolve block hierarchy after insert; used to focus the new entry's heading.
	const { getBlock } = useSelect(
		( select ) => ( {
			getBlock: select( 'core/block-editor' ).getBlock,
		} ),
		[]
	);

	const { insertBlocks, selectBlock } = useDispatch( 'core/block-editor' );

	const addEntryAtTop = () => {
		// 1. Create and insert a new liveblog/entry at the top (heading + paragraph).
		const entryBlock = createBlock( 'liveblog/entry', {}, [
			createBlock( 'core/heading', {
				level: 2,
				placeholder: __( 'Entry Title', 'liveblog' ),
			} ),
			createBlock( 'core/paragraph', {
				placeholder: __( 'Write update…', 'liveblog' ),
			} ),
		] );
		insertBlocks( [ entryBlock ], 0, clientId );

		// 2. Focus the heading inside the new entry so the user can type the title.
		// Store updates synchronously, so the new entry is already at index 0.
		const container = getBlock( clientId );
		const entryClientId = container?.innerBlocks?.[ 0 ]?.clientId;
		if ( entryClientId ) {
			const entry = getBlock( entryClientId );
			const headingClientId = entry?.innerBlocks?.[ 0 ]?.clientId;
			if ( headingClientId ) {
				selectBlock( headingClientId );
			}
		}
	};

	return (
		<div { ...blockProps }>
			<HStack justify="space-between" style={ { marginBottom: '1em' } }>
				<AddEntryButton onClick={ addEntryAtTop } />
				<Badge
					title={ __( 'Liveblog', 'liveblog' ) }
					count={ innerBlockCount }
				/>
			</HStack>
			<InnerBlocks
				allowedBlocks={ allowedBlocks }
				templateLock={ false }
				renderAppender={ false }
			/>
		</div>
	);
}
