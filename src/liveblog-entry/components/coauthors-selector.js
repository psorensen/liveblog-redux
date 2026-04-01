/**
 * Co-Authors Plus author selector for liveblog entry.
 *
 * @param {Object}   props
 * @param {Array}    props.value    Selected coauthors: normalized { id, display_name, title, … }.
 * @param {Function} props.onChange Callback when selection changes.
 * @param {boolean} [props.isInline] Shorter help text; display summary + expand-on-click for picker.
 */

import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { BaseControl, Button } from '@wordpress/components';
import { ContentSearch } from '@10up/block-components/components/content-search';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

function stripHtmlLabel( str ) {
	if ( typeof str !== 'string' || ! str ) {
		return '';
	}
	if ( typeof document === 'undefined' ) {
		return str.replace( /<[^>]*>/g, '' ).trim();
	}
	const el = document.createElement( 'div' );
	el.innerHTML = str;
	return ( el.textContent || '' ).replace( /\u00A0/g, ' ' ).trim();
}

function authorNeedsNameResolution( author ) {
	if ( ! author?.id ) {
		return false;
	}
	const has =
		( author.display_name && String( author.display_name ).trim() ) ||
		( author.name && String( author.name ).trim() ) ||
		( typeof author.title === 'string' && author.title.trim() ) ||
		( author.title &&
			typeof author.title === 'object' &&
			author.title.rendered &&
			String( author.title.rendered ).trim() );
	return ! has;
}

async function fetchDisplayNameById( id ) {
	const nid = Number( id );
	if ( ! Number.isFinite( nid ) ) {
		return '';
	}
	try {
		const g = await apiFetch( {
			path: `/wp/v2/guest-author/${ nid }?context=view&_fields=id,title`,
		} );
		const t = g.title;
		const raw =
			typeof t === 'string' ? t : t?.rendered || '';
		const name = stripHtmlLabel( raw );
		if ( name ) {
			return name;
		}
	} catch {
		// Not a guest-author post or no access.
	}
	try {
		const u = await apiFetch( {
			path: `/wp/v2/users/${ nid }?context=view&_fields=id,name`,
		} );
		if ( u.name ) {
			return String( u.name ).trim();
		}
	} catch {
		// ignore
	}
	return '';
}

