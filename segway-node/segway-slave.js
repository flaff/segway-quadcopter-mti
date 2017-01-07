var WebSocket = require('ws'),
    Auth = require('./auth'),
    Request = require('./request'),
    me = 'SEGWAY-SLAVE-01';

var segwayAddress = '127.0.0.1',
    segwayPort = 4820,
    segwaySocket = null,
    segwayId = 'MASTER-SEGWAY',
    quadcopterAddress = '127.0.0.1',
    quadcopterPort = 4822,
    quadcopterSocket = null,
    quadcopterId = 'QUADCOPTER';

var secretStore = new Auth.SecretStore(),
    devices = {},
    propagator = new Request.Propagator(secretStore, devices, me);

var onRegisterResponse = function (socket, response) {
    // console.log('onRegisterResponse', response.data);
    console.log('registering with', response.utoken, 'using', response.data.secret);
    secretStore.create(response.utoken, response.data.secret);
    propagator.makeRequest('ECHO', response.utoken, 'echo test for '+response.utoken);
};

var onEchoResponse = function (socket, response) {
    console.log('onEchoResponse', response.data);
};

propagator.onResponse('ECHO', onEchoResponse, true);
propagator.onResponse('REGISTER', onRegisterResponse);


function onOpenSegwaySocket() {
    console.log('connected to', segwayId);
    devices[segwayId] = segwaySocket;
    propagator.makeRequest('REGISTER', segwayId, me);
}

function onOpenDroneSocket() {
    console.log('connected to', quadcopterId);
    devices[quadcopterId] = quadcopterSocket;
    propagator.makeRequest('REGISTER', quadcopterId, me);
}
try {
    quadcopterSocket = new WebSocket('ws://' + quadcopterAddress + ':' + quadcopterPort);
    quadcopterSocket.on('open', onOpenDroneSocket);
    quadcopterSocket.on('message', function (response) {propagator.handleMessage(quadcopterSocket, response)});
}
catch (e) {console.log('error connecting to quadcopter @', quadcopterAddress, quadcopterPort,'\n', e.message);}

try {
    segwaySocket = new WebSocket('ws://' + segwayAddress + ':' + segwayPort);
    segwaySocket.on('open', onOpenSegwaySocket);
    segwaySocket.on('message', function (response) {propagator.handleMessage(segwaySocket, response)});
}
catch (e) {console.log('error connecting to segway @', segwayAddress, segwayPort,'\n', e.message);}


