function Propagator () {

    this.handleRequest = function (socket, request) {
        var meIndex, responseData, requestData, requestError;

        console.log('handle message', request);

        request = JSON.parse(request);
        if(request && request.type && messageTypeMethods[request.type]) {
            meIndex = request.trace.indexOf(me);

            if(request.target === me) {
                if(encryptedMessages.indexOf(request.type) !== -1) {
                    // decrypt request
                    // console.log('decrypting request "' + request.data + '' + '"', request.utoken);
                    try {
                        requestData = secretStore.access(request.utoken).decrypt(request.data);
                    } catch (e) {
                        requestError = e;
                    }
                }

                responseData = messageTypeMethods[request.type](socket, requestData, request.utoken);

                if(encryptedMessages.indexOf(request.type) !== -1) {
                    // encrypt response
                    // console.log('encrypting response "' + responseData + '' + '"', request.utoken);
                    responseData = secretStore.access(request.utoken).encrypt(responseData);
                }

                socket.send(JSON.stringify({
                    type: request.type,
                    rtoken: request.rtoken,
                    trace: request.trace,
                    utoken: me,
                    target: request.utoken,
                    data: responseData
                }));
            } else if(meIndex === -1) {
                // forward request
                request.trace.push(me);
                devices[request.target].send(JSON.stringify(request));
            } else {
                // forward response
                console.log('FORWARDING '+request.rtoken+' TO '+request.trace[meIndex-1]);
                devices[request.trace[meIndex-1]].send(JSON.stringify(request));
            }
        }
    };
}