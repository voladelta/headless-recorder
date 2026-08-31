import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'

import { createBridgeServer } from '../server'

describe('WebMCP MCP bridge', () => {
  test('exposes list and call operations through MCP', async () => {
    const connection = {
      request: vi.fn((method, params) => {
        if (method === 'list_tools') return [{ name: 'type_post', inputSchema: '{}' }]
        if (method === 'call_tool') return { called: params.name, input: params.input }
        return { enabled: true }
      }),
    }
    const server = createBridgeServer(connection)
    const client = new Client({ name: 'bridge-test', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name)).toEqual([
      'webmcp_list_tools',
      'webmcp_call_tool',
      'webmcp_runtime_status',
    ])

    const result = await client.callTool({
      name: 'webmcp_call_tool',
      arguments: { name: 'type_post', input: { text: 'Hello' } },
    })
    expect(JSON.parse(result.content[0].text)).toEqual({
      called: 'type_post',
      input: { text: 'Hello' },
    })
    expect(connection.request).toHaveBeenCalledWith('call_tool', {
      name: 'type_post',
      input: { text: 'Hello' },
    })

    await client.close()
    await server.close()
  })
})
