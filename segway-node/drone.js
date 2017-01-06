var server = require('http').createServer()
    , url = require('url')
    , WebSocketServer = require('ws').Server
    , droneSocketServer = new WebSocketServer({server: server})
    , express = require('express')
    , app = express()
    , port = 4822,
    Auth = require('./auth'),
    Request = require('./request');

    me = 'DRONE';

var secretStore = new Auth.SecretStore(),
    devices = {},
    propagator = new Request.Propagator(secretStore, devices, me);

app.use(function (req, res) {
    res.send({msg: "hello"});
});

function onEchoRequest(socket, request) {
    console.log('onEchoRequest', request.data);
    return request.data + ' echoed';
}
propagator.onRequest('ECHO', onEchoRequest, true);

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
propagator.onRequest('REGISTER', onRegisterRequest);

var handleOpen = function (socket) {
    console.log('client connected from ', socket.upgradeReq.connection.remoteAddress);
};

var handleClose = function (socket) {
    console.log('handle close');
};

droneSocketServer.on('connection', function connection(socket) {
    var onClientMessage = function (data) {
        // console.log('handleMessage', data);
        propagator.handleMessage(socket, data);
    };

    var onClientClose = function () {
        handleClose(socket);
    };

    handleOpen(socket);
    socket.on('message', onClientMessage);
    socket.on('close', onClientClose);
});

server.on('request', app);
server.listen(port, function () {
    console.log('Listening on ' + server.address().port)
});