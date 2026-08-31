const REQUEST_TIMEOUT_MS = 15_000

export default class ExtensionConnection {
  constructor() {
    this.socket = null
    this.pending = new Map()
    this.nextId = 1
  }

  attach(socket) {
    if (this.socket && this.socket !== socket)
      this.socket.close(1012, 'A newer extension connected.')
    this.rejectPending(new Error('The extension connection changed.'))
    this.socket = socket
  }

  detach(socket) {
    if (this.socket !== socket) return
    this.socket = null
    this.rejectPending(new Error('The extension disconnected.'))
  }

  handle(message) {
    let value
    try {
      value = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    } catch {
      return
    }
    if (value?.kind !== 'response' || !Number.isInteger(value.id)) return
    const request = this.pending.get(value.id)
    if (!request) return
    this.pending.delete(value.id)
    clearTimeout(request.timeout)
    if (value.ok) request.resolve(value.value)
    else request.reject(new Error(String(value.error || 'The extension request failed.')))
  }

  request(method, params = {}) {
    if (!this.socket)
      return Promise.reject(new Error('The Headless Recorder extension is not connected.'))
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`The extension timed out while handling ${method}.`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timeout })
      this.socket.send(JSON.stringify({ kind: 'request', id, method, params }))
    })
  }

  rejectPending(error) {
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout)
      request.reject(error)
    }
    this.pending.clear()
  }
}
