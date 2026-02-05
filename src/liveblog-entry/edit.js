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
import { PanelBody, ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import CoAuthorsSelector from './components/coauthors-selector';
import './editor.scss';

const generateUpdateId = () => {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `lb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatTime = (ts) => {
	if (!ts) return '';
	const d = new Date(ts * 1000);
	return d.toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
};

export default function Edit({ clientId, attributes, setAttributes }) {
	console.log('attributes from edit.js', attributes);
	const {
		updateId,
		timestamp,
		modified,
		authors,
		isPinned,
	} = attributes;

	const blockProps = useBlockProps({
		className: [
			'liveblog-entry',
			isPinned && 'is-pinned',
			modified > 0 && 'has-modified',
		].filter(Boolean).join(' '),
	});

	const currentUser = useSelect((select) => select('core')?.getCurrentUser(), []);

	const innerContentSignature = useSelect(
		(select) => {
			const block = select('core/block-editor').getBlock(clientId);
			if (!block?.innerBlocks?.length) return '';
			return JSON.stringify(
				block.innerBlocks.map((b) => ({ name: b.name, attributes: b.attributes }))
			);
		},
		[clientId]
	);
	const isInitialMount = useRef(true);
	const lastModifiedSet = useRef(0);
	const MIN_MODIFIED_INTERVAL = 2;

	useEffect(() => {
		const updates = {};
		if (!updateId) updates.updateId = generateUpdateId();
		if (!timestamp) updates.timestamp = Math.floor(Date.now() / 1000);
		if (Object.keys(updates).length > 0) {
			setAttributes(updates);
		}
	}, [currentUser?.id]);

	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}
		const now = Math.floor(Date.now() / 1000);
		if (now - lastModifiedSet.current >= MIN_MODIFIED_INTERVAL) {
			lastModifiedSet.current = now;
			setAttributes({ modified: now });
		}
	}, [innerContentSignature]);

	const togglePinned = () => setAttributes({ isPinned: !isPinned });
	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Authors', 'liveblog')} initialOpen={true}>
					<CoAuthorsSelector
						value={authors}
						onChange={(next) => {
							setAttributes({ authors: [...authors, next] });
						}}
					/>
				</PanelBody>
			</InspectorControls>
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						icon={
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
								<path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
							</svg>
						}
						label={isPinned ? __('Unpin entry', 'liveblog') : __('Pin entry', 'liveblog')}
						isPressed={isPinned}
						onClick={togglePinned}
					/>
				</ToolbarGroup>
			</BlockControls>
			<div {...blockProps}>
				<div className="liveblog-entry__header">
					{timestamp > 0 && (
						<time className="liveblog-entry__time" dateTime={new Date(timestamp * 1000).toISOString()}>
							{formatTime(timestamp)}
						</time>
					)}
					{authors && authors.length > 0 && (
						authors.map((author) => (
							<span className="liveblog-entry__authors">{author.name}</span>
						))
					)}
					{modified > 0 && (
						<span className="liveblog-entry__edited">{__('Edited', 'liveblog')}</span>
					)}
				</div>
				<div className="liveblog-entry__content">
					<InnerBlocks
						templateLock={false}
					/>
				</div>
			</div>
		</>
	);
}
