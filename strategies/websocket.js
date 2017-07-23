module.exports = function(options) {
  var url = options.url;
  var WebSocket = require('ws');

  return function(cb) {
    var ws = new WebSocket(url, {
      strictSSL: options.strictSSL
    });
    var returned = false;

    ws.on('open', function() {
      if (!returned) cb();
      returned = true;
      ws.close();
    });

    ws.on('error', function() {
      if (!returned) cb('error');
      returned = true;
      ws.close();
    });
  };
};
