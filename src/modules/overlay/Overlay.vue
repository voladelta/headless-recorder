<template>
  <nav
    aria-label="Recorder controls"
    v-show="!screenshotMode"
    :class="{
      'hr-event-recorded': hasRecorded && !isPaused && !isStopped,
      dark: darkMode,
      hide: !show,
    }"
  >
    <Transition name="hr-state" mode="out-in">
      <div v-if="isStopped" key="finished" class="hr-state hr-state--finished">
        <div class="hr-success-message">
          <h2>Recording finished</h2>
          <p>Copy the generated code or restart the recording.</p>
        </div>
        <div class="hr-success-bar">
          <button
            type="button"
            @click="copy"
            class="hr-btn-large hr-btn-copy"
            :disabled="copyStatus === 'copying'"
          >
            <Transition name="hr-copy" mode="out-in">
              <span :key="copyStatus" class="hr-btn-content">
                <img
                  v-if="copyStatus === 'idle' || copyStatus === 'error'"
                  width="16"
                  height="16"
                  :src="getIcon('duplicate')"
                  alt=""
                  aria-hidden="true"
                />
                {{ copyButtonLabel }}
              </span>
            </Transition>
          </button>
          <button type="button" @click="requestRestart" class="hr-btn-large">
            <img width="16" height="16" :src="getIcon('sync')" alt="" aria-hidden="true" />
            Restart recording
          </button>
          <button type="button" @click="close" class="hr-btn-close" aria-label="Close recorder">
            &times;
          </button>
        </div>
        <p v-if="copyStatus === 'error'" class="hr-copy-error" role="alert">
          Unable to copy. Check clipboard permission and try again.
        </p>
        <span class="hr-sr-only" role="status">{{ copyStatusMessage }}</span>
      </div>
      <div v-else key="recording" class="hr-state hr-state--recording">
        <div class="hr-rec" v-show="!isPaused">
          <span class="hr-red-dot" aria-hidden="true"></span>
          <span aria-hidden="true">REC</span>
          <span class="hr-sr-only">Recording</span>
        </div>
        <span class="hr-shortcut">Alt+K to hide</span>
        <button
          type="button"
          class="hr-btn"
          aria-label="Stop recording"
          @click="stop"
          v-tippy="{ content: 'Stop recording', appendTo: 'parent' }"
        >
          <div class="hr-stop-square" aria-hidden="true"></div>
        </button>
        <button
          type="button"
          class="hr-btn"
          :aria-label="isPaused ? 'Resume recording' : 'Pause recording'"
          @click="pause"
          v-tippy="{
            content: isPaused ? 'Resume recording' : 'Pause recording',
            appendTo: 'parent',
          }"
        >
          <img
            v-show="isPaused"
            width="27"
            height="27"
            :src="getIcon('play')"
            alt=""
            aria-hidden="true"
          />
          <img
            v-show="!isPaused"
            width="27"
            height="27"
            :src="getIcon('pause')"
            alt=""
            aria-hidden="true"
          />
        </button>
        <div class="hr-separator" aria-hidden="true"></div>
        <button
          type="button"
          :disabled="isPaused"
          class="hr-btn-big"
          aria-label="Take full-page screenshot"
          @click.prevent="fullScreenshot"
          v-tippy="{ content: 'Full-page screenshot (Alt+Shift+F)', appendTo: 'parent' }"
        >
          <img width="27" height="27" :src="getIcon('screen')" alt="" aria-hidden="true" />
        </button>
        <button
          type="button"
          :disabled="isPaused"
          class="hr-btn-big"
          aria-label="Take element screenshot"
          @click.prevent="clippedScreenshot"
          v-tippy="{ content: 'Element screenshot (Alt+Shift+E)', appendTo: 'parent' }"
        >
          <img width="27" height="27" :src="getIcon('clip')" alt="" aria-hidden="true" />
        </button>
        <div class="hr-separator" aria-hidden="true"></div>
        <span class="hr-current-selector">
          {{ currentSelector }}
        </span>
      </div>
    </Transition>
  </nav>

  <dialog
    ref="restartDialog"
    class="hr-restart-dialog"
    :class="{ dark: darkMode }"
    aria-labelledby="hr-restart-dialog-title"
    aria-describedby="hr-restart-dialog-description"
  >
    <h2 id="hr-restart-dialog-title">Restart recording?</h2>
    <p id="hr-restart-dialog-description">Your current recording will be deleted.</p>
    <div class="hr-restart-dialog-actions">
      <button type="button" autofocus @click="closeRestartDialog">Cancel</button>
      <button type="button" class="hr-restart-confirm" @click="confirmRestart">
        Restart recording
      </button>
    </div>
  </dialog>
