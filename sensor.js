var strategies = require('./strategies'),
    events = require('events');

module.exports = function() {
    var TIMEOUT = 5000,
	INTERVAL = 5000,
	PAUSED = 'paused',
	SECOND = 1000,
	MIN = SECOND * 60,
	HOUR = SECOND * 60,
	DAY = HOUR * 24,
	STACKED = 5;

    return {

	emitter: new events.EventEmitter(),

	initialize: function(name, options, stats) {
	    var self = this;
	    this.name = name;
	    this.options = options;

	    this.strategy = options.strategy;
	    if (typeof this.strategy === 'string')
		this.strategy = strategies[this.strategy](options);

	    this.timeout = options.timeout || TIMEOUT;
	    this.interval = options.interval || INTERVAL;

	    this.slow = options.slow;
	    this.fast = options.fast;

	    this.fall = -1 * (options.fall || 1);
	    this.up = options.up || 1;
	    
	    this.totalCount = 0;
	    this.passCount = 0;
	    this.failCount = 0;

	    this.downTime = 0;
	    this.upTime = 0;

	    this.stacked = 0;

	    this.stats = stats;

	    this.status = 'paused';
	    this.isHealthy = null;
	    this.healthCount = 0;
	    this.lastHealth = null;
	    this.isSlow = null;

	    this.setEvents();

	    this.lastChange = new Date().getTime();
	    this.firstChange = true;

	    this.emitter.on('change', function(isHealthy) {
		var now = new Date().getTime();
		var delta = now - self.lastChange;

		self[isHealthy ? 'downTime' : 'upTime'] += delta;
		self.lastChange = now;
	    });
	},

	getInfo: function() {
	    return {
		name: this.name,
		uptime: this.getUpTime(),
		downtime: this.getDownTime(),
		lastChange: this.lastChange,
		isHealthy: this.isHealthy,
		lastHealth: this.lastHealth,
		status: this.status,
		isSlow: this.isSlow
	    };
	},

	getUpTime: function() {
	    return this.upTime + 
		(this.isHealthy ? new Date().getTime() - this.lastChange : 0);
	},

	getDownTime: function() {
	    return this.downTime + 
		(!this.isHealthy ? new Date().getTime() - this.lastChange : 0);
	},

	setEvents: function() {
	    var self = this;

	    this.emitter.on('fail', function(time) {
		self.lastFailure = new Date();
		self.stats.increment('fail');
		self.stats.increment('total');
		self.stats.increment('time', time);
	    });

	    this.emitter.on('pass', function(time) {
		self.stats.increment('pass');
		self.stats.increment('total');
		self.stats.timing('time', time);
		
		self.isSlow = self.slow && time > self.slow;
		if (self.isSlow) self.stats.increment('slow');
		self.isFast = self.fast && time < self.fast;
		if (self.isFast) self.stats.increment('fast');
	    });

	    this.emitter.on('timeout', function() {
		self.stats.increment('timeout');
		self.isSlow = true;
		self.stats.increment('slow');
	    });
	},

	run: function() {
	    var self = this;
	    if (this.status === 'running') return;
	    this.status = 'running';

	    var repeat = function() {
		self.check.apply(self);;
		if (self.status === 'running')
		    setTimeout(repeat, self.interval);
	    };

	    repeat();
	},

	pause: function() {
	    this.status = 'paused';
	},

	respond: function(err, meta, time, cb) {
	    var passed = !err;
	    if (err === 'timeout') this.emitter.emit('timeout');
	    
	    var now = new Date().getTime();

	    this.totalCount++;

	    if (passed) {
		this.passCount++;
		this.lastPass = now;
	    } else {
		this.lastError = err;
		this.failCount++;
		this.lastFail = now;
	    }

	    this.emitter.emit(passed ? 'pass' : 'fail', now - time, passed ? meta : err);

	    if (this.firstChange) {
		this[passed ? 'upTime' : 'downTime'] += now - this.lastChange;
		this.firstChange = false;
		this.healthCount = passed ? this.up : this.fall;
		this.isHealthy = passed;
	    } else if (passed !== this.lastHealth) {
		this.healthCount = 0;
	    } else {
		if (err) this.healthCount--;
		else this.healthCount++;

		if (this.healthCount === this.fall) {
		    this.isHealthy = false;
		    this.emitter.emit('change', this.isHealthy);
		    this.emitter.emit('down');
		} else if (this.healthCount === this.up) {
		    this.isHealthy = true;
		    this.emitter.emit('change', this.isHealthy);
		    this.emitter.emit('up');
		}
	    }

	    this.lastHealth = passed;

	    if (cb) cb(err);
	},

	check: function(cb) {
	    var self = this;

	    if (this.stacked > 5) {
		this.strategy = false;
		this.emitter.emit('message', 'Too many requests stacked up with no response');
		return;
	    }

	    this.emitter.emit('check');

	    var startTime = new Date().getTime();
	    var stopped = false;
	    this.stacked++;

	    setTimeout(function() {
		if (stopped) return;
		self.respond('timeout', null, startTime, cb);
		stopped = true;
	    }, this.timeout);

	    this.strategy(function(err, meta) {
		self.stacked--;
		if (!stopped) self.respond(err, meta, startTime, cb);
		stopped = true;
	    });
	}
    };
};
