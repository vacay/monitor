module.exports = function(options) {
    var sql   = options.query || 'SHOW TABLES';
    var mysql = require('mysql');
    var conn  = mysql.createConnection(options);
    
    return function(cb) {
	conn.query(sql, function(err, rows, fields) { 
	    cb(err);
	    conn.destroy();
	});
    };
};
