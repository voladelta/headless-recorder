<template>
  <button class="button" :class="dark ? 'button--dark' : 'button--primary'">
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
  color: var(--button-color, var(--color-gray-darkest));
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1rem;
}

.button--primary {
  background: var(--color-blue);
}

.button--dark {
  --button-color: var(--color-white);

  background: var(--color-gray-dark);
}

@media (hover: hover) {
  .button--primary:hover {
    background: var(--color-blue-dark);
  }

  .button--dark:hover {
    background: var(--color-gray-darkest);
  }
}
</style>
