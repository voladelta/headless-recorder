<template>
  <header class="header">
    <h1 class="header__title">Headless Recorder</h1>
    <div class="header__actions">
      <button
        type="button"
        @click="$emit('dark')"
        class="header__action"
        :aria-label="darkMode ? 'Use light mode' : 'Use dark mode'"
      >
        <img src="@/assets/icons/moon.svg" alt="" aria-hidden="true" class="header__icon" />
      </button>
      <button type="button" @click="$emit('help')" class="header__action" aria-label="Open help">
        <img src="@/assets/icons/question.svg" alt="" aria-hidden="true" class="header__icon" />
      </button>
      <button
        type="button"
        @click="$emit('options')"
        class="header__action"
        aria-label="Open settings"
      >
        <img src="@/assets/icons/gear.svg" alt="" aria-hidden="true" class="header__icon" />
      </button>
    </div>
  </header>
</template>

<script>
export default {
  props: {
    darkMode: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 1rem 1rem 0;
}

.header__title {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

.header__actions {
  display: flex;
  gap: 0.25rem;
}

.header__action {
  display: grid;
  min-width: 2rem;
  min-height: 2rem;
  place-items: center;
  border-radius: var(--radius-sm);
}

.header__icon {
  width: 1rem;
}

@media (hover: hover) and (pointer: fine) {
  .header__action:hover {
    background: var(--color-bg-sunken);
  }
}
</style>
