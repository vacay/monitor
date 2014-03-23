var request = require('request');
var URL     = require('url');

module.exports = function(options) {
    var newOpts = {};
    newOpts.__proto__ = options;
    newOpts.url = URL.parse(options.url);
    newOpts.json = true;
    
    return function(cb) {
	var req = request(newOpts, function(e, r, body) {

	    if (e) {
		cb(e);
		return;
	    }

	    var code = r.statusCode;
	    if (parseInt(code) >= 400) {
		cb('response code: ' + code);
		return;
	    }

	    var status = body.status;
	    if (status !== 'green') {
		cb('cluster status: ' + status);
		return;
	    }
	    
	    cb();
	});
    };
};
