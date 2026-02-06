/**
 * Button to add a new liveblog entry at the top of the container.
 *
 * @param {Object}   props
 * @param {Function} props.onClick Called when the button is clicked.
 */

import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';

const PlusIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		<path d="M11 12.5V17H12.5V12.5H17V11H12.5V6H11V11H6V12.5H11Z" />
	</svg>
);

export default function AddEntryButton({ onClick }) {
	return (
		<Button
			className="liveblog-container__appender"
			onClick={onClick}
			icon={PlusIcon}
			variant="primary"
		>
			{__('Add new entry', 'liveblog')}
		</Button>
	);
}
