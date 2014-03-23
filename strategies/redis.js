module.exports = function(options) {
    try {
	var redis = require('redis');
	var client = redis.createClient(options);
    } catch (e) {
	throw 'Please install the redis driver: npm install redis';
    }

    var error = false;
    client.on('error',   function () { error = true; });
    client.on('connect', function () { error = false; });

    return function(cb) {
	if (error) {
	    cb('connection error');
	    return;
	}

	client.ping(cb); 
    };
};
