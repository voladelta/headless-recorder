<template>
  <main class="options">
    <nav class="options__nav" aria-label="Resources">
      <a
        href="https://github.com/voladelta/headless-recorder#readme"
        target="_blank"
        rel="noopener noreferrer"
        >Documentation<span class="sr-only"> (opens in a new tab)</span></a
      >
      <a
        href="https://github.com/voladelta/headless-recorder"
        target="_blank"
        rel="noopener noreferrer"
        >GitHub<span class="sr-only"> (opens in a new tab)</span></a
      >
      <a
        href="https://github.com/voladelta/headless-recorder/blob/main/CHANGELOG.md"
        target="_blank"
        rel="noopener noreferrer"
        >Release notes<span class="sr-only"> (opens in a new tab)</span></a
      >
    </nav>
    <div class="options__content" :aria-busy="loading">
      <header class="options__header">
        <div class="options__brand">
          <h1 class="options__title">Headless Recorder</h1>
          <span class="options__version">v{{ version }}</span>
        </div>
        <div class="options__status">
          <Transition name="status" mode="out-in">
            <span
              v-if="saveStatusMessage"
              :key="saveStatus"
              class="options__saving"
              aria-hidden="true"
              >{{ saveStatusMessage }}</span
            >
          </Transition>
          <span class="options__error" role="alert">{{ saveError }}</span>
          <span class="sr-only" role="status">{{ saveStatusMessage }}</span>
        </div>
      </header>

      <section>
        <h2>Recorder</h2>
        <label for="custom-data-attribute">Custom data attribute</label>
        <div class="options__field-group">
          <input
            id="custom-data-attribute"
            class="options__input"
            type="text"
            v-model.trim="options.code.dataAttribute"
            placeholder="data-testid"
          />
          <p>
            Enter a data attribute that identifies elements, such as “data-testid”. This is useful
            when an application generates class names.
          </p>
          <p>
            <span class="options__notice">
              When set, this attribute takes priority over all other selectors, including ID.
            </span>
          </p>
        </div>
        <div>
          <h3 class="options__field-label">Capture key</h3>
          <div class="options__key-code">
            <Button @click="listenForKeyCodePress" class="options__key-code-button">
              {{ recordingKeyCodePress ? 'Press a key…' : 'Capture key' }}
            </Button>
            <kbd class="options__key-code-value">
              {{ options.code.keyCode }}
            </kbd>
          </div>
          <p>Press one key. This setting does not support key combinations.</p>
        </div>
      </section>

      <section>
        <h2>Playwright generator</h2>
        <p>Generate Playwright Test code with locator-based actions and automatic waiting.</p>
        <Toggle v-model="options.code.blankLinesBetweenBlocks">
          Add blank lines between code blocks
        </Toggle>
      </section>

      <section>
        <h2>Extension</h2>
        <Toggle v-model="options.extension.darkMode"> Use dark mode </Toggle>
        <Toggle v-model="options.extension.telemetry"> Share anonymous usage telemetry </Toggle>
        <p>
          Telemetry contains extension action names only. It does not include website content or
          input data.
        </p>
      </section>
    </div>
  </main>
</template>

<script>
import { version } from '../../package.json'

import storage from '@/services/storage'
import { isDarkMode } from '@/services/constants'
import { defaults as code } from '@/modules/code-generator'

import Button from '@/components/Button.vue'
import Toggle from '@/components/Toggle.vue'

const createDefaultOptions = () => ({
  code: { ...code },
  extension: {
    telemetry: true,
    darkMode: isDarkMode(),
  },
})

