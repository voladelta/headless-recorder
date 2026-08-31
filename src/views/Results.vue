<template>
  <div
    data-test-id="results-tab"
    class="flex flex-col bg-blue-light overflow-hidden mt-4 h-100 dark:bg-black"
  >
    <div class="sc p-2 bg-black dark:bg-black-shady">
      <pre
        v-if="code"
        v-highlightjs="code"
        class="overflow-auto bg-black dark:bg-black-shady h-100"
      >
      <code ref="code" class="javascript bg-black dark:bg-black-shady px-2 break-word whitespace-pre-wrap overflow-x-hidden"></code>
      </pre>
      <pre v-else>
        <code>No code yet...</code>
      </pre>
    </div>
  </div>
</template>
<script>
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'

hljs.registerLanguage('javascript', javascript)

function highlight(element, code) {
  const codeElement = element.querySelector('code')
  codeElement.textContent = code
  codeElement.removeAttribute('data-highlighted')
  hljs.highlightElement(codeElement)
}

export default {
  name: 'ResultsTab',

  directives: {
    highlightjs: {
      mounted(element, { value }) {
        highlight(element, value)
      },
      updated(element, { value }) {
        highlight(element, value)
      },
    },
  },

  props: {
    code: {
      type: String,
      default: '',
    },
  },
}
</script>

<style scoped>
pre::-webkit-scrollbar {
  height: 8px;
  width: 8px;
  margin-right: 10px;
  padding: 10px;
  background: transparent;
}

pre::-webkit-scrollbar-thumb {
  margin-right: 10px;
  padding: 10px;
  background: #e0e6ed;
  border-radius: 0.5rem;
}

pre::-webkit-scrollbar-corner {
  background: yellow;
}
</style>
