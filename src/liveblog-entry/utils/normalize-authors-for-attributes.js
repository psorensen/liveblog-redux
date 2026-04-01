/**
 * Flatten ContentSearch / picker items for block attributes. WordPress only persists
 * nested keys that appear in block.json `authors.items.properties`.
 */

function stripHtml( str ) {
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

function pickTitleString( item ) {
	if ( ! item ) {
		return '';
	}
	if ( typeof item.title === 'string' ) {
		return item.title;
	}
	if ( item.title && typeof item.title === 'object' && item.title.rendered ) {
		return item.title.rendered;
	}
	return '';
}

export function normalizeAuthorsForAttributes( items ) {
	if ( ! Array.isArray( items ) ) {
		return [];
	}
	return items.map( ( item ) => {
		const titleRaw = pickTitleString( item );
		const display =
			( item.display_name && String( item.display_name ).trim() ) ||
			( item.name && String( item.name ).trim() ) ||
			stripHtml( titleRaw );
		const rawId = item.id;
		const numericId =
			typeof rawId === 'string' ? parseInt( rawId, 10 ) : Number( rawId );
		return {
			id: Number.isFinite( numericId ) ? numericId : rawId,
			display_name: display,
			title: stripHtml( titleRaw ),
			type: item.type ? String( item.type ) : '',
			subtype: item.subtype ? String( item.subtype ) : '',
			url: item.url ? String( item.url ) : '',
		};
	} );
}
