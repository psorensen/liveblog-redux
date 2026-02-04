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
import { useState, useEffect, useCallback } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { BaseControl, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const SEARCH_DEBOUNCE_MS = 280;
const MIN_SEARCH_LENGTH = 2;

export default function CoAuthorsSelector( { value = [], onChange } ) {
	const currentUser = useSelect( ( select ) => select( 'core' )?.getCurrentUser(), [] );
	const [ searchTerm, setSearchTerm ] = useState( '' );
	const [ searchResults, setSearchResults ] = useState( [] );
	const [ searchLoading, setSearchLoading ] = useState( false );
	const [ capAvailable, setCapAvailable ] = useState( null ); // null = unknown, true/false after first check

	const isAlreadySelected = useCallback(
		( author ) => value.some( ( a ) => String( a.id ) === String( author.id ) ),
		[ value ]
	);

	const handleAddAuthor = useCallback(
		( author ) => {
			if ( isAlreadySelected( author ) ) return;
			onChange( [
				...value,
				{
					id: author.id,
					display_name: author.display_name,
					type: author.type || 'wpuser',
					avatar_url: author.avatar_url,
				},
			] );
			setSearchTerm( '' );
			setSearchResults( [] );
		},
		[ value, onChange, isAlreadySelected ]
	);

	const handleAddCurrentUser = useCallback( () => {
		if ( ! currentUser ) return;
		const id = 'cap-' + currentUser.id;
		if ( value.some( ( a ) => String( a.id ) === id || String( a.id ) === String( currentUser.id ) ) ) {
			return;
		}
		onChange( [
			...value,
			{
				id,
				display_name: currentUser.name || currentUser.slug,
				type: 'wpuser',
			},
		] );
	}, [ currentUser, value, onChange ] );

	const handleRemove = useCallback(
		( id ) => onChange( value.filter( ( a ) => String( a.id ) !== String( id ) ) ),
		[ value, onChange ]
	);

	// Debounced author search when Co-Authors Plus endpoint is used.
	useEffect( () => {
		if ( capAvailable === false ) return;
		const term = ( searchTerm || '' ).trim();
		if ( term.length < MIN_SEARCH_LENGTH ) {
			setSearchResults( [] );
			return;
		}
		const timer = setTimeout( () => {
			setSearchLoading( true );
			apiFetch( {
				path: `/liveblog/v1/authors/search?search=${ encodeURIComponent( term ) }`,
			} )
				.then( ( data ) => {
					setCapAvailable( true );
					setSearchResults( Array.isArray( data ) ? data : [] );
				} )
				.catch( ( err ) => {
					if ( err?.code === 'cap_not_available' || err?.data?.status === 501 ) {
						setCapAvailable( false );
					}
					setSearchResults( [] );
				} )
				.finally( () => setSearchLoading( false ) );
		}, SEARCH_DEBOUNCE_MS );
		return () => clearTimeout( timer );
	}, [ searchTerm, capAvailable ] );

	return (
		<BaseControl
			label={ __( 'Authors', 'liveblog' ) }
			help={
				capAvailable === false
					? __( 'Co-Authors Plus is not active. Add the current user or leave empty to use the post author.', 'liveblog' )
					: __( 'Search to add Co-Authors Plus authors, or add yourself.', 'liveblog' )
			}
		>
			<div className="liveblog-entry-coauthors">
				{ value.length > 0 && (
					<ul className="liveblog-entry-coauthors-list">
						{ value.map( ( author ) => (
							<li key={ author.id } className="liveblog-entry-coauthor">
								{ author.avatar_url && (
									<img
										src={ author.avatar_url }
										alt=""
										className="liveblog-entry-coauthor-avatar"
										width={ 24 }
										height={ 24 }
									/>
								) }
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
				{ capAvailable !== false && (
					<>
						<div className="liveblog-entry-coauthors-search">
							<input
								type="search"
								className="liveblog-entry-coauthors-search-input"
								placeholder={ __( 'Search authors…', 'liveblog' ) }
								value={ searchTerm }
								onChange={ ( e ) => setSearchTerm( e.target.value ) }
								aria-label={ __( 'Search authors', 'liveblog' ) }
							/>
							{ searchLoading && (
								<span className="liveblog-entry-coauthors-search-spinner" aria-hidden="true">
									<Spinner />
								</span>
							) }
						</div>
						{ searchResults.length > 0 && (
							<ul className="liveblog-entry-coauthors-results" role="listbox">
								{ searchResults
									.filter( ( a ) => ! isAlreadySelected( a ) )
									.slice( 0, 8 )
									.map( ( author ) => (
										<li key={ author.id } role="option">
											<button
												type="button"
												className="liveblog-entry-coauthor-result"
												onClick={ () => handleAddAuthor( author ) }
											>
												{ author.avatar_url && (
													<img
														src={ author.avatar_url }
														alt=""
														className="liveblog-entry-coauthor-avatar"
														width={ 24 }
														height={ 24 }
													/>
												) }
												<span>{ author.display_name }</span>
											</button>
										</li>
									) ) }
							</ul>
						) }
					</>
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
