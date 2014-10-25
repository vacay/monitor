module.exports = function(options) {
    try {
	var redis = require('redis');
	var client = redis.createClient(options.port, options.host);
	if (options.password) client.auth(options.password);
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
	client.quit();
    };
};
