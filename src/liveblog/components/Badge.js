import { __ } from '@wordpress/i18n';

export default function Badge( { title, count } ) {
	return (
		<span className="liveblog-badge">
			<span className="liveblog-badge__count">{ `${ count } ${ __(
				'entries',
				'liveblog'
			) }` }</span>
		</span>
	);
}
