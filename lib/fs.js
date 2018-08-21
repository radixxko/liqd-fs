'use strict';

const fs = require('fs');

const CHANGE_DELAY_MS = 100;

function findPrefixIndex( sorted_arr, prefix )
{
	// TODO binary search
	for( let i = 0; i < sorted_arr.length; ++i )
	{
		if( sorted_arr[i].startsWith( prefix )){ return i; }
		else if( sorted_arr[i] > prefix ){ break; }
	}

	return -1;
}

function countWithPrefix( sorted_arr, prefix, index = -1 )
{
	let count = 0;

	if( index === -1 ){ index = findPrefixIndex( sorted_arr, prefix ); }
	if( index !== -1 )
	{
		while( index < sorted_arr.length && sorted_arr[index].startsWith( prefix )){ ++index; ++count; }
	}

	return count;
}

function find( path, pattern, found, resolve, reject )
{
	fs.readdir( path, ( err, files ) =>
	{
		if( err ){ return reject( err ); } else if( !files.length ){ return resolve( found ); }

		let files_to_process = files.length;

		for( let file of files )
		{
			fs.stat( path + file, ( err, stats ) =>
			{
				if( err ){ return reject( err ); }

				let filename = path + file + ( stats.isDirectory() ? '/' : '' );

				if( !pattern || pattern.test( filename ))
				{
					found.push( filename );
				}

				if( stats.isDirectory() )
				{
					find( filename, pattern, found, () =>
					{
						if( --files_to_process === 0 ){ resolve( found ); }
					},
					reject );
				}
				else if( --files_to_process === 0 )
				{
					resolve( found );
				}
			});
		}
	});
}

function dispatch( change )
{
	change.scope.changes.delete( change.file );
	change.scope.timer.clear( change.file );

	change.scope.on_change( change.event, change.scope.path + change.file );
}

function trigger( scope, event, file )
{
	let change = scope.changes.get( file );

	if( event === 'deleted' )
	{
		dispatch({ scope, event, file });
	}
	else if( change )
	{
		scope.timer.postpone( file, CHANGE_DELAY_MS ); // event === change.event || event !== change.event
	}
	else
	{
		scope.changes.set( file, change = { scope, event, file });
		scope.timer.set( file, dispatch, CHANGE_DELAY_MS, change );
	}
}

function watch( path, pattern, existing, on_change )
{
	let scope = { changes: new Map(), timer: new (require('liqd-timer')), path, on_change };

	fs.watch( path, { persistent: false, recursive: true }, ( event, file ) =>
	{
		let index = findPrefixIndex( existing, file );

		if( index !== -1 || !pattern || pattern.test( path + file ) || pattern.test( path + file + '/' ) )
		{
			fs.stat( path + file, ( err, stats ) =>
			{
				if( ( index = findPrefixIndex( existing, file + '/' )) === -1 )
				{
					index = findPrefixIndex( existing, file );
				}

				if( err )
				{
					if( index !== -1 )
					{
						if( existing[index].endsWith('/') )
						{
							let count = countWithPrefix( existing, existing[index], index );
							let deleted = existing.splice( index, count ).reverse();

							for( let file of deleted )
							{
								trigger( scope, 'deleted', file );
							}
						}
						else if( existing[index] === file )
						{
							existing.splice( index, 1 );

							trigger( scope, 'deleted', file );
						}
					}
				}
				else
				{
					file = file + ( stats.isDirectory() ? '/' : '' );

					if( index !== -1 )
					{
						trigger( scope, 'modified', file );
					}
					else if( !pattern || pattern.test( path + file ))
					{
						existing.push( file );
						existing.sort();

						trigger( scope, 'created', file );
					}
				}
			});
		}
	});
}

const FS = module.exports = class FS
{
	static find( directories, pattern = null, on_change = null )
	{
		return new Promise(( resolve, reject ) =>
		{
			if( !Array.isArray( directories )){ directories = [ directories ]; }

			let searches = [], found_in_directory = new Array( directories.length );

			for( let i = 0; i < directories.length; ++i )
			{
				searches.push( new Promise(( resolve, reject ) => find( directories[i].replace(/\/*$/,'/'), pattern, found_in_directory[i] = [], resolve, reject )));
			}

			Promise.all( searches ).then( () =>
			{
				let found = [].concat( ...found_in_directory );

				if( on_change )
				{
					for( let i = 0; i < directories.length; ++i )
					{
						let directory = directories[i].replace(/\/*$/,'/');

						watch( directory, pattern, found_in_directory[i].map( f => f.substr( directory.length )).sort(), on_change );
					}
				}

				resolve( found.sort() );
			})
			.catch( reject );
		});
	}

	static mkdir( path, recursive = true )
	{
		path = path.replace( /\/+$/, '' );

		return new Promise(( resolve, reject ) =>
		{
			fs.mkdir( path, err =>
			{
				if( err && recursive && ( typeof err === 'object' && err.code === 'ENOENT' ))
				{
					FS.mkdir( path.replace( /\/[^\/]+$/, '' ), recursive ).then( () =>
					{
						fs.mkdir( path, err => err ? reject( err ) : resolve());
					})
					.catch( err => reject( err ));
				}
				else if( !err || ( typeof err === 'object' && err.code === 'EEXIST' )){ resolve(); }
				else{ reject( err ); }
			});
		});
	}
}
