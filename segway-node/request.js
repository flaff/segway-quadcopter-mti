var Auth = require('./auth');


var loggerSettings = {
    enableLogger: false,
    showEncrytedFormOfContent: false,
    showFullMessage: false,
    showRequestToken: true,
    enableTime: true
};

function now () {
    return new Date();
}

function nowText () {
    if(loggerSettings.enableTime) {
        var time = now();
        return time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + '.' + time.getMilliseconds();
    }
}

var logger = {

    onMakeRequest: function (target, requestToken, requestName, data, encryptedMethodNames, encryptedPreview) {
        if(loggerSettings.enableLogger) {
            console.log(nowText(), '>>' + target + '<<',
                loggerSettings.showRequestToken ? requestToken : '' + ':', requestName + ' - ',
                data !== undefined ? data : '<Empty>',
                loggerSettings.showEncrytedFormOfContent&& encryptedMethodNames.indexOf(requestName) !== -1?'\n  └ encrypted as: '+encryptedPreview:'');
        }
    },

    onHandleMessageReceive: function (message, encryptedMethodNames, encryptedPreview) {
        if(loggerSettings.enableLogger) {
            console.log(nowText(), '<<' + message.utoken + '>>',
                loggerSettings.showRequestToken ? message.rtoken : '' + ':', message.type + ' - ',
                message.data !== undefined ? message.data : '<Empty>',
                loggerSettings.showEncrytedFormOfContent&& encryptedMethodNames.indexOf(message.type) !== -1?'\n  └ encrypted as: '+encryptedPreview:'');
        }
    },

    onHandleMessageRespond: function (message, encryptedMethodNames, response, encryptedResponse) {
        if(loggerSettings.enableLogger) {
            console.log(nowText(), '>>' + message.utoken + '<<',
                loggerSettings.showRequestToken ? message.rtoken : '' + ':', message.type + '(response) - ',
                (response || encryptedResponse) ? (response || encryptedResponse) : '<Empty>',
                loggerSettings.showEncrytedFormOfContent&& encryptedMethodNames.indexOf(message.type) !== -1?'\n  └ encrypted as: '+encryptedResponse:'');
        }
    }
};

function isMessageFromInternal (socket, message) {
    return (message.utoken === 'INTERNAL' && socket.upgradeReq.connection.remoteAddress.indexOf('127.0.0.1') !== -1);
}

function InternalPropagator (me, internalSocket) {
    var onResponseCallback, onRequestCallback;

    this.register = function () {
        if(loggerSettings.enableLogger) console.log(nowText(), 'registering internal socket');
        internalSocket.send(JSON.stringify({
            utoken: 'INTERNAL',
            type: 'INTERNAL_REGISTER'
        }));
    };

    this.makeRequest = function (data, target) {
        var requestToken = Auth.createToken();
        if(loggerSettings.enableLogger) console.log(nowText(), '>>'+target+'<<', requestToken, '-', data);
        internalSocket.send(JSON.stringify({
            type: 'MESSAGE_REQUEST',
            utoken: me,
            target: target,
            data: data,
            rtoken: requestToken
        }));
        return requestToken;
    };

    this.makeResponse = function (data, request) {
        if(loggerSettings.enableLogger) console.log(nowText(), '>>'+request.utoken+'<<', request.rtoken, '(response) -', data);
        internalSocket.send(JSON.stringify({
            type: 'MESSAGE_RESPONSE',
            data: data,
            utoken: me,
            rtoken: request.rtoken
        }));
    };

    this.onResponse = function (callback) {
        onResponseCallback = callback;
    };

    this.onRequest = function (callback) {
        onRequestCallback = callback;
    };

    this.handleMessage = function (message) {
        message = JSON.parse(message);
        if(message && message.type === 'MESSAGE_RESPONSE') {
            if(loggerSettings.enableLogger) console.log(nowText(), '<<'+message.utoken+'>>', message.rtoken, '(response) -', message.data);
            onResponseCallback(message);
        } else if (message && message.type === 'MESSAGE_REQUEST') {
            if(loggerSettings.enableLogger) console.log(nowText(), '<<'+message.utoken+'>>', message.rtoken, '-', message.data);
            onRequestCallback(message);
        }
    }
}



