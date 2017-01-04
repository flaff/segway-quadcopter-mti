var WebSocket = require('ws'),
    Auth = require('./auth');

var segwayAddress = '127.0.0.1',
    segwayPort = 4820,
    masterSegwayId = 'MASTER-SEGWAY',
    me = 'MASTER-SEGWAY-INTERNAL',
    mysecret = null;

var benchmarkTime = null,
    benchmarkCount = 0,
    benchmarkMax = 1000;

var segwaySocket = new WebSocket('ws://' + segwayAddress + ':' + segwayPort);

var waitingOnResponses = {},
    secretStore = new Auth.SecretStore();

function registerMethod() {
    return me;
}

function benchmarkEcho() {
    benchmarkTime = Date.now();

    var i;
    for (i = 0; i < benchmarkMax; i++) {
        makeRequest('ECHO', masterSegwayId, 'benchmark#'+i);
    }
}

function onBenchmarkEcho () {
    benchmarkCount ++;
    if(benchmarkCount === benchmarkMax) {
        console.log('Benchmark time:', Date.now() - benchmarkTime);
    }
}

function onRegisterMethod(socket, response) {
    if (response && response.data && response.data.token) {
        me = response.data.token;
    }

    secretStore.create(response.utoken, response.data.secret);
    console.log('[ME:' + me + ']', 'my secret with', response.utoken, 'is', response.data.secret);
    // benchmarkEcho();
    makeRequest('ECHO', masterSegwayId, 'encrypt/decrypt test');
    // benchmarkEcho();
}

var methodMap = {
    'REGISTER': registerMethod,
    'ECHO': echoMethod
};

var onMethodMap = {
    'REGISTER': onRegisterMethod,
    'ECHO': onEchoMethod
};

var encryptedMessages = [
    'SEND_MESSAGE',
    'ECHO'
];

function echoMethod(data) {
    return data;
}

function onEchoMethod(socket, response) {
    console.log('echo:', response.data);
    onBenchmarkEcho();
}

function makeRequest(requestName, target, data, callback) {
    var responseData;

    if (requestName && methodMap[requestName]) {
        var requestToken = Auth.createToken();
        console.log('[ME:' + me + '] -' + requestToken + '-> [' + target + '] ' + '(' + requestName + ')', data !== undefined ? data : '<Empty>', callback || '');

        waitingOnResponses[requestToken] = callback || onMethodMap[requestName];

        responseData = methodMap[requestName](data);
        if(encryptedMessages.indexOf(requestName) !== -1) {
            // console.log('crypting message "' + responseData + '' + '"', target);
            responseData = secretStore.access(target).encrypt(responseData);
        }

        segwaySocket.send(JSON.stringify({
            type: requestName,
            rtoken: requestToken,
            utoken: me,
            trace: [me],
            target: target,
            data: responseData
        }));
    } else {
        console.log('no requestName defined or no method found in map for', requestName);
    }
}

function onMessage(response) {
    response = JSON.parse(response);
    console.log('[' + response.target + '] <-' + response.rtoken + '- [' + response.utoken + '] ' + '(' + response.type + ')', response.data || '');
    if (response.rtoken && waitingOnResponses[response.rtoken]) {
        if(encryptedMessages.indexOf(response.type) !== -1) {
            // console.log('decrypting...', response.data);
            response.data = secretStore.access(response.utoken).decrypt(response.data);
            // console.log('decrypted:', response.data);
        }
        waitingOnResponses[response.rtoken](null, response);
    }
}

function onOpenSocket() {
    console.log('[ME] connected to segway');
    makeRequest('REGISTER', masterSegwayId, me);
}

segwaySocket.on('open', onOpenSocket);
segwaySocket.on('message', onMessage);
