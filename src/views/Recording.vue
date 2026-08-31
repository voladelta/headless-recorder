<template>
  <section class="recording">
    <RecordingLabel class="recording__status" :is-paused="isPaused" :v-show="isRecording" />
    <p class="recording__description">Headless recorder currently recording your browser events.</p>
    <RoundButton big @click="$emit('stop')" class="recording__stop-button">
      <div class="recording__stop-icon"></div>
    </RoundButton>

    <div class="recording__controls">
      <div class="recording__control recording__control--spaced">
        <RoundButton medium @click="$emit('pause')" class="recording__control-button">
          <img
            :src="`/icons/${darkMode ? 'dark' : 'light'}/play.svg`"
            v-show="isPaused"
            class="recording__control-icon"
            alt="resume recording"
          />
          <img
            :src="`/icons/${darkMode ? 'dark' : 'light'}/pause.svg`"
            v-show="!isPaused"
            class="recording__control-icon"
            alt="pause recording"
          />
        </RoundButton>
        <span class="recording__control-label">{{ isPaused ? 'RESUME' : 'PAUSE' }}</span>
      </div>
      <div class="recording__control">
        <RoundButton medium @click="$emit('restart')" class="recording__control-button">
          <img
            :src="`/icons/${darkMode ? 'dark' : 'light'}/sync.svg`"
            class="recording__control-icon"
            alt="restart recording"
          />
        </RoundButton>
        <span class="recording__control-label">RESTART</span>
      </div>
    </div>
  </section>
</template>

<script>
import RoundButton from '@/components/RoundButton.vue'
import RecordingLabel from '@/components/RecordingLabel.vue'

export default {
  components: { RoundButton, RecordingLabel },

  props: {
    darkMode: { type: Boolean, default: false },
    isRecording: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.recording {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  border-radius: var(--radius-md);
  padding-top: 2rem;
}

.recording__status {
  width: 33.3333%;
}

.recording__description {
  width: 18rem;
  color: var(--color-gray-dark);
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-align: center;
}

.recording__stop-button {
  margin-top: 2.5rem;
  padding: 3rem;
}

.recording__stop-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 0.25rem;
  background: var(--color-gray-darkest);
}

.recording__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 3.188rem;
  margin-bottom: 2rem;
}

.recording__control {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.recording__control--spaced {
  margin-right: 2.5rem;
}

.recording__control-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.recording__control-icon {
  width: 2.5rem;
  height: 2.5rem;
}

.recording__control-label {
  margin-top: 0.5rem;
  color: var(--color-gray-new);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

:global(.dark .recording__description) {
  color: var(--color-gray-light);
}

:global(.dark .recording__stop-icon) {
  background: var(--color-white);
}
</style>
