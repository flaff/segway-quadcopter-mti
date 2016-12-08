function Device (deviceName) {
    var name = deviceName || null,
        devicesSecretsMap = {};

    this.getName = function () {
        return name;
    };
    this.setName = function (deviceName) {
        name = deviceName;
    };
    this.getDeviceSecret = function (deviceName) {
        return devicesSecretsMap[deviceName];
    };
    this.setDeviceSecret = function (deviceName, secret) {
        devicesSecretsMap[deviceName] = secret;
    };
}

exports.Device = Device;

