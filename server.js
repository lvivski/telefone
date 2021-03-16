import Koa from 'koa'
import send from 'koa-send'
import http from 'http'
import Dialup from 'dialup'

const app = new Koa()
const server = http.createServer(app.callback())
const diaup = new Dialup({server: server})
const port = process.env.PORT || 8080
const host = process.env.HOST || '0.0.0.0'

app.use(async function (ctx) {
	if (ctx.method === 'HEAD' || ctx.method === 'GET') {
		try {
			await send(ctx, ctx.path, {root: 'app', index: 'index.html'})
		} catch (err) {
			await send(ctx, 'index.html', {root: 'app'})
		}
	}
})

// app.get('*', function (req, res) {
// 	res.sendFile(new URL('app/index.html', import.meta.url))
// })

server.listen(port, host)