export default {
  name: 'OptionsApp',
  components: { Toggle, Button },

  data() {
    return {
      version,
      loading: true,
      saveStatus: 'idle',
      saveError: '',
      saveRevision: 0,
      saveResetTimer: null,
      storageChangeListener: null,
      options: createDefaultOptions(),
      recordingKeyCodePress: false,
    }
  },

  watch: {
    options: {
      handler() {
        if (!this.loading) {
          this.save()
        }
      },
      deep: true,
    },

    'options.extension.darkMode': {
      handler(newVal) {
        document.body.classList[newVal ? 'add' : 'remove']('dark')
      },
      immediate: true,
    },
  },

  computed: {
    saveStatusMessage() {
      return {
        idle: '',
        saving: 'Saving…',
        saved: 'Saved',
        error: '',
      }[this.saveStatus]
    },
  },

  mounted() {
    this.load()
    this.storageChangeListener = ({ options = null }) => {
      const darkMode = options?.newValue?.extension?.darkMode
      if (typeof darkMode === 'boolean' && darkMode !== this.options.extension.darkMode) {
        this.options.extension.darkMode = darkMode
      }
    }
    chrome.storage.onChanged.addListener(this.storageChangeListener)
  },

  beforeUnmount() {
    window.clearTimeout(this.saveResetTimer)
    chrome.storage.onChanged.removeListener?.(this.storageChangeListener)
  },

  methods: {
    async save() {
      const revision = ++this.saveRevision
      window.clearTimeout(this.saveResetTimer)
      this.saveStatus = 'saving'
      this.saveError = ''

      try {
        await storage.set({ options: this.options })

        if (revision !== this.saveRevision) {
          return
        }

        this.saveStatus = 'saved'
        this.saveResetTimer = window.setTimeout(() => {
          if (revision === this.saveRevision) {
            this.saveStatus = 'idle'
          }
        }, 1500)
      } catch {
        if (revision === this.saveRevision) {
          this.saveStatus = 'error'
          this.saveError = 'Unable to save. Try again.'
        }
      }
    },

    async load() {
      try {
        const { options = {} } = await storage.get('options')
        const defaults = createDefaultOptions()
        this.options = {
          code: {
            blankLinesBetweenBlocks:
              options.code?.blankLinesBetweenBlocks ?? defaults.code.blankLinesBetweenBlocks,
            dataAttribute: options.code?.dataAttribute ?? defaults.code.dataAttribute,
            keyCode: options.code?.keyCode ?? defaults.code.keyCode,
          },
          extension: { ...defaults.extension, ...options.extension },
        }
      } catch {
        this.saveStatus = 'error'
        this.saveError = 'Unable to load settings. Reload the page and try again.'
      } finally {
        await this.$nextTick()
        this.loading = false
      }
    },

    listenForKeyCodePress() {
      this.recordingKeyCodePress = true

      const keyDownFunction = (e) => {
        this.recordingKeyCodePress = false
        this.updateKeyCodeWithNumber(e)
        window.removeEventListener('keydown', keyDownFunction, false)
        e.preventDefault()
      }

      window.addEventListener('keydown', keyDownFunction, false)
    },

    updateKeyCodeWithNumber(evt) {
      this.options.code.keyCode = parseInt(evt.keyCode, 10)
    },
  },
}
</script>

<style scoped>
.options {
  display: grid;
  grid-template-columns: minmax(9rem, 12rem) minmax(0, 42rem);
  min-height: 100vh;
  gap: 1.5rem;
  justify-content: center;
  padding: 2.25rem 1rem;
  overflow: auto;
  background: var(--color-bg-page);
}

.options__nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-block-start: 3rem;
}

.options__content {
  display: flex;
  flex-direction: column;
}

.options__header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.options__brand {
  display: flex;
  align-items: baseline;
}

.options__title {
  margin-inline-end: 0.25rem;
  color: var(--color-accent-text);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 2rem;
}

.options__version {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.options__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.options__saving {
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5rem;
}

.options__error {
  max-width: 22rem;
  color: var(--color-status-recording);
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-align: end;
}

.options__error:empty {
  display: none;
}

.options__field-group {
  margin-bottom: 1.5rem;
}

.options__input {
  width: 100%;
  min-height: 2.5rem;
  margin-bottom: 0.5rem;
  border-radius: 0.25rem;
  background: var(--color-bg-sunken);
  color: var(--color-text-primary);
  padding-inline: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.options__input::placeholder {
  color: var(--color-text-secondary);
  opacity: 1;
}

.options__notice {
  color: var(--color-text-primary);
  font-weight: 700;
}

.options__key-code {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.options__key-code-button {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.options__key-code-value {
  margin-inline-start: 0.75rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

code {
  font-weight: 600;
}

a {
  color: var(--color-accent-text);
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-align: right;
  text-decoration: underline;
  text-decoration-skip-ink: auto;
  text-decoration-thickness: from-font;
  text-underline-position: from-font;
}

h2 {
  margin-bottom: 1.25rem;
  color: var(--color-text-secondary);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.75rem;
}

label,
.options__field-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

section {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 1rem 1rem 2.5rem;
}

p {
  margin-bottom: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  line-height: 1rem;
}

.options__input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: no-preference) {
  .status-enter-active {
    transition:
      opacity 150ms var(--ease-in-out),
      transform 150ms var(--ease-in-out);
  }

  .status-leave-active {
    transition:
      opacity 100ms var(--ease-in-out),
      transform 100ms var(--ease-in-out);
  }

  .status-enter-from,
  .status-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-enter-active,
  .status-leave-active {
    transition: opacity 100ms var(--ease-in-out);
  }

  .status-enter-from,
  .status-leave-to {
    opacity: 0;
  }
}

@media (max-width: 36rem) {
  .options {
    grid-template-columns: minmax(0, 1fr);
    padding-block: 1rem;
  }

  .options__nav {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    padding-block-start: 0;
  }

  .options__nav a {
    text-align: start;
  }
}
</style>
