module.exports = function(options) {
    var mysql = require('mysql');
    var sql = options.query || 'SHOW TABLES';

    return function(cb) {
	var conn = mysql.createConnection(options);

	conn.query(sql, function(err, rows, fields) { 
	    cb(err);
	    conn.destroy();
	});
    };
};
