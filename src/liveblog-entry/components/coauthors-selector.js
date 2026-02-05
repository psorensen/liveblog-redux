/**
 * Co-Authors Plus author selector for liveblog entry.
 *
 * @param {Object}   props
 * @param {Array}    props.value    Selected coauthors: [{ id, display_name, type, avatar_url? }]
 * @param {Function} props.onChange Callback when selection changes.
 */

import { __ } from '@wordpress/i18n';
import { BaseControl } from '@wordpress/components';
import { ContentPicker } from '@10up/block-components/components/content-picker';

export default function CoAuthorsSelector({ value = [], onChange }) {
	const capAvailable = window.liveblogData?.capAvailable ?? false;
	
	return (
		<BaseControl
			label={__('Authors', 'liveblog')}
			help={
				capAvailable === false
					? __('Co-Authors Plus is not active. Add the current user or leave empty.', 'liveblog')
					: __('Search to add authors and guest authors.', 'liveblog')
			}
		>
			{capAvailable ? (
				<ContentPicker
					contentTypes={['guest-author']}
					content={value}
					maxContentItems={5}
					isOrderable
					onPickChange={item =>{
						onChange(item)
					}}
				/>
			) : (
				<p>{__('Co-Authors Plus is not active. Add the current user or leave empty.', 'liveblog')}</p>
			)}
		</BaseControl>
	);
}
