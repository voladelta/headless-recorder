<template>
  <section class="webmcp-runtime" aria-labelledby="webmcp-runtime-title">
    <h2 id="webmcp-runtime-title">Agent tool runtime</h2>
    <p>{{ runtimeStatus }}</p>
    <div class="webmcp-runtime__actions">
      <button type="button" :disabled="busy" @click="enableRuntime">Enable page tools</button>
      <button type="button" :disabled="busy" @click="disableRuntime">Disable</button>
    </div>
    <p>{{ bridgeStatus }}</p>
    <div class="webmcp-runtime__actions">
      <button type="button" :disabled="busy" @click="connectBridge">Connect agent bridge</button>
      <button type="button" :disabled="busy" @click="disconnectBridge">Disconnect</button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'WebMCPRuntimePanel',
  data() {
    return {
      busy: false,
      runtimeStatus: 'Enable tools on the current HTTP or HTTPS page.',
      bridgeStatus: 'The local agent bridge is disconnected.',
    }
  },
  mounted() {
    this.refreshBridgeStatus()
  },
  methods: {
    async request(type) {
      const response = await chrome.runtime.sendMessage({ type })
      if (!response?.ok) throw new Error(response?.error || 'WebMCP request failed.')
      return response.value
    },
    async run(action) {
      this.busy = true
      try {
        await action()
      } catch (error) {
        this.runtimeStatus = error.message
      } finally {
        this.busy = false
      }
    },
    enableRuntime() {
      return this.run(async () => {
        const value = await this.request('WEBMCP_RUNTIME_ENABLE')
        this.runtimeStatus = value.enabled
          ? `WebMCP authoring is ready with ${value.tools.length} custom tool(s).`
          : 'The WebMCP runtime is not active.'
      })
    },
    disableRuntime() {
      return this.run(async () => {
        await this.request('WEBMCP_RUNTIME_DISABLE')
        this.runtimeStatus = 'The WebMCP runtime is disabled on this page.'
      })
    },
    connectBridge() {
      return this.run(async () => {
        const value = await this.request('WEBMCP_BRIDGE_CONNECT')
        this.setBridgeStatus(value)
      })
    },
    disconnectBridge() {
      return this.run(async () => {
        const value = await this.request('WEBMCP_BRIDGE_DISCONNECT')
        this.setBridgeStatus(value)
      })
    },
    async refreshBridgeStatus() {
      try {
        this.setBridgeStatus(await this.request('WEBMCP_BRIDGE_STATUS'))
      } catch (error) {
        this.bridgeStatus = error.message
      }
    },
    setBridgeStatus(value) {
      if (value.connected) this.bridgeStatus = 'The local agent bridge is connected.'
      else if (value.enabled) this.bridgeStatus = 'Waiting for the local agent bridge on port 9321.'
      else this.bridgeStatus = 'The local agent bridge is disconnected.'
    },
  },
}
</script>

<style scoped>
.webmcp-runtime {
  border-top: 1px solid var(--color-border-default);
  padding: 0.65rem 0.75rem;
  font-size: 0.75rem;
}
.webmcp-runtime h2,
.webmcp-runtime p {
  margin: 0 0 0.4rem;
}
.webmcp-runtime h2 {
  font-size: 0.875rem;
  font-weight: 600;
}
.webmcp-runtime__actions {
  display: flex;
  gap: 0.4rem;
  margin-block-end: 0.55rem;
}
.webmcp-runtime button {
  min-height: 2rem;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  padding-inline: 0.6rem;
}
</style>
