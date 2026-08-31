import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const waitForAndGetEvents = async function (page, amount) {
  await waitForRecorderEvents(page, amount)
  return getEventLog(page)
}

export const waitForRecorderEvents = function (page, amount) {
  return page.waitForFunction(
    `window.headlessRecorder.recorder._getEventLog().length >= ${amount || 1}`,
  )
}

export const getEventLog = function (page) {
  return page.evaluate(() => {
    return window.headlessRecorder.recorder._getEventLog()
  })
}

export const cleanEventLog = function (page) {
  return page.evaluate(() => {
    return window.headlessRecorder.recorder._clearEventLog()
  })
}

export const startServer = function (buildDir, file) {
  return new Promise((resolve, reject) => {
    const app = express()
    app.use('/build', express.static(path.join(__dirname, buildDir)))
    app.get('/', (req, res) => {
      res.status(200).sendFile(file, path.isAbsolute(file) ? undefined : { root: __dirname })
    })

    const server = app.listen(0, '127.0.0.1')
    server.once('error', reject)
    server.once('listening', () => {
      resolve({ server, port: server.address().port })
    })
  })
}
