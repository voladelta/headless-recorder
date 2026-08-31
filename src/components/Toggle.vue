<template>
  <button
    type="button"
    class="toggle-field"
    role="switch"
    :aria-checked="modelValue"
    @click="toggle"
  >
    <span class="toggle" :class="modelValue ? 'toggle--on' : 'toggle--off'" aria-hidden="true">
      <span class="toggle__thumb" :class="{ 'toggle__thumb--on': modelValue }"></span>
    </span>
    <span class="toggle-field__label">
      <span class="toggle-field__text">
        <slot />
      </span>
    </span>
  </button>
</template>

<script>
export default {
  name: 'Toggle',
  props: { modelValue: { type: Boolean, default: true } },

  setup(props, context) {
    function toggle() {
      context.emit('update:modelValue', !props.modelValue)
    }

    return { toggle }
  },
}
</script>

<style scoped>
.toggle-field {
  display: flex;
  width: 100%;
  align-items: center;
  margin-bottom: 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: start;
}

.toggle-field:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.toggle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 2rem;
  height: 1rem;
  border: 2px solid transparent;
  border-radius: 2147483647px;
}

.toggle--on {
  background: var(--color-accent-solid);
}

.toggle--off {
  background: var(--color-control-muted);
}

.toggle__thumb {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  margin: 1px;
  pointer-events: none;
  border-radius: 2147483647px;
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-sm);
  translate: 0;
}

.toggle__thumb--on {
  translate: 1rem;
}

.toggle-field__label {
  margin-inline-start: 1rem;
}

.toggle-field__text {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

@media (hover: hover) and (pointer: fine) {
  .toggle-field:hover .toggle-field__text {
    color: var(--color-text-primary);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .toggle {
    transition: background-color 200ms var(--ease-in-out);
  }

  .toggle__thumb {
    transition: translate 200ms var(--ease-in-out);
  }
}
</style>
