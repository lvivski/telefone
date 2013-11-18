'use strict';

var express = require('express'),
    http = require('http'),
    Dialup = require('dialup')

var app = express(),
    server = http.createServer(app),
    dialup = new Dialup({server: server}),
    dir = process.env.OPENSHIFT_REPO_DIR || __dirname + '/',
    port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080,
    host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'

app.use(express.compress())
app.use(express.static(dir + 'app'))

app.get('*', function (req, res) {
	res.sendfile(dir + 'app/index.html')
})

server.listen(port, host)