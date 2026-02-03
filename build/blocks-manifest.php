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
			'updateInterval' => array(
				'type' => 'number',
				'default' => 15000
			),
			'showTimestamps' => array(
				'type' => 'boolean',
				'default' => true
			),
			'newestFirst' => array(
				'type' => 'boolean',
				'default' => true
			),
			'allowedBlocks' => array(
				'type' => 'array',
				'default' => array(
					'liveblog/entry'
				)
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
			'authorId' => array(
				'type' => 'number',
				'default' => 0
			),
			'coauthors' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'isPinned' => array(
				'type' => 'boolean',
				'default' => false
			),
			'status' => array(
				'type' => 'string',
				'default' => 'published'
			)
		)
	)
);
