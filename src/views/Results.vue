<template>
  <div data-test-id="results-tab" class="results">
    <div class="results__content">
      <pre v-if="code" v-highlightjs="code" class="results__code-block">
      <code ref="code" class="javascript results__code"></code>
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
.results {
  display: flex;
  height: 27rem;
  flex-direction: column;
  margin-top: 1rem;
  overflow: hidden;
  background: var(--color-blue-light);
}

.results__content {
  padding: 0.5rem;
  background: var(--color-black);
}

.results__code-block {
  height: 27rem;
  overflow: auto;
  background: var(--color-black);
}

.results__code {
  white-space: pre-wrap;
}

:global(.dark .results) {
  background: var(--color-black);
}

:global(.dark .results__content),
:global(.dark .results__code-block) {
  background: var(--color-black-shady);
}

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
