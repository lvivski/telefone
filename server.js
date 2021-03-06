'use strict'

const express = require('express')
const compress = require('compression')()
const st = require('serve-static')
const http = require('http')
const Dialup = require('dialup')

const app = express()
const server = http.createServer(app)
const dialup = new Dialup({server: server})
const dir = __dirname + '/'
const port = process.env.PORT || 8080
const host = process.env.HOST || '0.0.0.0'

app.use(compress)
app.use(st(dir + 'app'))

app.get('*', function (req, res) {
	res.sendFile(dir + 'app/index.html')
})

server.listen(port, host)
