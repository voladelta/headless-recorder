<template>
  <div class="toggle-field">
    <button
      type="button"
      class="toggle"
      :class="modelValue ? 'toggle--on' : 'toggle--off'"
      role="switch"
      aria-checked="false"
      @click="toggle"
    >
      <span
        aria-hidden="true"
        class="toggle__thumb"
        :class="{ 'toggle__thumb--on': modelValue }"
      ></span>
    </button>
    <span class="toggle-field__label">
      <span class="toggle-field__text">
        <slot />
      </span>
    </span>
  </div>
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
  align-items: center;
  margin-bottom: 0.75rem;
}

.toggle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 2rem;
  height: 1rem;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 2147483647px;
  transition: background-color 200ms var(--ease-in-out);
}

.toggle--on {
  background: var(--color-blue);
}

.toggle--off {
  background: var(--color-gray);
}

.toggle:focus {
  outline: none;
  box-shadow:
    0 0 0 2px var(--color-white),
    0 0 0 4px var(--color-blue);
}

.toggle__thumb {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  margin: 1px;
  pointer-events: none;
  border-radius: 2147483647px;
  background: var(--color-white);
  box-shadow: var(--shadow-sm);
  translate: 0;
  transition: translate 200ms var(--ease-in-out);
}

.toggle__thumb--on {
  translate: 1rem;
}

.toggle-field__label {
  margin-left: 1rem;
}

.toggle-field__text {
  color: var(--color-gray-dark);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

:global(.dark .toggle-field__text) {
  color: var(--color-gray-light);
}
</style>
