var WebSocket = require('ws'),
    Auth = require('./auth'),
    Request = require('./request'),
    me = 'SEGWAY-SLAVE-01';

var segwayAddress = '127.0.0.1',
    segwayPort = 4820,
    segwaySocket = null,
    segwayId = 'MASTER-SEGWAY',
    droneAddress = '127.0.0.1',
    dronePort = 4822,
    droneSocket = null,
    droneId = 'DRONE';

var secretStore = new Auth.SecretStore(),
    devices = {},
    propagator = new Request.Propagator(secretStore, devices, me);

var onRegisterResponse = function (socket, response) {
    console.log('onRegisterResponse', response.data);
    console.log('registering with', response.utoken, 'using', response.data.secret);
    secretStore.create(response.utoken, response.data.secret);
    secretStore.create(droneId, response.data.secret);
    propagator.makeRequest('ECHO', droneId, 'echo test');
};

var onEchoResponse = function (socket, response) {
    console.log('onEchoResponse', response.data);
};

propagator.onResponse('ECHO', onEchoResponse, true);
propagator.onResponse('REGISTER', onRegisterResponse);


function onOpenSegwaySocket() {
    console.log('[ME] connected to segway');
    devices[segwayId] = segwaySocket;
    propagator.makeRequest('REGISTER', segwayId, me);
}

function onOpenDroneSocket() {
    console.log('[ME] connected to segway');
    devices[droneId] = droneSocket;
    propagator.makeRequest('REGISTER', droneId, me);
}

try {
    segwaySocket = new WebSocket('ws://' + segwayAddress + ':' + segwayPort);
    segwaySocket.on('open', onOpenSegwaySocket);
    segwaySocket.on('message', function (response) {propagator.handleMessage(segwaySocket, response)});
}
catch (e) {console.log('error connecting to segway @', segwayAddress, segwayPort,'\n', e.message);}

try {
    droneSocket = new WebSocket('ws://' + droneAddress + ':' + dronePort);
    droneSocket.on('open', onOpenDroneSocket);
    droneSocket.on('message', function (response) {propagator.handleMessage(droneSocket, response)});
}
catch (e) {console.log('error connecting to drone @', droneAddress, dronePort,'\n', e.message);}

