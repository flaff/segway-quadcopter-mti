var net = require("net"),
    WebSocket = require('ws'),
    WebSocketServer = WebSocket.Server,
    express = require('express'),
    http = require('http'),
    Auth = require('./auth'),
    Request = require('./request');

var quadcopterAddress = '127.0.0.1',
    quadcopterId = 'QUADCOPTER',
    quadcopterPort = 4822,
    segwayPort = 4820;

var segwayHttpServer = http.createServer(),
    quadcopterSocket = null,
    segwayHttpApp = express(),
    segwaySocketServer = new WebSocketServer({server: segwayHttpServer}),
    me = 'MASTER-SEGWAY';

var secretStore = new Auth.SecretStore(),
    devices = {},
    propagator = new Request.Propagator(secretStore, devices, me);

var onRegisterResponse = function (socket, response) {
    console.log('registering with', response.utoken, 'using', response.data.secret);
    secretStore.create(response.utoken, response.data.secret);
    propagator.makeRequest('ECHO', response.utoken, 'echo test for '+response.utoken);
};

function onEchoRequest(socket, request) {
    console.log('onEchoRequest', request.data);

    // if(request.utoken === 'SEGWAY-SLAVE-01') {
    //     propagator.makeRequest('ECHO', quadcopterId, 'echo for quadcopter through slave', null, 'SEGWAY-SLAVE-01');
    // }

    request.data = request.data + ' echoed';
    propagator.makeResponse(socket, request);
}

var onEchoResponse = function (socket, response) {
    console.log('onEchoResponse', response.data);
};

function onRegisterRequest(socket, request) {
    var token = request.data || Auth.createToken(), secret;

    console.log("creating secret for",token);
    secret = secretStore.create(token);

    console.log('onRegisterRequest, created secret', secret, 'for', token);
    devices[token] = socket;
    request.data = {
        token: token,
        secret: secret
    };

    propagator.makeResponse(socket, request);
}


var onMessageResponse = function (socket, request) {

};

var onMessageRequest = function (socket, request) {

};

propagator.onResponse('ECHO', onEchoResponse, true);
propagator.onRequest('ECHO', onEchoRequest, true);

propagator.onResponse('REGISTER', onRegisterResponse);
propagator.onRequest('REGISTER', onRegisterRequest);

propagator.onResponse('MESSAGE', onMessageResponse, true);
propagator.onRequest('MESSAGE', onMessageRequest, true);



var handleClose = function (socket) {
    console.log('handle close');
};

var handleOpen = function (socket) {
    console.log('client connected from ', socket.upgradeReq.connection.remoteAddress);
};

segwaySocketServer.on('connection', function (socket) {
    var onClientMessage = function (data) {
        // console.log('handleMessage - slave', data);
        propagator.handleMessage(socket, data);
    };

    var onClientClose = function () {
        handleClose(socket);
    };

    handleOpen(socket);
    socket.on('message', onClientMessage);
    socket.on('close', onClientClose);
});

segwayHttpServer.on('request', segwayHttpApp);
segwayHttpServer.listen(segwayPort, function () {
    console.log('listening on ' + segwayHttpServer.address().port);
});

function onOpenDroneSocket() {
    console.log('connected to', quadcopterId);
    devices[quadcopterId] = quadcopterSocket;
    propagator.makeRequest('REGISTER', quadcopterId, me);
}

try {
    quadcopterSocket = new WebSocket('ws://' + quadcopterAddress + ':' + quadcopterPort);
    quadcopterSocket.on('open', onOpenDroneSocket);
    quadcopterSocket.on('message', function (response) {

        // console.log('handleMessage - quadcopter', response);
        propagator.handleMessage(quadcopterSocket, response);
    });
}
catch (e) {console.log('error connecting to quadcopter @', quadcopterAddress, quadcopterPort,'\n', e.message);}

// function checkIfAvailable(address, port, callback) {
//     net.createConnection(port, address)
//         .on("connect", function (e) {
//             callback("success", e);
//         }).on("error", function (e) {
//         callback("failure", e);
//     });
// }

// checkIfAvailable(quadcopterAddress, quadcopterPort, onAvailableCheckResult);

// var floodCounter = 0;
// function onAvailableCheckResult(result, event) {
//     if (result === 'success') {
//         console.log('quadcopter online, connecting');
//         quadcopterSocket = new WebSocket('ws://' + quadcopterAddress + ':' + quadcopterPort);
//         onConnectedToDrone();
//     } else {
//         floodCounter--;
//         if (floodCounter <= 0) {
//             floodCounter = 5;
//             console.log('quadcopter offline @ ' + quadcopterAddress + ':' + quadcopterPort);
//         }
//         setTimeout(function () {
//             checkIfAvailable(quadcopterAddress, quadcopterPort, onAvailableCheckResult);
//         }, 1500);
//     }
// }
//
//
// function onConnectedToDrone() {
//     var quadcopterId = 'DRONE';
//
//     quadcopterSocket.on('open', function open() {
//         console.log('[ME:' + me + ']', 'connected to quadcopter');
//         devices[quadcopterId] = quadcopterSocket;
//         propagator.makeRequest('REGISTER', quadcopterId, me);
//     });
//
//     quadcopterSocket.on('close', function close() {
//         console.log('disconnected from quadcopter');
//     });
//
//     quadcopterSocket.on('message', function message(data, flags) {
//         propagator.handleMessage(quadcopterSocket, data);
//     });
// }