function Propagator (secretStore, devices, me) {

    var onRequestMethods = {},
        onResponseMethods = {},
        encryptedMethodNames = [],
        waitingForResponse = {},
        internalSocket,
        toInternalRequests = {};

    this.onResponse = function (requestName, callback, encrypted) {
        onResponseMethods[requestName] = callback;
        if(encrypted && encryptedMethodNames.indexOf(requestName) === -1) {
            encryptedMethodNames.push(requestName);
        }
    };

    this.onRequest = function (requestName, callback, encrypted) {
        onRequestMethods[requestName] = callback;
        if(encrypted) {
            encryptedMethodNames.push(requestName);
        }
    };

    this.makeRequest = function (requestName, target, data, callback, throughDevice, requestToken) {
        var responseData, encryptedPreview;

        if(!requestToken) requestToken = Auth.createToken();
        waitingForResponse[requestToken] = callback || onResponseMethods[requestName];

        responseData = data;

        if(encryptedMethodNames.indexOf(requestName) !== -1) {
            responseData = secretStore.access(target).encrypt(responseData);
            encryptedPreview = responseData;
        }

        logger.onMakeRequest(target, requestToken, requestName, data, encryptedMethodNames, encryptedPreview);

        devices[throughDevice || target].send(JSON.stringify({
            type: requestName,
            rtoken: requestToken,
            utoken: me,
            trace: [me],
            target: target,
            data: responseData
        }));
    };

    this.setInternalSocket = function (socket) {
        internalSocket = socket;
    };

    this.fromInternalRequest = function (socket, message) {
        if(loggerSettings.enableLogger) console.log(nowText(), '<<INTERNAL>>', message.rtoken, '-', message.data);
        this.makeRequest('MESSAGE', message.target, message.data, null, 'SLAVE-SEGWAY-01', message.rtoken);
    };

    this.fromInternalResponse = function (socket, message) {
        if(loggerSettings.enableLogger) console.log(nowText(), '<<INTERNAL>>', message.rtoken, '(response) -', message.data);
        var response = toInternalRequests[message.rtoken];
        response.data = message.data;
        this.makeResponse(null, response);
    };

    this.toInternalResponse = function (socket, message) {
        message.data = secretStore.access(message.utoken).decrypt(message.data);
        if(loggerSettings.enableLogger){
            logger.onHandleMessageReceive(message, encryptedMethodNames, null);
            console.log(nowText(), '>>INTERNAL<<', message.rtoken, '(response) -', message.data);
        }
        internalSocket.send(JSON.stringify({
            type: 'MESSAGE_RESPONSE',
            data: message.data,
            rtoken: message.rtoken,
            utoken: message.utoken
        }));
    };

    this.toInternalRequest = function (socket, message) {
        message.data = secretStore.access(message.utoken).decrypt(message.data);
        if(loggerSettings.enableLogger) {
            logger.onHandleMessageReceive(message, encryptedMethodNames, null);
            console.log(nowText(), '>>INTERNAL<<', message.rtoken, '-', message.data);
        }
        toInternalRequests[message.rtoken] = message;
        internalSocket.send(JSON.stringify({
            type: 'MESSAGE_REQUEST',
            data: message.data,
            rtoken: message.rtoken,
            utoken: message.utoken
        }));
    };

    this.makeResponse = function (socket, message) {
        var unencryptedData, targetSocket;

        if(!socket) {
            socket = devices[message.utoken];
        }

        // encrypt response
        if(encryptedMethodNames.indexOf(message.type) !== -1) {
            unencryptedData = JSON.stringify(message.data);
            message.data = secretStore.access(message.utoken).encrypt(message.data);
        }

        logger.onHandleMessageRespond(message, encryptedMethodNames, unencryptedData, message.data);

        if(message.trace.length > 1) {
            targetSocket = devices[message.trace[message.trace.length - 1]];
        } else {
            targetSocket = socket;
        }

        targetSocket.send(JSON.stringify({
            type: message.type,
            rtoken: message.rtoken,
            trace: message.trace,
            utoken: me,
            target: message.utoken,//message.utoken,
            data: message.data
        }), function (e) {
            if(e) console.log(nowText(), 'socket.send error', e);
        });
    };

    this.handleMessage = function (socket, message) {
        var meIndex, responseData, encryptedResponseData, requestError, encryptedMessagePreview, internalRequest;
        message = JSON.parse(message);

        if(message && message.type) {

            if(!isMessageFromInternal(socket, message)) meIndex = message.trace.indexOf(me);

            if (isMessageFromInternal(socket, message)) {
                if (message.type === 'MESSAGE_REQUEST') {
                    this.fromInternalRequest(null, message);
                } else if (message.type === 'MESSAGE_RESPONSE') {
                    this.fromInternalResponse(null, message);
                } else if(message.type === 'INTERNAL_REGISTER') {
                    this.setInternalSocket(socket);
                }
            } else if(message.target === me) {

                if (message.type === 'MESSAGE') {
                    if(meIndex !== -1) {
                        this.toInternalResponse(null, message);
                    } else {
                        this.toInternalRequest(null, message);
                    }
                    return;
                }

                // decrypt request
                if(encryptedMethodNames.indexOf(message.type) !== -1) {
                    try {
                        encryptedMessagePreview = message.data;
                        message.data = secretStore.access(message.utoken).decrypt(message.data);
                    } catch (e) {
                        requestError = e;
                    }
                }

                logger.onHandleMessageReceive(message, encryptedMethodNames, encryptedMessagePreview);

                // this is a response for me, not a request
                if(waitingForResponse[message.rtoken]) {
                    waitingForResponse[message.rtoken](socket, message);
                    delete waitingForResponse[message.rtoken];
                    return;
                }

                onRequestMethods[message.type](socket, message);

                // // encrypt response
                // if(encryptedMethodNames.indexOf(message.type) !== -1) {
                //     encryptedResponseData = secretStore.access(message.utoken).encrypt(responseData);
                // }
                //
                // logger.onHandleMessageRespond(message, encryptedMethodNames, responseData, encryptedResponseData);
                //
                // socket.send(JSON.stringify({
                //     type: message.type,
                //     rtoken: message.rtoken,
                //     trace: message.trace,
                //     utoken: me,
                //     target: message.utoken,
                //     data: encryptedResponseData || responseData
                // }), function (e) {
                //     if(e) console.log(nowText(), 'socket.send error', e);
                // });
            } else if(meIndex === -1) {
                // forward request
                if(loggerSettings.enableLogger) console.log(nowText(), '<<'+message.utoken+'>>', '>>'+message.target+'<<', message.trace);
                message.trace.push(me);
                devices[message.target].send(JSON.stringify(message));
            } else {
                // forward response
                if(loggerSettings.enableLogger) console.log(nowText(), '<<'+message.utoken+'>>', '>>'+message.trace[meIndex-1]+'<<', '(response)', message.trace);
                devices[message.trace[meIndex-1]].send(JSON.stringify(message));
            }
        }
    };
}

exports.Propagator = Propagator;
exports.InternalPropagator = InternalPropagator;