export default function CoAuthorsSelector( {
	value = [],
	onChange,
	isInline = false,
} ) {
	const capAvailable = window.liveblogData?.capAvailable ?? false;
	const [ isEditing, setIsEditing ] = useState( false );
	const [ resolvedNames, setResolvedNames ] = useState( {} );
	const resolvedNamesRef = useRef( {} );
	resolvedNamesRef.current = resolvedNames;
	const inlineRootRef = useRef( null );
	const valueWhenOpenedRef = useRef( '' );

	useEffect( () => {
		if ( ! capAvailable || ! isInline ) {
			return;
		}
		const missing = ( value || [] ).filter( authorNeedsNameResolution );
		const toResolve = missing.filter(
			( a ) => ! resolvedNamesRef.current[ a.id ]
		);
		if ( toResolve.length === 0 ) {
			return;
		}
		let cancelled = false;
		( async () => {
			const pairs = await Promise.all(
				toResolve.map( async ( a ) => {
					const name = await fetchDisplayNameById( a.id );
					return name ? [ a.id, name ] : null;
				} )
			);
			if ( cancelled ) {
				return;
			}
			const updates = Object.fromEntries( pairs.filter( Boolean ) );
			if ( Object.keys( updates ).length === 0 ) {
				return;
			}
			setResolvedNames( ( prev ) => ( { ...prev, ...updates } ) );
		} )();
		return () => {
			cancelled = true;
		};
	}, [ capAvailable, isInline, value ] );

	const getAuthorDisplayLabel = useCallback(
		( author ) => {
			if ( ! author ) {
				return '';
			}
			if ( author.id != null && resolvedNames[ author.id ] ) {
				return resolvedNames[ author.id ];
			}
			let raw =
				author.display_name ||
				author.name ||
				( typeof author.title === 'string'
					? author.title
					: author.title?.rendered ) ||
				'';
			if ( typeof raw !== 'string' ) {
				raw = raw != null ? String( raw ) : '';
			}
			raw = raw.trim();
			if ( ! raw ) {
				return author.id != null ? String( author.id ) : '';
			}
			if ( /<[^>]+>/u.test( raw ) && typeof document !== 'undefined' ) {
				const el = document.createElement( 'div' );
				el.innerHTML = raw;
				raw = el.textContent || '';
			}
			return raw.replace( /\u00A0/g, ' ' ).trim();
		},
		[ resolvedNames ]
	);

	const authorIdsKey = ( authors ) =>
		JSON.stringify(
			( authors || [] )
				.map( ( a ) => a?.id )
				.filter( ( id ) => id != null )
				.sort( ( a, b ) => Number( a ) - Number( b ) )
		);

	const toggleInlinePanel = () => {
		setIsEditing( ( wasOpen ) => {
			if ( ! wasOpen ) {
				valueWhenOpenedRef.current = authorIdsKey( value );
			}
			return ! wasOpen;
		} );
	};

	const MAX_AUTHORS = 5;

	const mergeAuthorFromSearch = ( item ) => {
		if ( ! item?.id ) {
			return value || [];
		}
		const list = value || [];
		if ( list.some( ( a ) => a.id === item.id ) ) {
			return list;
		}
		if ( list.length >= MAX_AUTHORS ) {
			return list;
		}
		return [ ...list, item ];
	};

	const handleSelectAuthor = ( item ) => {
		const next = mergeAuthorFromSearch( item );
		if ( authorIdsKey( next ) === authorIdsKey( value || [] ) ) {
			return;
		}
		onChange( next );
		if (
			isInline &&
			capAvailable &&
			authorIdsKey( next ) !== valueWhenOpenedRef.current
		) {
			queueMicrotask( () => setIsEditing( false ) );
		}
	};

	const handleRemoveAuthor = ( authorId ) => {
		onChange( ( value || [] ).filter( ( a ) => a.id !== authorId ) );
	};

	const excludeSearchItems = ( value || [] ).map( ( a ) => ( {
		id: Number( a.id ),
	} ) );

	const helpCapOff = isInline
		? __( 'Co-Authors Plus is not active.', 'liveblog' )
		: __(
				'Co-Authors Plus is not active. Add the current user or leave empty.',
				'liveblog'
		  );

	const helpCapOn = isInline
		? __( 'Search to add authors.', 'liveblog' )
		: __( 'Search to add authors and guest authors.', 'liveblog' );

	const displaySummary =
		value.length > 0
			? value.map( getAuthorDisplayLabel ).filter( Boolean ).join( ', ' )
			: __( 'Add authors…', 'liveblog' );

	useEffect( () => {
		if ( ! isInline || ! isEditing ) {
			return;
		}
		const doc = inlineRootRef.current?.ownerDocument ?? document;
		const onKeyDown = ( e ) => {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				e.stopPropagation();
				setIsEditing( false );
			}
		};
		doc.addEventListener( 'keydown', onKeyDown, true );
		return () => doc.removeEventListener( 'keydown', onKeyDown, true );
	}, [ isInline, isEditing ] );

	useEffect( () => {
		if ( ! isInline || ! isEditing || ! capAvailable ) {
			return;
		}
		const onDocMouseDown = ( e ) => {
			const root = inlineRootRef.current;
			if ( ! root ) {
				return;
			}
			if ( root.contains( e.target ) ) {
				return;
			}
			const portaled = e.target.closest?.(
				[
					'.components-popover',
					'[data-wp-component*="Popover"]',
					'[role="listbox"]',
					'.components-modal__frame',
					'.components-modal__content',
					'.components-form-token-field__suggestions-list',
					'.block-editor-link-control',
				].join( ', ' )
			);
			if ( portaled ) {
				return;
			}
			setIsEditing( false );
		};
		const doc = inlineRootRef.current?.ownerDocument ?? document;
		doc.addEventListener( 'mousedown', onDocMouseDown, true );
		return () =>
			doc.removeEventListener( 'mousedown', onDocMouseDown, true );
	}, [ isInline, isEditing, capAvailable ] );

	const chosenAuthorsList =
		( value || [] ).length > 0 ? (
			<ul className="liveblog-entry-coauthors-inline__chosen">
				{ value.map( ( a ) => (
					<li key={ a.id } className="liveblog-entry-coauthors-inline__chosen-item">
						<span className="liveblog-entry-coauthors-inline__chosen-name">
							{ getAuthorDisplayLabel( a ) }
						</span>
						<Button
							variant="link"
							isDestructive
							className="liveblog-entry-coauthors-inline__chosen-remove"
							onClick={ () => handleRemoveAuthor( a.id ) }
						>
							{ __( 'Remove', 'liveblog' ) }
						</Button>
					</li>
				) ) }
			</ul>
		) : null;

	const contentSearchField = (
		<>
			<ContentSearch
				mode="post"
				contentTypes={ [ 'guest-author' ] }
				perPage={ 20 }
				placeholder={ __( 'Search authors…', 'liveblog' ) }
				label={ __( 'Add author', 'liveblog' ) }
				hideLabelFromVision
				excludeItems={ excludeSearchItems }
				onSelectItem={ handleSelectAuthor }
			/>
			{ chosenAuthorsList }
		</>
	);

	const inlineCapPicker = (
		<div className="liveblog-entry-coauthors-inline__panel">
			<div className="liveblog-entry-coauthors-inline__panel-header">
				<Button
					variant="tertiary"
					className="liveblog-entry-coauthors-inline__done"
					onClick={ () => setIsEditing( false ) }
				>
					{ __( 'Done', 'liveblog' ) }
				</Button>
			</div>
			<BaseControl
				className="liveblog-entry-coauthors-inline"
				label={ __( 'Authors', 'liveblog' ) }
				help={ helpCapOn }
			>
				{ contentSearchField }
			</BaseControl>
		</div>
	);

	const inlineDisplayTrigger = (
		<div className="liveblog-entry-coauthors-inline__display">
			<Button
				variant="tertiary"
				className="liveblog-entry-coauthors-inline__trigger"
				onClick={ toggleInlinePanel }
				aria-expanded={ isEditing }
				aria-haspopup="dialog"
			>
				{ displaySummary }
			</Button>
		</div>
	);

	if ( capAvailable && isInline ) {
		return (
			<div
				ref={ inlineRootRef }
				className="liveblog-entry-coauthors-inline__root"
			>
				<span className="screen-reader-text">{ __( 'Authors', 'liveblog' ) }</span>
				{ inlineDisplayTrigger }
				{ isEditing ? inlineCapPicker : null }
			</div>
		);
	}

	return (
		<BaseControl
			className={ isInline ? 'liveblog-entry-coauthors-inline' : undefined }
			label={ __( 'Authors', 'liveblog' ) }
			help={
				capAvailable
					? helpCapOn
					: isInline
					? undefined
					: helpCapOff
			}
		>
			{ capAvailable ? (
				contentSearchField
			) : (
				<p>
					{ isInline
						? helpCapOff
						: __(
								'Co-Authors Plus is not active. Add the current user or leave empty.',
								'liveblog'
						  ) }
				</p>
			) }
		</BaseControl>
	);
}
