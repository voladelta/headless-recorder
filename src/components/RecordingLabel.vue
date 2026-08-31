<template>
  <div
    data-test-id="recording-badge"
    class="recording-label"
    :class="{
      'recording-label--paused': text === 'Paused',
      'recording-label--active': text !== 'Paused',
    }"
  >
    {{ text }}
  </div>
</template>

<script>
export default {
  name: 'RecordingLabel',
  props: {
    isPaused: { type: Boolean, default: false },
  },

  computed: {
    text() {
      return this.isPaused ? 'Paused' : 'Recording...'
    },
  },
}
</script>

<style scoped>
.recording-label {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-red);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 2rem;
}

.recording-label--paused {
  color: var(--color-yellow);
}

.recording-label--active {
  animation: recording-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes recording-pulse {
  50% {
    opacity: 0.5;
  }
}
</style>
