<template>
  <div class="popup">
    <Header
      :dark-mode="options?.extension?.darkMode"
      @options="openOptions"
      @help="goHelp"
      @dark="toggleDarkMode"
    />

    <main class="popup__main">
      <Home v-if="!showResultsTab && !isRecording" @start="toggleRecord" />

      <Recording
        v-else-if="!showResultsTab"
        @stop="toggleRecord"
        @pause="togglePause"
        @restart="requestRestart(true)"
        :is-recording="isRecording"
        :is-paused="isPaused"
        :dark-mode="options?.extension?.darkMode"
      />

      <Transition name="results" mode="out-in">
        <div v-if="showResultsTab" class="results-shell">
          <Results :code="code" />

          <div data-test-id="results-footer" class="results-footer">
            <Button dark @click="requestRestart()" v-show="code">
              <img
                src="/icons/dark/sync.svg"
                class="results-footer__icon"
                alt=""
                aria-hidden="true"
              />
              Restart recording
            </Button>
            <Button
              dark
              class="results-footer__button--copy"
              @click="copyCode"
              :disabled="isCopying"
              v-show="code"
            >
              <Transition name="button-content" mode="out-in">
                <span :key="copyStatus" class="results-footer__button-content">
                  <img
                    v-if="copyStatus === 'idle' || copyStatus === 'error'"
                    src="/icons/dark/duplicate.svg"
                    class="results-footer__icon"
                    alt=""
                    aria-hidden="true"
                  />
                  {{ copyButtonLabel }}
                </span>
              </Transition>
            </Button>
            <p v-if="copyError" class="results-footer__error" role="alert">
              {{ copyError }}
            </p>
            <span class="sr-only" role="status">{{ copyStatusMessage }}</span>
          </div>
        </div>
      </Transition>
    </main>

    <WebMCPRuntimePanel v-if="!isRecording" />
    <WebMCPPostPanel v-if="!isRecording" />

    <Footer v-if="!isRecording && !showResultsTab" />

    <dialog
      ref="restartDialog"
      class="restart-dialog"
      aria-labelledby="restart-dialog-title"
      aria-describedby="restart-dialog-description"
    >
      <h2 id="restart-dialog-title">Restart recording?</h2>
      <p id="restart-dialog-description">
        Your current recording and generated code will be deleted.
      </p>
      <div class="restart-dialog__actions">
        <button type="button" class="restart-dialog__cancel" autofocus @click="closeRestartDialog">
          Cancel
        </button>
        <button type="button" class="restart-dialog__confirm" @click="confirmRestart">
          Restart recording
        </button>
      </div>
    </dialog>
  </div>
</template>

<script>
import browser from '@/services/browser'
import storage from '@/services/storage'
import analytics from '@/services/analytics'
import { popupActions, isDarkMode } from '@/services/constants'

import CodeGenerator from '@/modules/code-generator'

import Home from '@/views/Home.vue'
import Results from '@/views/Results.vue'
import Recording from '@/views/Recording.vue'

import Button from '@/components/Button.vue'
import Footer from '@/components/Footer.vue'
import Header from '@/components/Header.vue'
import WebMCPPostPanel from '@/popup/WebMCPPostPanel.vue'
import WebMCPRuntimePanel from '@/popup/WebMCPRuntimePanel.vue'

let bus

const defaultOptions = {
  extension: {
    darkMode: isDarkMode(),
  },
  code: {},
}

