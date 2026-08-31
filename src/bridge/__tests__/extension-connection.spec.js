import ExtensionConnection from '../extension-connection'

describe('WebMCP extension bridge connection', () => {
  test('matches extension responses to requests', async () => {
    let sent
    const socket = {
      send: vi.fn((message) => {
        sent = JSON.parse(message)
      }),
      close: vi.fn(),
    }
    const connection = new ExtensionConnection()
    connection.attach(socket)

    const result = connection.request('call_tool', { name: 'type_post', input: { text: 'Hi' } })
    connection.handle(JSON.stringify({ kind: 'response', id: sent.id, ok: true, value: 'done' }))

    await expect(result).resolves.toBe('done')
    expect(sent).toMatchObject({
      kind: 'request',
      method: 'call_tool',
      params: { name: 'type_post', input: { text: 'Hi' } },
    })
  })

  test('rejects pending work when the extension disconnects', async () => {
    const socket = { send: vi.fn(), close: vi.fn() }
    const connection = new ExtensionConnection()
    connection.attach(socket)
    const result = connection.request('list_tools')
    connection.detach(socket)
    await expect(result).rejects.toThrow('disconnected')
  })
})
