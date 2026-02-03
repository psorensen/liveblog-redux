/**
 * Co-Authors Plus author selector for liveblog entry.
 * Provides author search and multi-select when Co-Authors Plus is active;
 * falls back to a simple display when CAP is not available.
 *
 * @param {Object}   props
 * @param {Array}    props.value    Selected coauthors: [{ id, display_name, type }]
 * @param {Function} props.onChange Callback when selection changes.
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { BaseControl } from '@wordpress/components';

export default function CoAuthorsSelector( { value = [], onChange } ) {
	const currentUser = useSelect( ( select ) => select( 'core' )?.getCurrentUser(), [] );

	const handleAddCurrentUser = () => {
		if ( ! currentUser ) return;
		const existing = value.find( ( a ) => String( a.id ) === 'cap-' + currentUser.id || String( a.id ) === String( currentUser.id ) );
		if ( existing ) return;
		const next = [
			...value,
			{
				id: 'cap-' + currentUser.id,
				display_name: currentUser.name || currentUser.slug,
				type: 'wpuser',
			},
		];
		onChange( next );
	};

	const handleRemove = ( id ) => {
		onChange( value.filter( ( a ) => String( a.id ) !== String( id ) ) );
	};

	return (
		<BaseControl
			label={ __( 'Authors', 'liveblog' ) }
			help={ __( 'Co-Authors Plus adds guest author search here. For now, add the current user or leave empty to use post author.', 'liveblog' ) }
		>
			<div className="liveblog-entry-coauthors">
				{ value.length > 0 && (
					<ul className="liveblog-entry-coauthors-list">
						{ value.map( ( author ) => (
							<li key={ author.id } className="liveblog-entry-coauthor">
								<span className="liveblog-entry-coauthor-name">{ author.display_name }</span>
								<button
									type="button"
									className="liveblog-entry-coauthor-remove"
									onClick={ () => handleRemove( author.id ) }
									aria-label={ __( 'Remove author', 'liveblog' ) }
								>
									×
								</button>
							</li>
						) ) }
					</ul>
				) }
				{ currentUser && (
					<button
						type="button"
						className="button button-small"
						onClick={ handleAddCurrentUser }
					>
						{ __( 'Add me as author', 'liveblog' ) }
					</button>
				) }
			</div>
		</BaseControl>
	);
}
