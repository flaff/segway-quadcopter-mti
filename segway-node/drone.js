var server = require('http').createServer()
    , url = require('url')
    , WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({server: server})
    , express = require('express')
    , app = express()
    , port = 4822,

    me = 'DRONE';

app.use(function (req, res) {
    res.send({msg: "hello"});
});

wss.on('connection', function connection(ws) {

    ws.on('message', function incoming(request) {
        request = JSON.parse(request);

        console.log('[ME:' + me + '] <-' + request.rtoken + '- [' + request.utoken + '] /', request.trace, '(' + request.type + ')\n', request.data !== undefined ? request.data : '<Empty>');
        request.target = request.utoken;
        request.utoken = me;
        console.log('[ME:' + me + '] -' + request.rtoken + '-> [' + request.target + '] /', request.trace, '(' + request.type + ')\n', request.data !== undefined ? request.data : '<Empty>');

        ws.send(JSON.stringify(request));
    });

    ws.on('close', function (e) {
        console.log('close');
        console.log(e);
    });
});

server.on('request', app);
server.listen(port, function () {
    console.log('Listening on ' + server.address().port)
});