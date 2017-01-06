var Auth = require('./auth');


var loggerSettings = {
    enableLogger: true,
    showEncryptedContent: false,
    showFullMessage: false,
    showRequestToken: true
};

var logger = {
    onMakeRequest: function (target, requestToken, requestName, data, encryptedMethodNames, encryptedPreview) {
        if(loggerSettings.enableLogger) {
            console.log('>>' + target + '<<',
                loggerSettings.showRequestToken ? requestToken : '' + ':', requestName + ' - ',
                data !== undefined ? data : '<Empty>',
                loggerSettings.showEncryptedContent && encryptedMethodNames.indexOf(requestName) !== -1?'\n  └ encrypted as: '+encryptedPreview:'');
        }
    },

    onHandleMessageReceive: function (message, encryptedMethodNames, encryptedPreview) {
        if(loggerSettings.enableLogger) {
            console.log('<<' + message.utoken + '>>',
                loggerSettings.showRequestToken ? message.rtoken : '' + ':', message.type + ' - ',
                message.data !== undefined ? message.data : '<Empty>',
                loggerSettings.showEncryptedContent && encryptedMethodNames.indexOf(message.type) !== -1?'\n  └ encrypted as: '+encryptedPreview:'');
        }
    },

    onHandleMessageRespond: function (message, encryptedMethodNames, encryptedResponse, response) {
        if(loggerSettings.enableLogger) {
            console.log('>>' + message.utoken + '<<',
                loggerSettings.showRequestToken ? message.rtoken : '' + ':', message.type + '(r) - ',
                (response || encryptedResponse) ? (response || encryptedResponse) : '<Empty>',
                loggerSettings.showEncryptedContent && encryptedMethodNames.indexOf(message.type) !== -1?'\n  └ encrypted as: '+encryptedResponse:'');
        }
    }
};



function Propagator (secretStore, devices, me) {

    var onRequestMethods = {},
        onResponseMethods = {},
        encryptedMethodNames = [],
        waitingForResponse = {};

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

    this.makeRequest = function (requestName, target, data, callback, throughDevice) {
        var responseData, encryptedPreview;

        var requestToken = Auth.createToken();
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

    this.handleMessage = function (socket, message) {
        var meIndex, responseData, encryptedResponseData, requestError, encryptedMessagePreview;

        message = JSON.parse(message);
        if(message && message.type && (onRequestMethods[message.type] || onResponseMethods[message.type] || waitingForResponse[message.rtoken])) {
            meIndex = message.trace.indexOf(me);

            if(message.target === me) {

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
                    return;
                }

                responseData = onRequestMethods[message.type](socket, message);

                // encrypt response
                if(encryptedMethodNames.indexOf(message.type) !== -1) {
                    encryptedResponseData = secretStore.access(message.utoken).encrypt(responseData);
                }

                logger.onHandleMessageRespond(message, encryptedMethodNames, responseData, encryptedResponseData);

                socket.send(JSON.stringify({
                    type: message.type,
                    rtoken: message.rtoken,
                    trace: message.trace,
                    utoken: me,
                    target: message.utoken,
                    data: encryptedResponseData || responseData
                }), function (e) {
                    if(e) console.log('socket.send error', e);
                });
            } else if(meIndex === -1) {
                // forward request
                message.trace.push(me);
                devices[message.target].send(JSON.stringify(message));
            } else {
                // forward response
                console.log('FORWARDING '+message.rtoken+' TO '+message.trace[meIndex-1]);
                devices[message.trace[meIndex-1]].send(JSON.stringify(message));
            }
        }
    };
}

exports.Propagator = Propagator;