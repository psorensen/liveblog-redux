<?php
// This file is generated. Do not modify it manually.
return array(
	'liveblog' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'liveblog/container',
		'version' => '0.1.0',
		'title' => 'Liveblog',
		'category' => 'widgets',
		'icon' => 'megaphone',
		'description' => 'Wrapper block that holds all liveblog entries with real-time updates.',
		'example' => array(
			
		),
		'supports' => array(
			'html' => false
		),
		'textdomain' => 'liveblog',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScript' => 'file:./view.js',
		'attributes' => array(
			'allowedBlocks' => array(
				'type' => 'array',
				'default' => array(
					'liveblog/entry'
				)
			),
			'status' => array(
				'type' => 'string',
				'default' => 'live',
				'enum' => array(
					'upcoming',
					'live',
					'ended'
				)
			),
			'showStatus' => array(
				'type' => 'boolean',
				'default' => true
			)
		)
	),
	'liveblog-entry' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'liveblog/entry',
		'version' => '0.1.0',
		'title' => 'Liveblog Entry',
		'category' => 'widgets',
		'icon' => 'edit',
		'description' => 'Individual liveblog update entry.',
		'example' => array(
			
		),
		'supports' => array(
			'html' => false
		),
		'textdomain' => 'liveblog',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScript' => 'file:./view.js',
		'parent' => array(
			'liveblog/container'
		),
		'attributes' => array(
			'updateId' => array(
				'type' => 'string',
				'default' => ''
			),
			'timestamp' => array(
				'type' => 'number',
				'default' => 0
			),
			'modified' => array(
				'type' => 'number',
				'default' => 0
			),
			'authors' => array(
				'type' => 'array',
				'default' => array(
					
				),
				'items' => array(
					'type' => 'object',
					'properties' => array(
						'id' => array(
							'type' => 'number'
						),
						'display_name' => array(
							'type' => 'string'
						),
						'title' => array(
							'type' => 'string'
						),
						'name' => array(
							'type' => 'string'
						),
						'type' => array(
							'type' => 'string'
						),
						'subtype' => array(
							'type' => 'string'
						),
						'url' => array(
							'type' => 'string'
						)
					)
				)
			),
			'status' => array(
				'type' => 'string',
				'default' => 'published'
			),
			'pinned' => array(
				'type' => 'boolean',
				'default' => false
			)
		)
	)
);
