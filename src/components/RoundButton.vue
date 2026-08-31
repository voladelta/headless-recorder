<template>
  <button
    type="button"
    class="round-button"
    :class="{ 'round-button--small': small, 'round-button--medium': medium }"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    small: { type: Boolean, default: false },
    medium: { type: Boolean, default: false },
    big: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.round-button {
  border: 4px solid var(--color-gray-light);
  border-radius: 2147483647px;
  background: var(--color-bg-surface);
  padding: 0.5rem;
}

.round-button--small {
  height: 36px;
  width: 36px;
}

.round-button--medium {
  height: 72px;
  width: 72px;
}

.round-button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .round-button:hover {
    background: var(--color-bg-page);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .round-button {
    transition: transform 120ms var(--ease-in-out);
  }

  .round-button:active:not(:disabled) {
    transform: scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .round-button {
    transition: transform 80ms var(--ease-in-out);
  }

  .round-button:active:not(:disabled) {
    transform: scale(0.98);
  }
}
</style>
