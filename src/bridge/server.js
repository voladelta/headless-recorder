import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'

import ExtensionConnection from './extension-connection'

const DEFAULT_PORT = 9321
const MAX_MESSAGE_BYTES = 64 * 1024

function textResult(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return { content: [{ type: 'text', text }] }
}

export function createBridgeServer(connection) {
  const server = new McpServer({ name: 'headless-recorder-webmcp', version: '1.0.0' })

  server.registerTool(
    'webmcp_list_tools',
    {
      description: 'List WebMCP tools registered in the active Brave page.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => textResult(await connection.request('list_tools')),
  )

  server.registerTool(
    'webmcp_call_tool',
    {
      description:
        'Call a WebMCP tool in the active Brave page. Use webmcp_list_tools first and inspect the tool schema.',
      inputSchema: z.object({
        name: z.string().min(1).max(64),
        input: z.record(z.string(), z.unknown()).default({}),
      }),
      annotations: { destructiveHint: true },
    },
    async ({ name, input }) => textResult(await connection.request('call_tool', { name, input })),
  )

  server.registerTool(
    'webmcp_runtime_status',
    {
      description: 'Report whether the WebMCP runtime is active in the current Brave page.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => textResult(await connection.request('runtime_status')),
  )

  return server
}

export function startExtensionSocket(connection, { port = DEFAULT_PORT, extensionId } = {}) {
  return Bun.serve({
    hostname: '127.0.0.1',
    port,
    fetch(request, server) {
      const url = new URL(request.url)
      const origin = request.headers.get('origin') || ''
      const expectedOrigin = extensionId ? `chrome-extension://${extensionId}` : null
      if (
        url.pathname !== '/extension' ||
        !origin.startsWith('chrome-extension://') ||
        (expectedOrigin && origin !== expectedOrigin)
      ) {
        return new Response('Forbidden', { status: 403 })
      }
      if (!server.upgrade(request)) return new Response('Upgrade required', { status: 426 })
    },
    websocket: {
      open(socket) {
        connection.attach(socket)
      },
      message(socket, message) {
        const size =
          typeof message === 'string'
            ? new TextEncoder().encode(message).byteLength
            : message.byteLength
        if (size > MAX_MESSAGE_BYTES) {
          socket.close(1009, 'Message is too large.')
          return
        }
        connection.handle(message)
      },
      close(socket) {
        connection.detach(socket)
      },
    },
  })
}

if (import.meta.main) {
  const connection = new ExtensionConnection()
  const port = Number.parseInt(process.env.WEBMCP_BRIDGE_PORT || '', 10) || DEFAULT_PORT
  const socketServer = startExtensionSocket(connection, {
    port,
    extensionId: process.env.WEBMCP_EXTENSION_ID,
  })
  serveStdio(() => createBridgeServer(connection), {
    onerror: (error) => console.error(error),
  })

  console.error(`Headless Recorder WebMCP bridge listening on ws://127.0.0.1:${socketServer.port}`)
  const stopSocketServer = () => socketServer.stop(true)
  process.stdin.once('end', stopSocketServer)
  process.stdin.once('close', stopSocketServer)
}
