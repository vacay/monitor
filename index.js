var Service = require('./service'),
    Sensor = require('./sensor'),
    events = require('events'),
    nodemailer = require('nodemailer'),
    util = require('util'),
    StatsD = require('node-statsd').StatsD;

module.exports = function() {

    var EVENTS = [
	'fail',
	'pass',
	'up',
	'down',
	'change'
    ];

    return {

	emitter: new events.EventEmitter(),

	getServices: function() {
	    var services = [];
	    for (var k in this.services) services.push(this.services[k]);
	    return services;
	},

	run: function() {
	    if (this.status === 'running') return;
	    this.status = 'running';
	    this.getServices().forEach(function(service) {
		service.run();
	    });
	    for (var run in this.toRun) this.toRun[run]();
	},

	pause: function() {
	    this.status = 'paused';
	    this.getServices().forEach(function(service) {
		service.pause();
	    });
	},

	initialize: function(config, logger) {
	    var self = this;
	    this.statsd = config.statsd || {};
	    this.services = {};
	    this.toRun = [];
	    this.logger = logger ? logger : require('winston');

	    this.buildServices(config.services);

	    this.emitter.on('sensor', function(serviceName, sensorName, type, sensor, data1, data2) {
		if (self.loggedEvents[type]) self.log(serviceName, sensorName, type, sensor, data1, data2);
		if (self.alertedEvents[type]) self.alert(serviceName, sensorName, type, sensor, data1, data2);
	    });

	    this.setupLogging(config.log);
	    this.setupAlerting(config.alert);

	},

	buildService: function(name, config) {
	    var service = new Service();
	    service.initialize(name);
	    for (var k in config) {
		service.addSensor(k, this.buildSensor(name, k, config[k]));
	    }

	    return service;
	},

	buildSensor: function(serviceName, sensorName, config) {
	    var client = new StatsD({
		prefix: config.bucket ? config.bucket : serviceName + '.' + sensorName + '.',
		host: this.statsd.host || 'localhost',
		port: this.statsd.port || 8125,
		mock: this.statsd ? false : true
	    });
	    var sensor = new Sensor();
	    sensor.initialize(sensorName, config, client);
	    for (var i=0; i<EVENTS.length; i++) {
		this.addEvents(sensor, EVENTS[i], serviceName, sensorName);
	    }
	    return sensor;
	},

	addEvents: function(sensor, eventName, serviceName, sensorName) {
	    var args = arguments;
	    var self = this;
	    sensor.emitter.on(eventName, function(data1, data2) {
		self.emitter.emit('sensor', serviceName, sensorName, eventName, sensor, data1, data2);
	    });
	},

	log: function(serviceName, sensorName, eventType, sensor, data1, data2) {
	    this.logger.info(serviceName + '/' + sensorName + ': ' + eventType + ' - ' + new Date().toString());
	},

	alert: function(serviceName, sensorName, eventType, sensor, data1, data2) {
	    if (eventType === 'fail' && !sensor.lastHealth) return;
	    
	    var self = this;
	    var message = serviceName + '\'s ' + sensorName;

	    if (eventType === 'change') message += data1 ? ' is up!' : ' is down';
	    else message += ' failed: ' + data2;

	    var meta = { sensor: sensor.getInfo() };

	    var body = message;
	    body += '\n\n' + util.inspect(meta, { depth: 10 });

	    this.smtpTransport.sendMail({
		from: this.email.from,
		to: this.email.to,
		subject: message,
		text: body
	    }, function(err, res) {
		if (err) self.logger.error(err);
	    });
	},

	setupLogging: function(logs) {
	    this.loggedEvents = {};
	    if (!logs) return;
	    for (var i=0; i<logs.length; i++) {
		this.loggedEvents[logs[i]] = true;
	    }
	},

	setupAlerting: function(alerts) {
	    this.alertedEvents = {};
	    if (!alerts) return;

	    this.alertedEvents = {'fail': true, 'change': true};	    
	    this.smtpTransport = nodemailer.createTransport('SMTP', alerts);
	    this.email = alerts;
	},

	buildServices: function(config) {
	    if (!config) return;
	    for (var k in config) 
		this.services[k] = this.buildService(k, config[k]);
	}
    };
};