export default {
  name: 'PopupApp',
  components: {
    Results,
    Recording,
    Home,
    Header,
    Footer,
    Button,
    WebMCPPostPanel,
    WebMCPRuntimePanel,
  },

  data() {
    return {
      showResultsTab: false,
      isRecording: false,
      isPaused: false,
      copyStatus: 'idle',
      copyError: '',
      copyResetTimer: null,
      pendingRestartStop: false,
      liveEvents: [],
      recording: [],

      code: '',
      options: defaultOptions,
    }
  },

  watch: {
    'options.extension.darkMode': {
      handler(newVal) {
        document.body.classList[newVal ? 'add' : 'remove']('dark')
      },
      immediate: true,
    },
  },

  computed: {
    isCopying() {
      return this.copyStatus === 'copying'
    },

    copyButtonLabel() {
      return {
        idle: 'Copy to clipboard',
        copying: 'Copying…',
        success: 'Copied',
        error: 'Copy again',
      }[this.copyStatus]
    },

    copyStatusMessage() {
      return {
        idle: '',
        copying: 'Copying code…',
        success: 'Code copied.',
        error: '',
      }[this.copyStatus]
    },
  },

  async mounted() {
    this.loadState()
    bus = browser.getBackgroundBus()
  },

  beforeUnmount() {
    window.clearTimeout(this.copyResetTimer)
  },

  methods: {
    toggleRecord(close = true) {
      if (this.isRecording) {
        this.stop()
      } else {
        if (close) {
          window.close()
        }
        this.start()
      }

      this.isRecording = !this.isRecording
      this.storeState()
    },

    togglePause(stop = false) {
      bus.postMessage({ action: this.isPaused ? popupActions.UN_PAUSE : popupActions.PAUSE, stop })
      this.isPaused = !this.isPaused

      this.storeState()
    },

    start() {
      analytics.trackEvent({ options: this.options, event: 'Start' })
      this.cleanUp()
      bus.postMessage({ action: popupActions.START })
    },

    async stop() {
      analytics.trackEvent({ options: this.options, event: 'Stop' })
      bus.postMessage({ action: popupActions.STOP })

      await this.generateCode()
      this.storeState()
    },

    requestRestart(stop = false) {
      this.pendingRestartStop = stop
      this.$refs.restartDialog.showModal()
    },

    closeRestartDialog() {
      this.$refs.restartDialog.close()
    },

    confirmRestart() {
      const stop = this.pendingRestartStop
      this.closeRestartDialog()
      this.restart(stop)
    },

    restart(stop = false) {
      this.cleanUp()
      bus.postMessage({ action: popupActions.CLEAN_UP, value: stop })
    },

    cleanUp() {
      this.recording = this.liveEvents = []
      this.code = ''
      this.showResultsTab = this.isRecording = this.isPaused = false
      this.storeState()
    },

    async generateCode() {
      const { recording, options = { code: {} } } = await storage.get(['recording', 'options'])
      const generator = new CodeGenerator(options.code)

      this.recording = recording
      this.code = generator.generate(recording)
      this.showResultsTab = true
    },

    openOptions() {
      analytics.trackEvent({ options: this.options, event: 'Options' })
      browser.openOptionsPage()
    },

    async loadState() {
      const {
        controls = {},
        code = '',
        options,
        recording,
        clear,
        pause,
        restart,
      } = await storage.get([
        'controls',
        'code',
        'options',
        'recording',
        'clear',
        'pause',
        'restart',
      ])

      this.isRecording = controls.isRecording
      this.isPaused = controls.isPaused
      this.options = options || defaultOptions

      this.code = code

      if (this.isRecording) {
        this.liveEvents = recording

        if (clear) {
          this.toggleRecord()
          storage.remove(['clear'])
        }

        if (pause) {
          this.togglePause(true)
          storage.remove(['pause'])
        }

        if (restart) {
          this.cleanUp()
          this.toggleRecord(false)
          storage.remove(['restart'])
        }
      } else if (this.code) {
        this.generateCode()
      }
    },

    storeState() {
      storage.set({
        code: this.code,
        controls: { isRecording: this.isRecording, isPaused: this.isPaused },
      })
    },

    async copyCode() {
      window.clearTimeout(this.copyResetTimer)
      this.copyStatus = 'copying'
      this.copyError = ''

      try {
        await browser.copyToClipboard(this.getCode())
        this.copyStatus = 'success'
        this.copyResetTimer = window.setTimeout(() => (this.copyStatus = 'idle'), 1500)
      } catch {
        this.copyStatus = 'error'
        this.copyError = 'Unable to copy. Check clipboard permission and try again.'
      }
    },

    goHelp() {
      browser.openHelpPage()
    },

    toggleDarkMode() {
      this.options.extension.darkMode = !this.options.extension.darkMode
      storage.set({ options: this.options })
    },

    getCode() {
      return this.code
    },
  },
}
</script>

<style>
html {
  width: 386px;
  min-height: 535px;
  max-height: 600px;
}

.popup {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--color-bg-page);
}

.popup__main {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.results-shell {
  display: flex;
  flex-direction: column;
}

.results-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--color-black-shady);
}

.results-footer__button--copy {
  width: 8.6rem;
}

.results-footer__button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.results-footer__icon {
  margin-inline-end: 0.25rem;
}

.results-footer__error {
  width: 100%;
  color: #ffb4b4;
  font-size: 0.75rem;
  line-height: 1rem;
}

.popup button:focus-visible,
.restart-dialog button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.restart-dialog {
  width: min(22rem, calc(100% - 2rem));
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 1rem;
  color: var(--color-text-primary);
  box-shadow: 0 12px 40px rgb(0 0 0 / 25%);
}

.restart-dialog::backdrop {
  background: rgb(0 0 0 / 45%);
}

.restart-dialog h2 {
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}

.restart-dialog p {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.restart-dialog__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.restart-dialog__actions button {
  min-height: 2.5rem;
  border-radius: var(--radius-sm);
  padding-inline: 0.875rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.restart-dialog__cancel {
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-surface);
}

.restart-dialog__confirm {
  background: var(--color-status-recording);
  color: var(--color-text-on-danger);
}

@media (prefers-reduced-motion: no-preference) {
  .results-enter-active {
    transition:
      opacity 200ms var(--ease-in-out),
      transform 200ms var(--ease-in-out);
  }

  .results-leave-active {
    transition:
      opacity 150ms var(--ease-in-out),
      transform 150ms var(--ease-in-out);
  }

  .results-enter-from,
  .results-leave-to,
  .button-content-enter-from,
  .button-content-leave-to {
    opacity: 0;
    transform: scale(0.97);
  }

  .button-content-enter-active,
  .button-content-leave-active {
    transition:
      opacity 150ms var(--ease-in-out),
      transform 150ms var(--ease-in-out);
  }
}

@media (prefers-reduced-motion: reduce) {
  .results-enter-active,
  .results-leave-active,
  .button-content-enter-active,
  .button-content-leave-active {
    transition: opacity 100ms var(--ease-in-out);
  }

  .results-enter-from,
  .results-leave-to,
  .button-content-enter-from,
  .button-content-leave-to {
    opacity: 0;
  }
}
</style>
