var http = require('http'),
    express = require('express'),
    app = express();

var status = {
    1: 'REGISTER_SUCCESS',
    2: 'ALREADY_REGISTERED',
    3: 'NO_ID_FOUND'
};

function Device(identifier) {
    this.getId = function () {
        return identifier;
    }
}

function DeviceManager() {
    var devices = [],
        deviceWithDrone = null,
        droneAddress = null;

    this.register = function (identifier) {
        if (!devices[identifier]) {
            console.log('registering device ' + identifier);
            devices[identifier] = new Device(identifier);
            return {status: 200, result: identifier};
        } else {
            console.log('already registered device ' + identifier);
            return {status: 500, result: null};
        }
    };

    this.droneCatch = function (identifier) {
        if (devices[identifier]) {
            deviceWithDrone = devices[identifier];
            return {status: 200, result: deviceWithDrone.getId()};
        } else {
            return {status: 404, result: deviceWithDrone.getId()};
        }
    };

    this.droneStatus = function () {
        if(deviceWithDrone) {
            return {status: 200, result: deviceWithDrone.getId()};
        } else {
            return {status: 404, result: null};
        }
    };

    this.droneLost = function (identifier) {
        console.log('drone lost by ' + identifier);
        deviceWithDrone = null;
    };
}

var dm = new DeviceManager();

var onDroneStatus = function(req, res) {
    var r = dm.droneStatus();
    res.status(r.status).send(r.result);
};

var onDroneCatch = function(req, res) {
    var r = dm.droneCatch(req.params.id);
    res.status(r.status).send(r.result);
};

var onDroneLost = function(req, res) {
    var r = dm.droneLost(req.params.id);
    res.status(r.status).send(r.result);
};

var onRegister = function(req, res) {
    var newId = Math.random() * 1000000;
        r = dm.register(newId);
    res.status(r.status).send(r.result);
};

var onRouteNotFound = function(req, res) {

};

app.post('/drone/catch', onDroneCatch);
app.post('/drone/lost', onDroneLost);
app.post('/drone/status', onDroneStatus);
app.get('/register', onRegister);
app.get('*', onRouteNotFound);

app.listen(3000);
console.log('Started @ :3000');