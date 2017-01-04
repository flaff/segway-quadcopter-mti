var crypto = require('crypto');

var exports = {};

function Device (socket, name) {
    this.name = name;
    this.socket = socket;
}

Device.prototype.updateSocket = function (socket) {
    if(socket) {
        if(socket !== this.socket) {
            this.socket = socket;
        } else {
            this.log('Device.updateSocket - socket is the same');
        }
    }
};

Device.prototype.probe = function (calllback) {

};



exports.DeviceManager = function () {
    var devices = {};

    var addDevice = function (socket) {
        var id = generateId();
        devices[id] = new Device(socket, id);
        return id;
    };

    var updateDevice = function (socket, id) {
        if(socket && id && devices[id]) {
            devices[id].updateSocket(socket);
        }
        return id;
    };

    this.register = function (socket, id) {
        if(id && devices[id]) {
            console.log('already exists: ' + id);
            return updateDevice(id, socket);
        } else {
            return addDevice(socket);
        }
    };
};