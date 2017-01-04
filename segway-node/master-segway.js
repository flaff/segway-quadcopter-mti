var net = require("net"),
    WebSocket = require('ws'),
    WebSocketServer = WebSocket.Server,
    express = require('express'),
    http = require('http'),
    Auth = require('./auth'),
    Request = require('./request');

var droneAddress = '127.0.0.1',
    dronePort = 4822,
    segwayPort = 4820;

var segwayHttpServer = http.createServer(),
    droneSocket = null,
    segwayHttpApp = express(),
    segwaySocketServer = new WebSocketServer({server: segwayHttpServer}),
    me = 'MASTER-SEGWAY';

var secretStore = new Auth.SecretStore(),
    devices = {},
    propagator = new Request.Propagator(secretStore, devices, me);

function onEchoRequest(socket, request) {
    console.log('onEchoRequest', request.data);
    return request.data + ' echoed';
}

function onRegisterRequest(socket, request) {
    var token = request.data || Auth.createToken(), secret;

    console.log("creating secret for",token);
    secret = secretStore.create(token);

    console.log('onRegisterRequest, created secret', secret, 'for', token);
    devices[token] = socket;
    return {
        token: token,
        secret: secret
    };
}

propagator.onRequest('ECHO', onEchoRequest, true);
propagator.onRequest('REGISTER', onRegisterRequest);
propagator.onRequest('SEND_MESSAGE', onRegisterRequest, true);

function checkIfAvailable(address, port, callback) {
    net.createConnection(port, address)
        .on("connect", function (e) {
            callback("success", e);
        }).on("error", function (e) {
        callback("failure", e);
    });
}

checkIfAvailable(droneAddress, dronePort, onAvailableCheckResult);

var floodCounter = 0;
function onAvailableCheckResult(result, event) {
    if (result === 'success') {
        console.log('drone online, connecting');
        droneSocket = new WebSocket('ws://' + droneAddress + ':' + dronePort);
        onConnectedToDrone();
    } else {
        floodCounter--;
        if (floodCounter <= 0) {
            floodCounter = 5;
            console.log('drone offline @ ' + droneAddress + ':' + dronePort);
        }
        setTimeout(function () {
            checkIfAvailable(droneAddress, dronePort, onAvailableCheckResult);
        }, 1500);
    }
}


function onConnectedToDrone() {
    var droneId = 'DRONE';

    droneSocket.on('open', function open() {
        console.log('[ME:' + me + ']', 'connected to drone');
        devices[droneId] = droneSocket;
    });

    droneSocket.on('close', function close() {
        console.log('disconnected from drone');
    });

    droneSocket.on('message', function message(data, flags) {
        propagator.handleMessage(droneSocket, data);
    });
}

/*
 * SEGWAY COMM
 */


var handleClose = function (socket) {
    // console.log(socket);
    console.log('handle close');
};

var handleOpen = function (socket) {
    console.log('client connected from ', socket.upgradeReq.connection.remoteAddress);
};

segwaySocketServer.on('connection', function (socket) {
    var onClientMessage = function (data) {
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