var WebSocket = require('ws'),

    ws = new WebSocket('ws://localhost'),

    token = null,

    reqTokenMap = {};

var generateReqToken = function () {
    return Math.floor(Math.random()*16777215).toString(16);
};



var sendMessage = function (data, callback) {
    if(!data) {
        console.warn('no data specified');
        return;
    }
    if(callback) {
        do {
            data.reqToken = generateReqToken();
        } while(reqTokenMap[data.reqToken]);
        reqTokenMap[data.reqToken] = callback;
    }
    if(token && data) {
        data.token = token;
    }
    ws.send(JSON.stringify(data));
};

var clearReqToken = function (message) {
    if(message && message.reqToken && reqTokenMap[message.reqToken]) {
        delete reqTokenMap[message.reqToken];
    } else {
        console.log('err > no callback with reqToken '+ message.reqToken);
    }
};

var onGetTokenResponse = function (message) {
    console.log('onGetTokenResponse');
    token = message.token;
};


ws.on('open', function open () {
    var reqToken = generateReqToken();
    reqTokenMap[reqToken] = onGetTokenResponse;
    sendMessage({type: 'GET_TOKEN', reqToken: reqToken});
});

ws.on('message', function received (message) {
    console.log(message);
    message = JSON.parse(message);
    if(message && message.reqToken && reqTokenMap[message.reqToken]) {
        reqTokenMap[message.reqToken](message);
    }
});