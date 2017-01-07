var net = require("net"),
    WebSocket = require('ws'),
    Request = require('./request');

var internalAddress = '127.0.0.1',
    internalPort = 4822,
    internalSocket,

    me = 'INTERNAL',
    devices = {};

var internalPropagator;

function onMessageRequest (request) {
    if(request.data === 'TAKE_A_PHOTO') {
        internalPropagator.makeResponse('TAKE_A_PHOTO_SUCCESS', request);
    }

}

function onMessageResponse (request) {
    console.log('received response:', request.rtoken, ' ', request.data);
}

var onOpenInternalSocket = function () {
    console.log('internal connection established');
    internalPropagator = new Request.InternalPropagator(me, internalSocket);
    internalPropagator.onRequest(onMessageRequest);
    internalPropagator.onResponse(onMessageResponse);

    internalPropagator.register();
};

try {
    internalSocket = new WebSocket('ws://' + internalAddress + ':' + internalPort);
    internalSocket.on('open', onOpenInternalSocket);
    internalSocket.on('message', function (response) {internalPropagator.handleMessage(response)});
}
catch (e) {console.log('error connecting to internal @', internalAddress, internalPort,'\n', e.message);}