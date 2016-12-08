var http = require('http'),
    url = require('url'),
    WebSocketServer = require('ws').Server,
    express = require('express'),

    port = 80,

    server = http.createServer(),
    wss = new WebSocketServer({server: server}),
    app = express(),

    users = {},

    methodTypeMap = {};


var registerMethodType = function(type, method) {
    if(type && method && !methodTypeMap[type]) {
        methodTypeMap[type] = method;
    }
};

var generateToken = function () {
    return Math.floor(Math.random()*16777215).toString(16);
};

var onGetToken = function (ws, message) {
    ws.send(JSON.stringify({token: generateToken(), reqToken: message.reqToken}));
};

var parseMessage = function (message) {
    return JSON.parse(message);
};

var handleMessage = function (ws, message) {
    if(message.type && methodTypeMap[message.type]) {
        methodTypeMap[message.type](ws, message);
    } else {
        console.warn('err > no method found for type ' + message.type);
        console.warn('err > ' + JSON.stringify(message));
    }
};

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        message = parseMessage(message);
        handleMessage(ws, message);
    });
});

server.on('request', app);
server.listen(port, function () {
    console.log('Listenin @ ' + server.address().port);
});