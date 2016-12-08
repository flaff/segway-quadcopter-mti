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

function onRegisterMethod(data, utoken) {
    if (data) {
        if(data.token) {
            me = data.token;
        }

        secretStore.create(utoken, data.secret);
        console.log('[ME:' + me + ']', 'I am now', me, 'my secret is ', mysecret);
        // benchmarkEcho();
        makeRequest('ECHO', masterSegwayId, 'encrypt/decrypt test');
    }
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

function onEchoMethod(data) {
    console.log('echo:', data);
    onBenchmarkEcho();
}

function makeRequest(name, target, data, callback) {
    var responseData;

    if (name && methodMap[name]) {
        var requestToken = Auth.createToken();
        console.log('[ME:' + me + '] -' + requestToken + '-> [' + target + '] ' + '(' + name + ')', data !== undefined ? data : '<Empty>', callback || '');

        waitingOnResponses[requestToken] = callback || onMethodMap[name];

        responseData = methodMap[name](data);
        if(encryptedMessages.indexOf(name) !== -1) {
            // console.log('crypting message "' + responseData + '' + '"', target);
            responseData = secretStore.access(target).encrypt(responseData);
        }

        segwaySocket.send(JSON.stringify({
            type: name,
            rtoken: requestToken,
            utoken: me,
            trace: [me],
            target: target,
            data: responseData
        }));
    } else {
        console.log('no name defined or no method found in map for', name);
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
        waitingOnResponses[response.rtoken](response.data, response.utoken);
    }
}


function onOpenSocket() {
    console.log('[ME] connected to segway');
    makeRequest('REGISTER', masterSegwayId);
}

segwaySocket.on('open', onOpenSocket);
segwaySocket.on('message', onMessage);