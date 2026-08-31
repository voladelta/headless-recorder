<template>
  <button
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
  background: var(--color-white);
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

:global(.dark .round-button) {
  border-color: var(--color-gray-dark);
  background: var(--color-black-shady);
}

@media (hover: hover) {
  .round-button:hover {
    background: var(--color-gray-lightest);
  }

  :global(.dark .round-button:hover) {
    background: var(--color-gray-hover);
  }
}
</style>
