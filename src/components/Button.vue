<template>
  <button type="button" class="button" :class="dark ? 'button--dark' : 'button--primary'">
    <slot />
  </button>
</template>

<script>
export default {
  name: 'Button',

  props: {
    dark: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  padding: 0.5rem;
  min-height: 2rem;
  color: var(--button-color, var(--color-text-on-accent));
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1rem;
}

.button--primary {
  background: var(--color-accent-solid);
}

.button--dark {
  --button-color: var(--color-text-inverse);

  background: var(--color-gray-dark);
}

.button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.button:disabled {
  cursor: wait;
  opacity: 0.7;
}

@media (hover: hover) and (pointer: fine) {
  .button--primary:hover {
    background: var(--color-accent-solid-hover);
  }

  .button--dark:hover {
    background: var(--color-gray-darkest);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .button {
    transition: transform 120ms var(--ease-in-out);
  }

  .button:active:not(:disabled) {
    transform: scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: transform 80ms var(--ease-in-out);
  }

  .button:active:not(:disabled) {
    transform: scale(0.98);
  }
}
</style>
