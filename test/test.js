'use strict';

const fs = require('fs');
const FS = require('../lib/fs');

try{ fs.mkdirSync( __dirname + '/fs_test' ); }catch(e){}

FS.find( __dirname + '/fs_test', null, ( event, file ) =>
{
	console.log( event, file );
})
.then( files =>
{
	console.log( files );
});

setTimeout( process.exit, 100000 );
