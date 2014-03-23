module.exports = function() {
    return {
	initialize: function (name) {
	    this.name = name;
	    this.sensors = {};
	    this.isHealthy = null;
	},

	getSensors: function() {
	    var sensors = [];
	    for (var k in this.sensors) sensors.push(this.sensors[k]);
	    return sensors;
	},

	run: function() {
	    if (this.status === 'running') return;
	    this.status = 'running';
	    this.getSensors().forEach(function(sensor) {
		sensor.run();
	    });
	},

	pause: function() {
	    this.status = 'paused';
	    this.getSensors().forEach(function(sensor) {
		sensor.pause();
	    });
	},

	addSensor: function(name, sensor) {
	    var self = this;
	    this.sensors[name] = sensor;
	    sensor.emitter.on('change', function(healthy) {
		if (!healthy) self.isHealty = false;
		else self.isHealthy = self.getHealth();
	    });
	},

	getHealth: function() {
	    for (var k in this.sensors) {
		if (!this.sensors[k].isHealthy) return false;
	    }
	    return true;
	},

	getInfo: function() {
	    var sensors = this.getSensors();
	    var data = [];
	    for (var k in sensors) {
		var sensor = sensors[k].getInfo();
		data.push(sensor);
	    }
	    return {
		name: this.name,
		isHealthy: this.getHealth(),
		sensors: data
	    };
	}
    };	
};
