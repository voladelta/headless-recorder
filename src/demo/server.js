import { fileURLToPath } from 'node:url'
import express from 'express'

const host = '127.0.0.1'
const port = 4173
const app = express()

app.get('/', (_request, response) => {
  response.sendFile(fileURLToPath(new URL('./index.html', import.meta.url)))
})

app.listen(port, host, () => {
  console.log(`WebMCP live demo: http://${host}:${port}`)
})
