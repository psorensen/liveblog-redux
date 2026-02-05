/**
 * Co-Authors Plus author selector for liveblog entry.
 * Provides author search (when Co-Authors Plus is active) and multi-select;
 * falls back to "Add me as author" when CAP is not available.
 *
 * @param {Object}   props
 * @param {Array}    props.value    Selected coauthors: [{ id, display_name, type, avatar_url? }]
 * @param {Function} props.onChange Callback when selection changes.
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect, } from '@wordpress/data';
import { BaseControl } from '@wordpress/components';
import { ContentPicker } from '@10up/block-components/components/content-picker';

export default function CoAuthorsSelector({ value = [], onChange }) {
	console.log('value from coauthors-selector.js', value);
	const capAvailable = window.liveblogData?.capAvailable ?? false;
	const [extraFields, setExtraFields] = useState([]);

	const searchResultFilter = (item, request) => {
		console.log('searchResultFilter from coauthors-selector.js', request);
		const {name, avatar_url, type} = request;
		setExtraFields({name, avatar_url, type});
		return item;
	};

	return (
		<BaseControl
			label={__('Authors', 'liveblog')}
			help={
				capAvailable === false
					? __('Co-Authors Plus is not active. Add the current user or leave empty to use the post author.', 'liveblog')
					: __('Search to add Co-Authors Plus authors, or add yourself.', 'liveblog')
			}
		>
			<ContentPicker
				mode="user"
				queryFilter={(query, { keyword }) => {
					return capAvailable ? `/liveblog/v1/authors/search?search=${encodeURIComponent(keyword)}` : query;
				}}
				content={value}
				maxContentItems={5}
				searchResultFilter={searchResultFilter}
				onPickChange={item =>{
					console.log('Onselectitem from coauthors-selector.js', item);
					console.log('extraFields from coauthors-selector.js', extraFields);
					onChange({...item[0], ...extraFields});
					setExtraFields([]);
				}}
			/>

		</BaseControl>
	);
}
