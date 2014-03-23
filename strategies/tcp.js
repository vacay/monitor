module.exports = function(options) {
    var host = options.host;
    var port = options.port;
    var net  = require('net');

    return function(cb) {
	var socket = new net.Socket();
	var returned = false;

	socket.connect(port, host, function() {
	    if (!returned) cb();
	    socket.destroy();
	});

	socket.on('error', function() {
	    returned = true;
	    cb('error');
	});
    };
};
