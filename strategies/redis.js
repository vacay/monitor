module.exports = function(options) {
    var redis = require('redis');

    return function(cb) {
	var client = redis.createClient(options.port, options.host);
	if (options.password) client.auth(options.password);

	var returned = false;
	
	client.on('error', function (err) {
	    if (!returned) cb(err);
	    returned = true;
	    client.end();
	});

	client.ping(function(err) {
	    if (!returned) cb(err);
	    returned = true;
	});

	client.quit();
    };
};
