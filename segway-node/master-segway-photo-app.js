var net = require("net"),
    WebSocket = require('ws'),
    Request = require('./request');

var internalAddress = '127.0.0.1',
    internalPort = 4820,
    internalSocket,

    me = 'INTERNAL',
    devices = {};

var internalPropagator;

var startTime, responseCounter = 0, limit = 1000;
function startBenchmark () {
    var i;
    startTime = (new Date()).getTime();
    for(i = 0; i < limit; i++) {
        setTimeout(function () {
            internalPropagator.makeRequest('TAKE_A_PHOTO', 'QUADCOPTER');
        }, 1);
    }
}

function onMessageRequest (request) {
    internalPropagator.makeResponse('sample response echo ' + request.data, request);
}

function onMessageResponse (response) {
    if(response.data === 'TAKE_A_PHOTO_SUCCESS') {
        responseCounter++;
        // console.log('sukces robienia zdjecia!');
        if(responseCounter === limit) {
            console.log((new Date()).getTime() - startTime);
        }
    } else if (response.data === 'TAKE_A_PHOTO_FAILURE') {
        // porazka robienia zdjecia
        console.log('nie udalo sie zrobic zdjecia.');
    }
}

var onOpenInternalSocket = function () {
    console.log('internal connection established');
    internalPropagator = new Request.InternalPropagator(me, internalSocket);
    internalPropagator.onResponse(onMessageResponse);

    internalPropagator.register();

    setTimeout(function(){
        console.log('wysylam zapytanie o zrobienie zdjecia');
        // internalPropagator.makeRequest('TAKE_A_PHOTO', 'QUADCOPTER');
        startBenchmark();
    }, 250);
};

try {
    internalSocket = new WebSocket('ws://' + internalAddress + ':' + internalPort);
    internalSocket.on('open', onOpenInternalSocket);
    internalSocket.on('message', function (response) {internalPropagator.handleMessage(response)});
}
catch (e) {console.log('error connecting to internal @', internalAddress, internalPort,'\n', e.message);}