</template>

<script>
import { directive } from 'vue-tippy'
import 'tippy.js/dist/tippy.css'

import { mapState, mapMutations } from 'vuex'

export default {
  name: 'Overlay',
  directives: { tippy: directive },

  data() {
    return {
      currentSelector: '',
      show: true,
    }
  },

  computed: {
    ...mapState([
      'isPaused',
      'isStopped',
      'screenshotMode',
      'darkMode',
      'hasRecorded',
      'copyStatus',
      'recording',
    ]),

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

  mounted() {
    window.document.body.addEventListener('keyup', this.keyupListener, false)
  },

  beforeUnmount() {
    window.document.body.removeEventListener('keyup', this.keyupListener, false)
  },

  methods: {
    ...mapMutations(['copy', 'stop', 'close']),

    requestRestart() {
      this.$refs.restartDialog.showModal()
    },

    closeRestartDialog() {
      this.$refs.restartDialog.close()
    },

    confirmRestart() {
      this.closeRestartDialog()
      this.$store.commit('restart')
    },

    getIcon(icon) {
      return browser.runtime.getURL(`icons/${this.darkMode ? 'dark' : 'light'}/${icon}.svg`)
    },

    toggle() {
      this.show = !this.show
    },

    pause() {
      if (this.isPaused) {
        this.$store.commit('unpause')
      } else {
        this.$store.commit('pause')
      }
    },

    fullScreenshot() {
      this.$store.commit('startScreenshotMode', false)
    },

    clippedScreenshot() {
      this.$store.commit('startScreenshotMode', true)
    },

    keyupListener(e) {
      if (!e.altKey) {
        return
      }

      if (e.key === 'k') {
        this.toggle()
      }

      if (e.key === 'F') {
        this.fullScreenshot()
      }

      if (e.key === 'E') {
        this.clippedScreenshot()
      }
    },
  },
}
</script>

<style lang="scss">
@import '../../assets/animations.css';

$namespace: 'hr';

#headless-recorder-overlay {
  --hr-bg: #f9fafc;
  --hr-bg-control: #eff2f7;
  --hr-bg-control-hover: #e0e6ed;
  --hr-border: #e0e6ed;
  --hr-text: #1f2d3d;
  --hr-text-secondary: #3c4858;
  --hr-text-muted: #677281;
  --hr-focus-ring: #005f99;
  --hr-recording: #d52b2b;
  --hr-on-danger: #fff;
  --hr-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  .#{$namespace}-button-open {
    position: fixed;
    bottom: 10px;
    inset-inline: 0;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    margin: 0;
    padding: 0;
    overflow: visible;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    line-height: normal;
    margin-inline-end: 10px;
  }

  button:focus-visible {
    outline: 2px solid var(--hr-focus-ring);
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .#{$namespace}-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    border: 0;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  nav {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    z-index: 2147483647;
    position: fixed;
    bottom: 10px;
    inset-inline: 0;
    width: min(828px, calc(100vw - 20px));
    min-height: 72px;
    height: auto;
    margin-inline: auto;
    border: solid 2px var(--hr-bg);
    border-radius: 6px;
    background: var(--hr-bg);
    padding: 20px 16px;
    color: var(--hr-text);
    box-shadow: 0 5px 25px rgb(0 0 0 / 15%);
    font-family: sans-serif;
    font-size: 12px;

    &.#{$namespace}-event-recorded {
      border: solid 2px #45c8f1 !important;
    }

    .#{$namespace}-state {
      display: flex;
      width: 100%;
      min-width: 0;
      align-items: center;
    }

    .#{$namespace}-state--finished {
      flex-wrap: wrap;
    }

    button {
      &.#{$namespace}-btn-big {
        min-width: 57px;
        min-height: 37px;
        padding: 5px 15px;
        background: var(--hr-bg-control);
        border-radius: 3px;
      }

      &.#{$namespace}-btn {
        min-width: 34px;
        min-height: 34px;
        padding: 5px 0;
      }

      &.#{$namespace}-btn-large {
        min-height: 40px;
        margin-inline-end: 0;
        border-radius: 3px;
        background: var(--hr-bg-control);
        padding: 9px 17px 9px 8px;
        color: var(--hr-text);
        font-weight: 600;

        img {
          margin-inline-end: 8px;
        }
      }

      &.#{$namespace}-btn-copy {
        min-width: 151px;
      }

      &.#{$namespace}-btn-close {
        min-width: 32px;
        min-height: 32px;
        margin-inline-end: 0;
        color: var(--hr-text);
        font-size: 20px;
      }
    }

    .#{$namespace}-btn-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .#{$namespace}-shortcut {
      position: absolute;
      inset-block-start: 4px;
      inset-inline-end: 4px;
      margin-inline-end: 0;
      color: var(--hr-text-muted);
      font-family: sans-serif;
    }

    .#{$namespace}-rec {
      position: absolute;
      inset-block-start: 4px;
      inset-inline-start: 4px;
      color: var(--hr-recording);
      font-family: sans-serif;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;

      .#{$namespace}-red-dot {
        display: inline-block;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--hr-recording);
      }
    }

    .#{$namespace}-separator {
      width: 1px;
      height: 32px;
      margin-inline-end: 0.8rem;
      background: var(--hr-border);
    }

    .#{$namespace}-stop-square {
      width: 24px;
      height: 24px;
      border-radius: 3px;
      background-color: var(--hr-text);
    }

    .#{$namespace}-current-selector {
      min-width: 0;
      flex: 1;
      overflow-wrap: anywhere;
      font-family: monospace;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
    }

    .#{$namespace}-success-bar {
      display: flex;
      width: 60%;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .#{$namespace}-success-message {
      width: 40%;

      h2 {
        margin: 0;
        color: var(--hr-text);
        font-size: 14px;
        font-weight: 600;
      }

      p {
        margin: 0;
        color: var(--hr-text-secondary);
        font-size: 12px;
      }
    }

    .#{$namespace}-copy-error {
      width: 100%;
      margin: 0.5rem 0 0;
      color: var(--hr-recording);
      font-size: 12px;
      line-height: 1.4;
    }

    .tippy-box {
      margin-top: -45px;
      border-radius: 4px;
      background: var(--hr-bg);
      color: var(--hr-text);
      box-shadow: 0 5px 25px rgb(0 0 0 / 15%);
    }

    .tippy-arrow {
      color: var(--hr-bg);
    }
  }

  nav.dark {
    --hr-bg: #161616;
    --hr-bg-control: #2e2e2e;
    --hr-bg-control-hover: #474747;
    --hr-border: #474747;
    --hr-text: #f9fafc;
    --hr-text-secondary: #e0e6ed;
    --hr-text-muted: #e0e6ed;
    --hr-focus-ring: #45c8f1;
    --hr-recording: #ff6b6b;

    border-color: var(--hr-bg);
  }

  nav.hide {
    transform: translateY(calc(100% + 10px)) !important;
  }

  .#{$namespace}-restart-dialog {
    box-sizing: border-box;
    width: min(22rem, calc(100% - 2rem));
    border: 1px solid var(--hr-border);
    border-radius: 6px;
    background: var(--hr-bg);
    padding: 1rem;
    color: var(--hr-text);
    box-shadow: 0 12px 40px rgb(0 0 0 / 25%);
    font-family: sans-serif;

    &.dark {
      --hr-bg: #161616;
      --hr-bg-control: #2e2e2e;
      --hr-border: #474747;
      --hr-text: #f9fafc;
      --hr-text-secondary: #e0e6ed;
      --hr-focus-ring: #45c8f1;
      --hr-recording: #ff6b6b;
      --hr-on-danger: #161616;
    }

    &::backdrop {
      background: rgb(0 0 0 / 45%);
    }

    h2 {
      margin: 0 0 0.5rem;
      color: var(--hr-text);
      font-size: 18px;
      line-height: 1.3;
    }

    p {
      margin: 0;
      color: var(--hr-text-secondary);
      font-size: 14px;
      line-height: 1.5;
    }

    button {
      min-height: 40px;
      margin-inline-end: 0;
      border: 1px solid var(--hr-border);
      border-radius: 3px;
      background: var(--hr-bg-control);
      padding-inline: 14px;
      color: var(--hr-text);
      font-weight: 600;
    }

    .#{$namespace}-restart-confirm {
      border-color: var(--hr-recording);
      background: var(--hr-recording);
      color: var(--hr-on-danger);
    }
  }

  .#{$namespace}-restart-dialog-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  @media (hover: hover) and (pointer: fine) {
    nav button.#{$namespace}-btn-large:hover,
    nav button.#{$namespace}-btn-big:hover {
      background: var(--hr-bg-control-hover);
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    nav {
      animation: slideup 300ms var(--hr-ease-in-out) 1;
      transition:
        transform 100ms ease,
        border-color 100ms linear;
    }

    nav .#{$namespace}-rec {
      animation: pulse 2s infinite;
    }

    .#{$namespace}-state-enter-active {
      transition:
        opacity 200ms var(--hr-ease-in-out),
        transform 200ms var(--hr-ease-in-out);
    }

    .#{$namespace}-state-leave-active,
    .#{$namespace}-copy-enter-active,
    .#{$namespace}-copy-leave-active {
      transition:
        opacity 150ms var(--hr-ease-in-out),
        transform 150ms var(--hr-ease-in-out);
    }

    .#{$namespace}-state-enter-from,
    .#{$namespace}-state-leave-to,
    .#{$namespace}-copy-enter-from,
    .#{$namespace}-copy-leave-to {
      opacity: 0;
      transform: scale(0.97);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    nav {
      animation: flash 100ms var(--hr-ease-in-out) 1;
      transition: border-color 100ms linear;
    }

    .#{$namespace}-state-enter-active,
    .#{$namespace}-state-leave-active,
    .#{$namespace}-copy-enter-active,
    .#{$namespace}-copy-leave-active {
      transition: opacity 100ms var(--hr-ease-in-out);
    }

    .#{$namespace}-state-enter-from,
    .#{$namespace}-state-leave-to,
    .#{$namespace}-copy-enter-from,
    .#{$namespace}-copy-leave-to {
      opacity: 0;
    }
  }

  @media (max-width: 40rem) {
    nav {
      padding-block: 1rem;
    }

    nav .#{$namespace}-state {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    nav .#{$namespace}-shortcut,
    nav .#{$namespace}-separator,
    nav .#{$namespace}-current-selector {
      display: none;
    }

    nav .#{$namespace}-success-message,
    nav .#{$namespace}-success-bar {
      width: 100%;
    }

    nav .#{$namespace}-success-bar {
      flex-wrap: wrap;
      justify-content: flex-start;
    }
  }
}
</style>
