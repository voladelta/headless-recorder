<template>
  <main class="options">
    <nav class="options__nav">
      <a href="https://github.com/voladelta/headless-recorder#readme" target="_blank">Docs</a>
      <a href="https://github.com/voladelta/headless-recorder" target="_blank">GitHub</a>
      <a href="https://github.com/voladelta/headless-recorder/blob/main/CHANGELOG.md"
        >Release notes</a
      >
    </nav>
    <div class="options__content">
      <header class="options__header">
        <div class="options__brand">
          <h1 class="options__title">Headless Recorder</h1>
          <span class="options__version">v{{ version }}</span>
        </div>
        <span role="alert" class="options__saving" v-show="saving">Saving...</span>
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
            @change="save"
            placeholder="your custom data-* attribute"
          />
          <p>
            Define an attribute that we'll attempt to use when selecting the elements, i.e
            "data-custom". This is handy when React or Vue based apps generate random class names.
          </p>
          <p>
            <span role="img" aria-label="siren">🚨</span>
            <span class="options__notice"
              >When <span class="options__term">"custom data attribute"</span>&nbsp; is set, it will
              take precedence from over any other selector (even ID)
            </span>
          </p>
        </div>
        <div>
          <label>Set key code</label>
          <div class="options__key-code">
            <Button @click="listenForKeyCodePress" class="options__key-code-button">
              {{ recordingKeyCodePress ? 'Capturing...' : 'Record Key Stroke' }}
            </Button>
            <span class="options__key-code-value">
              {{ options.code.keyCode }}
            </span>
          </div>
          <p>
            What key will be used for capturing input changes. The value here is the key code. This
            will not handle multiple keys.
          </p>
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
        <Toggle v-model="options.extension.darkMode">
          Use Dark Mode {{ options.extension.darkMode }}
        </Toggle>
        <Toggle v-model="options.extension.telemetry"> Allow recording of usage telemetry </Toggle>
        <p>
          We only record clicks for basic product development, no website content or input data.
          Data is never, ever shared with 3rd parties.
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
      saving: false,
      options: createDefaultOptions(),
      recordingKeyCodePress: false,
    }
  },

  watch: {
    options: {
      handler() {
        this.save()
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

  mounted() {
    this.load()
    chrome.storage.onChanged.addListener(({ options = null }) => {
      if (options && options.newValue.extension.darkMode !== this.options.extension.darkMode) {
        this.options.extension.darkMode = options.newValue.extension.darkMode
      }
    })
  },

  methods: {
    async save() {
      this.saving = true
      await storage.set({ options: this.options })

      setTimeout(() => (this.saving = false), 500)
    },

    async load() {
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

      this.loading = false
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
      this.save()
    },
  },
}
</script>

<style scoped>
.options {
  display: flex;
  width: 100%;
  height: 100vh;
  padding-block: 2.25rem;
  overflow: auto;
  background: var(--color-gray-lightest);
}

.options__nav {
  display: flex;
  width: 25%;
  flex-direction: column;
  padding-top: 3rem;
  padding-right: 1.5rem;
}

.options__content {
  display: flex;
  width: 50%;
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
  margin-right: 0.25rem;
  color: var(--color-blue);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 2rem;
}

.options__version {
  color: var(--color-gray-dark);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.options__saving {
  color: var(--color-gray-darkest);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5rem;
}

.options__field-group {
  margin-bottom: 1.5rem;
}

.options__input {
  width: 100%;
  height: 1.75rem;
  margin-bottom: 0.5rem;
  border-radius: 0.25rem;
  background: var(--color-gray-lighter);
  padding-inline: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.options__input::placeholder {
  color: var(--color-gray-darkish);
  opacity: 1;
}

.options__notice {
  margin-left: 0.25rem;
  color: var(--color-black-shady);
  font-weight: 700;
}

.options__term {
  font-style: italic;
}

.options__key-code {
  margin-bottom: 0.5rem;
}

.options__key-code-button {
  --button-color: var(--color-white);

  font-size: 0.875rem;
  line-height: 1.25rem;
}

.options__key-code-value {
  margin-left: 0.75rem;
  color: var(--color-gray-dark);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

code {
  font-weight: 600;
}

a {
  color: var(--color-blue);
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-align: right;
  text-decoration: underline;
}

h2 {
  margin-bottom: 1.25rem;
  color: var(--color-gray-darkish);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.75rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #000;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

section {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-gray-light);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 1rem 1rem 2.5rem;
}

p {
  margin-bottom: 0.5rem;
  color: var(--color-gray-darkish);
  font-size: 0.75rem;
  line-height: 1rem;
}

:global(.dark .options) {
  background: var(--color-black);
}

:global(.dark .options__version),
:global(.dark .options__key-code-value) {
  color: var(--color-gray-light);
}

:global(.dark .options__saving),
:global(.dark .options__notice),
:global(.dark .options p) {
  color: var(--color-white);
}

:global(.dark .options h2) {
  color: var(--color-gray-light);
}

:global(.dark .options label) {
  color: var(--color-gray-lightest);
}

:global(.dark .options section) {
  border-color: var(--color-gray-dark);
  background: var(--color-black-shady);
}
</style>
