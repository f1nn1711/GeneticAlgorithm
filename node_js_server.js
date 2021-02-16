var http = require('http');
var fs = require('fs');
var path = require('path');

http.createServer(function (request, response) {
	let start_timestamp = new Date();
	
	console.log('[',start_timestamp,']','request ', request.url);

	start_timestamp = start_timestamp.getTime();

	var filePath = '.' + request.url;
	if (filePath == './') {
		filePath = './index.html';
	}

	var contentType = 'text/html'

	fs.readFile(filePath, function(error, content) {
		if (error) {
			console.log(error);
		}
		else {
			response.writeHead(200, { 'Content-Type': contentType });
			response.end(content, 'utf-8');
		}
	});

	let end_timestamp = new Date();
	end_timestamp = end_timestamp.getTime();

	console.log((end_timestamp-start_timestamp)+"ms");

}).listen(8125);
console.log('Server running at http://127.0.0.1:8125/');