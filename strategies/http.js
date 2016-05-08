var request = require('request');
var URL     = require('url');

module.exports = function(options) {
    var newOpts = {};
    newOpts.__proto__ = options;
    newOpts.url = URL.parse(options.url);
    newOpts.strictSSL = options.strictSSL;
    
    return function(cb) {
	var req = request(newOpts, function(e, r, body) {

	    if (e) {
		cb(e);
		return;
	    }

	    var code = r.statusCode;
	    if (parseInt(code, 10) >= 400) {
		cb('error status code ' + code);
		return;
	    }

	    cb();
	});
    };
};
