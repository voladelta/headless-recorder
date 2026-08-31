import WebMCPPostTool from '../webmcp-post'

describe('WebMCP post_message tool', () => {
  beforeEach(() => {
    window.happyDOM.setURL('http://127.0.0.1:4173/')
    document.body.innerHTML = '<section data-webmcp-post-target></section>'
  })

  afterEach(() => {
    delete document.modelContext
    document.body.innerHTML = ''
  })

  test('registers with an AbortSignal and appends plain text', async () => {
    let definition
    let registrationSignal
    document.modelContext = {
      registerTool: vi.fn((tool, options) => {
        definition = tool
        registrationSignal = options.signal
      }),
    }
    const postTool = new WebMCPPostTool()

    await postTool.register()
    const result = definition.execute({ text: '<strong>Hello from WebMCP</strong>' })

    expect(definition.name).toBe('post_message')
    expect(registrationSignal).toBeInstanceOf(AbortSignal)
    expect(document.querySelector('[data-webmcp-post]').textContent).toBe(
      '<strong>Hello from WebMCP</strong>',
    )
    expect(document.querySelector('[data-webmcp-post] strong')).toBeNull()
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Message appended to the local demo page.' }],
    })

    postTool.disable()
    expect(registrationSignal.aborted).toBe(true)
  })

  test('rejects non-loopback pages and invalid text', async () => {
    let definition
    document.modelContext = {
      registerTool: vi.fn((tool) => {
        definition = tool
      }),
    }
    const postTool = new WebMCPPostTool()
    await postTool.register()

    expect(() => definition.execute({ text: '' })).toThrow('1 to 1000')
    window.happyDOM.setURL('https://example.com/')
    expect(() => definition.execute({ text: 'blocked' })).toThrow('approved loopback origin')
  })
})
