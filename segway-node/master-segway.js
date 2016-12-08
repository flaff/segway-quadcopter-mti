var net = require("net"),
    WebSocket = require('ws'),
    WebSocketServer = WebSocket.Server,
    express = require('express'),
    http = require('http'),
    Auth = require('./auth');

var droneAddress = '192.168.3.14',
    dronePort = 4822,
    segwayPort = 4820;

var segwayHttpServer = http.createServer(),
    droneSocket = null,
    segwayHttpApp = express(),
    segwaySocketServer = new WebSocketServer({server: segwayHttpServer}),
    me = 'MASTER-SEGWAY';

var secretStore = new Auth.SecretStore(),
    devices = {};

var messageTypeMethods = {
    'REGISTER': onRegisterRequest,
    'SEND_MESSAGE': onSendMessageRequest,
    'ECHO': onEchoRequest
};

var encryptedMessages = [
    'SEND_MESSAGE',
    'ECHO'
];

function onEchoRequest (socket, data) {
    return data + ' echoed';
}

function onRegisterRequest (socket, declaredUtoken) {
    console.log('onRegisterRequest', declaredUtoken);
    var token = declaredUtoken || Auth.createToken(),
        secret = secretStore.create(token);
    devices[token] = socket;
    return {
        token: token,
        secret: secret
    };
}

function onSendMessageRequest () {

}

function sendMessageRequest () {
    var type = 1;
}

function sendRegisterRequest () {
    var type = 0;
}

function checkIfAvailable (address, port, callback) {
    net.createConnection(port, address)
    .on("connect", function(e) {
        callback("success", e);
    }).on("error", function(e) {
        callback("failure", e);
    });
}

checkIfAvailable(droneAddress, dronePort, onAvailableCheckResult);

var floodCounter = 0;
function onAvailableCheckResult (result, event) {
    if(result === 'success') {
        console.log('drone online, connecting');
        droneSocket = new WebSocket('ws://' + droneAddress + ':' + dronePort);
        onConnectedToDrone();
    } else {
        floodCounter --;
        if(floodCounter <= 0) {
            floodCounter = 5;
            console.log('drone offline @ ' + droneAddress + ':' + dronePort);
        }
        setTimeout(function () {
            checkIfAvailable(droneAddress, dronePort, onAvailableCheckResult);
        }, 1500);
    }
}


function onConnectedToDrone () {
    var droneId = 'DRONE';

    droneSocket.on('open', function open() {
        console.log('[ME:'+me+']', 'connected to drone');
        devices[droneId] = droneSocket;
    });

    droneSocket.on('close', function close() {
        console.log('disconnected from drone');
    });

    droneSocket.on('message', function message(data, flags) {
        handleMessage(droneSocket, data);
    });
}

/*
 * SEGWAY COMM
 */

function traceAddMe (trace) {
    return trace.push(me);
}

var handleMessage = function (socket, request) {
    var meIndex, responseData, requestData, requestError;

    console.log('handle message', request);

    request = JSON.parse(request);
    if(request && request.type && messageTypeMethods[request.type]) {
        meIndex = request.trace.indexOf(me);

        if(request.target === me) {
            if(encryptedMessages.indexOf(request.type) !== -1) {
                // decrypt request
                // console.log('decrypting request "' + request.data + '' + '"', request.utoken);
                try {
                    requestData = secretStore.access(request.utoken).decrypt(request.data);
                } catch (e) {
                    requestError = e;
                }
            }

            responseData = messageTypeMethods[request.type](socket, requestData, request.utoken);

            if(encryptedMessages.indexOf(request.type) !== -1) {
                // encrypt response
                // console.log('encrypting response "' + responseData + '' + '"', request.utoken);
                responseData = secretStore.access(request.utoken).encrypt(responseData);
            }

            socket.send(JSON.stringify({
                type: request.type,
                rtoken: request.rtoken,
                trace: request.trace,
                utoken: me,
                target: request.utoken,
                data: responseData
            }));
        } else if(meIndex === -1) {
            // forward request
            request.trace.push(me);
            devices[request.target].send(JSON.stringify(request));
        } else {
            // forward response
            console.log('FORWARDING '+request.rtoken+' TO '+request.trace[meIndex-1]);
            devices[request.trace[meIndex-1]].send(JSON.stringify(request));
        }
    }
};

var handleClose = function (socket) {
    console.log(socket);
    console.log('handle close');
};

var handleOpen = function (socket) {
    console.log('client connected from ', socket.upgradeReq.connection.remoteAddress);
};

segwaySocketServer.on('connection', function (socket) {
    var onClientMessage = function (data) {
        handleMessage(socket, data);
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