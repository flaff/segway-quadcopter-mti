var crypto = require('crypto');

var exports = {};

function Device (socket, name) {
    this.name = name;
    this.socket = socket;
}

Device.prototype.log = function (args) {
    console.log.apply(console, Array.prototype.slice.call(
        ['[' + this.id + '] '].concat(Array.prototype.slice.call(args))
    ));
};

Device.prototype.sendObject = function (object) {
    if(this.socket) {
        try {
            this.socket.send(JSON.Stringify(object));
        } catch (e) {
            this.log('error sending', e);
        }
    }
};

Device.prototype.updateSocket = function (socket) {
    if(socket) {
        if(socket !== this.socket) {
            this.socket = socket;
        } else {
            this.log('Device.updateSocket - socket is the same');
        }
    }
};


function generateId () {
    return crypto.randomBytes(20).toString('hex');
}

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