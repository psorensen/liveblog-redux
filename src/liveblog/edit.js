/**
 * Container block edit component. Renders InnerBlocks for liveblog entries
 * in reverse chronological order (newest first). New entries are inserted at the top.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */

import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	__experimentalHStack as HStack,
	__experimentalText as Text,
	Button,
} from '@wordpress/components';
import './editor.scss';

const PlusIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		<path d="M11 12.5V17H12.5V12.5H17V11H12.5V6H11V11H6V12.5H11Z" />
	</svg>
);

const ALLOWED_BLOCKS = ['liveblog/entry'];

export default function Edit({ clientId, attributes }) {
	const { allowedBlocks = ALLOWED_BLOCKS } = attributes;
	const blockProps = useBlockProps({
		className: 'liveblog-container',
	});

	const innerBlockCount = useSelect(
		(select) => {
			const { getBlock, getBlockCount } = select('core/block-editor');
			const block = getBlock(clientId);
			return block ? getBlockCount(clientId) : 0;
		},
		[clientId]
	);

	const { insertBlocks } = useDispatch('core/block-editor');

	const addEntryAtTop = () => {
		const entryBlock = createBlock(
			'liveblog/entry',
			{},
			[
				createBlock('core/heading', { level: 2, placeholder: __('Entry Title', 'liveblog') }),
				createBlock('core/paragraph', { placeholder: __('Write update…', 'liveblog') }),
			]
		);
		insertBlocks([entryBlock], 0, clientId);
	};

	return (
		<div {...blockProps}>

			<HStack
				alignment="right"
			>
				<Button
					className="liveblog-container__appender"
					onClick={addEntryAtTop}
					icon={PlusIcon}
					variant="primary"
				>
					{__('Add new entry', 'liveblog')}
				</Button>
			</HStack>
			<InnerBlocks
				allowedBlocks={allowedBlocks}
				templateLock={false}
				renderAppender={false}
			/>
		</div>
	);
}
