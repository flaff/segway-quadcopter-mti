var Auth = require('./auth');

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

    this.makeRequest = function (requestName, target, data, callback) {
        var responseData, encryptedPreview;

        var requestToken = Auth.createToken();
        waitingForResponse[requestToken] = callback || onResponseMethods[requestName];

        responseData = data;

        if(encryptedMethodNames.indexOf(requestName) !== -1) {
            responseData = secretStore.access(target).encrypt(responseData);
            // console.log('crypting message "' + responseData + '' + '"', target);
            encryptedPreview = responseData;
        }
        console.log('[ME:' + me + '] -' + requestToken + '-> [' + target + '] ' + '(' + requestName + ')', data !== undefined ? data : '<Empty>'
            ,encryptedMethodNames.indexOf(requestName) !== -1?'\n  └secure- '+encryptedPreview:'');

        devices[target].send(JSON.stringify({
            type: requestName,
            rtoken: requestToken,
            utoken: me,
            trace: [me],
            target: target,
            data: responseData
        }));

        // return requestToken;
    };

    this.handleMessage = function (socket, message) {
        var meIndex, responseData, requestError, encryptedMessagePreview;

        // console.log('handle message', request);

        message = JSON.parse(message);
        if(message && message.type && (onRequestMethods[message.type] || onResponseMethods[message.type] || waitingForResponse[message.rtoken])) {
            meIndex = message.trace.indexOf(me);

            if(message.target === me) {

                // decrypt request
                if(encryptedMethodNames.indexOf(message.type) !== -1) {
                    // console.log('decrypting message "' + message.data + '' + '"', message.utoken);
                    try {
                        encryptedMessagePreview = message.data;
                        message.data = secretStore.access(message.utoken).decrypt(message.data);
                    } catch (e) {
                        requestError = e;
                    }
                }
                console.log('[ME:' + me + '] <-' + message.rtoken + '- [' + message.utoken + '] ' + '(' + message.type + ')',
                    message.data || '<Empty>', encryptedMethodNames.indexOf(message.type) !== -1?'\n  └secure- '+encryptedMessagePreview:'');


                // this is a response for me, not a request
                if(waitingForResponse[message.rtoken]) {
                    waitingForResponse[message.rtoken](socket, message);
                    return;
                }

                responseData = onRequestMethods[message.type](socket, message);

                // encrypt response
                if(encryptedMethodNames.indexOf(message.type) !== -1) {
                    console.log('encrypting response "' + responseData + '' + '"', message.utoken);
                    responseData = secretStore.access(message.utoken).encrypt(responseData);
                }

                // console.log('sending:\n', {
                //     type: message.type,
                //     rtoken: message.rtoken,
                //     trace: message.trace,
                //     utoken: me,
                //     target: message.utoken,
                //     data: responseData
                // });

                socket.send(JSON.stringify({
                    type: message.type,
                    rtoken: message.rtoken,
                    trace: message.trace,
                    utoken: me,
                    target: message.utoken,
                    data: responseData
                }), function (e) {
                    console.log('socket.send error', e);
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