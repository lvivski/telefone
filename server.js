'use strict';

var express = require('express'),
    http = require('http'),
    Dialup = require('dialup')

var app = express(),
    server = http.createServer(app),
    dialup = new Dialup({server: server})

app.use(express.compress())
app.use(express.static(process.env.OPENSHIFT_REPO_DIR + 'app'))

app.get('*', function (req, res) {
	res.sendfile(process.env.OPENSHIFT_REPO_DIR + 'app/index.html')
})

server.listen(process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080, process.env.OPENSHIFT_NODEJS_IP)