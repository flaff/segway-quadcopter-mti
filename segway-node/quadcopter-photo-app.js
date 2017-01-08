var net = require("net"),
    WebSocket = require('ws'),
    Request = require('./request');

var internalAddress = '127.0.0.1',
    internalPort = 4822,
    internalSocket,

    me = 'INTERNAL',
    devices = {};

var internalPropagator;

function takeAPhoto () {
    // zrob zdjecie
    // console.log('usmiech!');
    return 'TAKE_A_PHOTO_SUCCESS';
}

function onMessageRequest (request) {
    if(request.data === 'TAKE_A_PHOTO') {
        // zwroc jako odpowiedz wynik funkcji takeAPhoto
        internalPropagator.makeResponse(takeAPhoto(), request);
    }
}

var onOpenInternalSocket = function () {
    // podlaczono do interfejsu, inicjalizacja
    internalPropagator = new Request.InternalPropagator(me, internalSocket);

    // do zapytan uzywaj onMessageRequest
    internalPropagator.onRequest(onMessageRequest);

    internalPropagator.register();
};

try {
    internalSocket = new WebSocket('ws://' + internalAddress + ':' + internalPort);
    internalSocket.on('open', onOpenInternalSocket);
    internalSocket.on('message', function (response) {internalPropagator.handleMessage(response)});
}
catch (e) {console.log('error connecting to internal @', internalAddress, internalPort,'\n', e.message);}