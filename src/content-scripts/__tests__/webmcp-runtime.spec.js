import WebMCPRuntime from '../webmcp-runtime'
import { parseToolDefinition } from '@/webmcp/tool-definition'

describe('generic WebMCP runtime', () => {
  let registered

  beforeEach(() => {
    window.happyDOM.setURL('https://dashboard.example/')
    document.body.innerHTML = `
      <input aria-label="Post" />
      <button type="button">Trigger</button>
      <output>Idle</output>
    `
    registered = new Map()
    document.modelContext = {
      registerTool: vi.fn((tool, options) => {
        registered.set(tool.name, { tool, signal: options.signal })
      }),
      getTools: vi.fn(() => [...registered.values()].map(({ tool }) => ({ ...tool, window }))),
      executeTool: vi.fn((tool, input) => tool.execute(JSON.parse(input))),
    }
  })

  afterEach(() => {
    delete document.modelContext
    document.body.innerHTML = ''
  })

  test('defines and executes reusable type, click, and read tools', async () => {
    const saved = vi.fn()
    const runtime = new WebMCPRuntime({ saveDefinition: saved })
    await runtime.register()

    const typeDefinition = {
      name: 'type_post',
      description: 'Type text into the post composer.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      steps: [{ op: 'type', selector: '[aria-label="Post"]', input: 'text' }],
    }
    await registered.get('webmcp_define_tool').tool.execute({ definition: typeDefinition })
    await runtime.handle({
      type: 'WEBMCP_RUNTIME_CALL',
      name: 'type_post',
      input: { text: 'Hello through WebMCP' },
    })
    expect(document.querySelector('input').value).toBe('Hello through WebMCP')
    expect(saved).toHaveBeenCalledWith(parseToolDefinition(typeDefinition))
    expect(document.modelContext.executeTool).not.toHaveBeenCalled()

    await registered.get('webmcp_define_tool').tool.execute({
      definition: {
        name: 'trigger_post',
        description: 'Select the trigger button and read the result.',
        inputSchema: { type: 'object', properties: {} },
        steps: [
          { op: 'click', selector: 'button' },
          { op: 'read', selector: 'output', as: 'status' },
        ],
      },
    })
    document.querySelector('button').addEventListener('click', () => {
      document.querySelector('output').textContent = 'Triggered'
    })
    const result = await registered.get('trigger_post').tool.execute({})
    expect(result.content[0].text).toBe('{"status":"Triggered"}')
  })

  test('rejects arbitrary operations and cross-origin execution', async () => {
    expect(() =>
      parseToolDefinition({
        name: 'unsafe_tool',
        description: 'Run arbitrary code.',
        inputSchema: { type: 'object', properties: {} },
        steps: [{ op: 'script', selector: 'body', source: 'alert(1)' }],
      }),
    ).toThrow('unsupported operation')

    const runtime = new WebMCPRuntime()
    await runtime.register([
      {
        name: 'read_status',
        description: 'Read the current status.',
        inputSchema: { type: 'object', properties: {} },
        steps: [{ op: 'read', selector: 'output', as: 'status' }],
      },
    ])
    window.happyDOM.setURL('https://other.example/')
    await expect(registered.get('read_status').tool.execute({})).rejects.toThrow('changed origin')
  })

  test('reconciles saved definitions while the runtime stays active', async () => {
    const runtime = new WebMCPRuntime()
    await runtime.register([
      {
        name: 'old_tool',
        description: 'Read the old status.',
        inputSchema: { type: 'object', properties: {} },
        steps: [{ op: 'read', selector: 'output', as: 'status' }],
      },
    ])
    const oldSignal = registered.get('old_tool').signal

    await runtime.register([
      {
        name: 'new_tool',
        description: 'Read the new status.',
        inputSchema: { type: 'object', properties: {} },
        steps: [{ op: 'read', selector: 'output', as: 'status' }],
      },
    ])

    expect(oldSignal.aborted).toBe(true)
    expect(runtime.status().tools).toEqual(['new_tool'])
  })
})
