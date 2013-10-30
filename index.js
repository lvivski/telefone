'use strict';

var express = require('express'),
    http = require('http'),
    Dialup = require('dialup')

var app = express(),
    server = http.createServer(app),
    dialup = new Dialup({server: server})

app.use(express.compress())
app.use(express.static('app'))

app.get('*', function (req, res) {
	res.sendfile('app/index.html')
})

server.listen(process.env.PORT || 8080)