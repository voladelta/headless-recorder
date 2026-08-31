import store from '@/store'

import Overlay from '@/modules/overlay'
import Recorder from '@/modules/recorder'

import HeadlessController from '@/content-scripts/controller'
import WebMCPPostTool from '@/content-scripts/webmcp-post'
import WebMCPRuntime from '@/content-scripts/webmcp-runtime'

async function persistRuntimeDefinition(type, value) {
  const response = await chrome.runtime.sendMessage({ type, origin: location.origin, ...value })
  if (!response?.ok) throw new Error(response?.error || 'Unable to save the WebMCP tool.')
  return response.value
}

if (!window.headlessWebMCPRuntime && typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  const runtime = new WebMCPRuntime({
    saveDefinition: (definition) =>
      persistRuntimeDefinition('WEBMCP_DEFINITION_SAVE', { definition }),
    removeDefinition: (name) => persistRuntimeDefinition('WEBMCP_DEFINITION_REMOVE', { name }),
  })
  window.headlessWebMCPRuntime = runtime
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'HEADLESS_RECORDER_PING') {
      sendResponse({ ready: true })
      return
    }
    if (!message?.type?.startsWith('WEBMCP_RUNTIME_')) return
    Promise.resolve(runtime.handle(message)).then(
      (value) => sendResponse({ ok: true, value }),
      (error) => sendResponse({ ok: false, error: String(error?.message || error).slice(0, 500) }),
    )
    return true
  })
}

if (!window.headlessWebMCPPost && typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  const postTool = new WebMCPPostTool()
  window.headlessWebMCPPost = postTool
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type?.startsWith('WEBMCP_POST_')) return
    Promise.resolve(postTool.handle(message)).then(
      (value) => sendResponse({ ok: true, value }),
      (error) => sendResponse({ ok: false, error: String(error?.message || error).slice(0, 500) }),
    )
    return true
  })
}

if (!window.headlessRecorder) {
  window.headlessRecorder = new HeadlessController({
    overlay: new Overlay({ store }),
    recorder: new Recorder({ store }),
    store,
  })

  window.headlessRecorder.init()
}
