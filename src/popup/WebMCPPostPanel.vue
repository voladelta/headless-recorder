<template>
  <section class="webmcp-post" aria-labelledby="webmcp-post-title">
    <h2 id="webmcp-post-title">Local WebMCP tool</h2>
    <p>{{ status }}</p>
    <button type="button" :disabled="busy" @click="inject">Inject post_message</button>
    <button type="button" :disabled="busy" @click="remove">Remove</button>
  </section>
</template>

<script>
export default {
  name: 'WebMCPPostPanel',
  data() {
    return {
      busy: false,
      status: 'Open the local demo page, then inject post_message.',
    }
  },
  methods: {
    async request(type) {
      this.busy = true
      try {
        const response = await chrome.runtime.sendMessage({ type })
        if (!response?.ok) throw new Error(response?.error || 'WebMCP request failed.')
        this.status = response.value.enabled
          ? 'post_message is ready for Brave MCP.'
          : 'post_message is not registered.'
      } catch (error) {
        this.status = error.message
      } finally {
        this.busy = false
      }
    },
    inject() {
      return this.request('WEBMCP_POST_REGISTER')
    },
    remove() {
      return this.request('WEBMCP_POST_DISABLE')
    },
  },
}
</script>

<style scoped>
.webmcp-post {
  border-top: 1px solid var(--color-border-default);
  padding: 0.65rem 0.75rem;
  font-size: 0.75rem;
}
.webmcp-post h2,
.webmcp-post p {
  margin: 0 0 0.4rem;
}
.webmcp-post h2 {
  font-size: 0.875rem;
  font-weight: 600;
}
.webmcp-post button {
  min-height: 2rem;
  margin-inline-end: 0.4rem;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  padding-inline: 0.6rem;
}
</style>
