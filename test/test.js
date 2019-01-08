'use strict';

const ROOT = __dirname + '/fs_test/';

const fs = require('fs');
const FS = require('../lib/fs');

const FilterDummyFiles = ( files ) => files.filter( file => !file.includes('/.'));

const Sleep = ( ms ) => new Promise( resolve => setTimeout( resolve, ms ));

const Exec = ( command ) => new Promise( resolve =>
{
	require('child_process').exec( command, ( err, stdout, stderr ) => resolve() );
});

const Save = ( filename, data ) => new Promise( async( resolve, reject ) =>
{
	await FS.mkdir( filename.replace( /\/[^\/]*$/, '' ));

	fs.writeFile( filename, data, err => err ? reject( err ) : resolve() );
});

describe( 'FS', async( done ) =>
{
	it('should init tests', async function()
	{
		await Exec( 'rm -rf ' + ROOT + '*' );
	});

	it('should not find any files', async function()
	{
		let files = await FS.find( ROOT, null );

		//console.log( FilterDummyFiles( files ));
	});

	it('should create new files and folders and emit changes', async function()
	{
		let files = await FS.find( ROOT, null, ( event, file ) =>
		{
			//console.log( event, file );
		});

		const new_files = new Set([ 'test.txt', 'a/a.test.txt', 'a/a/a.a.test.txt' ]);

		for( let file of new_files )
		{
			await Save( ROOT + file, 'A' );
		}

		await Sleep( 1000 );

		for( let file of new_files )
		{
			await Exec( 'rm -f ' + ROOT + file );
		}

		await Sleep( 1000 );

		for( let file of new_files )
		{
			await Save( ROOT + file, 'A' );
		}

		await Sleep( 1000 );

		for( let file of new_files )
		{
			await Exec( 'rm -f ' + ROOT + file );
		}

		await Sleep( 1000 );
	})
	.timeout( 5000 );

	it('should create new files and folders and emit changes with filter', async function()
	{
		let files = await FS.find( ROOT, /\.txt$/, ( event, file ) =>
		{
			//console.log( event, file );
		});

		const new_files = new Set([ 'test.txt', 'a/a.test.txt', 'a/a/a.a.test.txt' ]);

		for( let file of new_files )
		{
			await Save( ROOT + file, 'A' );
		}

		await Sleep( 1000 );

		for( let file of new_files )
		{
			await Exec( 'rm -f ' + ROOT + file );
		}

		await Sleep( 1000 );

		for( let file of new_files )
		{
			await Save( ROOT + file, 'A' );
		}

		await Sleep( 1000 );

		for( let file of new_files )
		{
			await Exec( 'rm -f ' + ROOT + file );
		}

		await Sleep( 1000 );
	})
	.timeout( 5000 );
});
