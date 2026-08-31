<template>
  <div class="header">
    <h1 role="button" class="header__title">Headless Recorder</h1>
    <div class="header__actions">
      <button @click="$emit('dark')" class="header__action header__action--first">
        <img src="@/assets/icons/moon.svg" alt="help" class="header__icon" />
      </button>
      <button @click="$emit('help')" class="header__action">
        <img src="@/assets/icons/question.svg" alt="help" class="header__icon" />
      </button>
      <button @click="$emit('options')" class="header__action">
        <img src="@/assets/icons/gear.svg" alt="settings" class="header__icon" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 1rem 1rem 0;
}

.header__title {
  color: var(--color-gray-darkest);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

.header__actions {
  display: flex;
}

.header__action {
  margin-left: 0.5rem;
}

.header__action--first {
  margin-left: 1rem;
}

.header__icon {
  width: 1rem;
}

:global(.dark .header__title) {
  color: var(--color-gray-lightest);
}
</style>
