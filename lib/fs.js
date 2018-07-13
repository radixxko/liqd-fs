'use strict';

const fs = require('fs');

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

function watch( path, pattern, existing, on_change )
{
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
								on_change( 'deleted', path + file );
							}
						}
						else if( existing[index] === file )
						{
							existing.splice( index, 1 );
							on_change( 'deleted', path + file );
						}
					}
				}
				else
				{
					file = file + ( stats.isDirectory() ? '/' : '' );

					if( index !== -1 )
					{
						on_change( 'modified', path + file );
					}
					else if( !pattern || pattern.test( path + file ))
					{
						existing.push( file );
						existing.sort();
						on_change( 'created', path + file );
					}
				}
			});
		}
	});
}

module.exports = class FS
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
}
