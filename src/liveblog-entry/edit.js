/**
 * Entry block edit. Renders InnerBlocks for content, header with timestamp/author,
 * sidebar author selector, and toolbar pin. Sets updateId and timestamp on creation.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InnerBlocks,
	InspectorControls,
	BlockControls,
} from '@wordpress/block-editor';
import { PanelBody, ToolbarButton } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { pin } from '@wordpress/icons';
import CoAuthorsSelector from './components/coauthors-selector';
import EntryHeader from './components/EntryHeader';
import { generateUpdateId } from './utils';
import './editor.scss';

export default function Edit( { clientId, attributes, setAttributes } ) {
	const { updateId, timestamp, modified, authors, pinned } = attributes;

	const { getBlockRootClientId, getBlockIndex } = useSelect(
		( select ) => ( {
			getBlockRootClientId: select( 'core/block-editor' ).getBlockRootClientId,
			getBlockIndex: select( 'core/block-editor' ).getBlockIndex,
		} ),
		[]
	);
	const { moveBlockToPosition } = useDispatch( 'core/block-editor' );

	const blockProps = useBlockProps( {
		className: [
			'liveblog-entry',
			modified > 0 && 'has-modified',
			pinned && 'is-pinned',
		]
			.filter( Boolean )
			.join( ' ' ),
	} );

	const handlePinToggle = () => {
		const nextPinned = ! pinned;
		if ( nextPinned ) {
			const rootClientId = getBlockRootClientId( clientId );
			if ( rootClientId && getBlockIndex( clientId ) !== 0 ) {
				moveBlockToPosition( clientId, rootClientId, rootClientId, 0 );
			}
		}
		setAttributes( { pinned: nextPinned } );
	};

	const currentUser = useSelect(
		( select ) => select( 'core' )?.getCurrentUser(),
		[]
	);

	const innerContentSignature = useSelect(
		( select ) => {
			const block = select( 'core/block-editor' ).getBlock( clientId );
			if ( ! block?.innerBlocks?.length ) return '';
			return JSON.stringify(
				block.innerBlocks.map( ( b ) => ( {
					name: b.name,
					attributes: b.attributes,
				} ) )
			);
		},
		[ clientId ]
	);
	const isInitialMount = useRef( true );
	const lastModifiedSet = useRef( 0 );
	const MIN_MODIFIED_INTERVAL = 2;

	useEffect( () => {
		const updates = {};
		if ( ! updateId ) updates.updateId = generateUpdateId();
		if ( ! timestamp ) updates.timestamp = Math.floor( Date.now() / 1000 );
		if ( Object.keys( updates ).length > 0 ) {
			setAttributes( updates );
		}
	}, [ currentUser?.id ] );

	useEffect( () => {
		if ( isInitialMount.current ) {
			isInitialMount.current = false;
			return;
		}
		const now = Math.floor( Date.now() / 1000 );
		if ( now - lastModifiedSet.current >= MIN_MODIFIED_INTERVAL ) {
			lastModifiedSet.current = now;
			setAttributes( { modified: now } );
		}
	}, [ innerContentSignature ] );

	return (
		<>
			<BlockControls group="block">
				<ToolbarButton
					icon={ pin }
					label={ pinned ? __( 'Unpin entry', 'liveblog' ) : __( 'Pin to top', 'liveblog' ) }
					onClick={ handlePinToggle }
					isPressed={ pinned }
				/>
			</BlockControls>
			<InspectorControls>
				<PanelBody
					title={ __( 'Authors', 'liveblog' ) }
					initialOpen={ true }
				>
					<CoAuthorsSelector
						value={ authors }
						onChange={ ( pickedContent ) => {
							setAttributes( { authors: pickedContent } );
						} }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<EntryHeader
					timestamp={ timestamp }
					authors={ authors }
					modified={ modified }
					pinned={ pinned }
				/>
				<div className="liveblog-entry__content">
					<InnerBlocks templateLock={ false } />
				</div>
			</div>
		</>
	);
}
