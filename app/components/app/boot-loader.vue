<script setup lang="ts">
const props = defineProps<{
  status: "idle" | "loading" | "ready" | "error";
  error?: unknown;
}>();

const message = computed(() => {
  switch (props.status) {
    case "idle":
    case "loading":
      return "Cargando himnario…";
    case "error":
      return "No se pudo cargar el himnario";
    case "ready":
      return "";
    default:
      return "";
  }
});
</script>

<template>
  <Transition name="boot-fade">
    <div
      v-if="status !== 'ready'"
      class="boot-loader"
      role="status"
      aria-live="polite"
    >
      <div class="boot-loader__inner">
        <div class="boot-loader__logo">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              stroke-width="3"
              opacity="0.2"
            />
            <path
              d="M32 4 a28 28 0 0 1 0 56"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              fill="none"
              class="boot-loader__arc"
            />
          </svg>
        </div>
        <p class="boot-loader__text">
          {{ message }}
        </p>
        <p v-if="status === 'error'" class="boot-loader__hint">
          Verificá tu conexión y recargá la página.
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.boot-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: var(--color-base-100, #ffffff);
  color: var(--color-primary, #422ad5);
}

.boot-loader__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem;
  text-align: center;
}

.boot-loader__logo {
  display: inline-flex;
}

.boot-loader__arc {
  transform-origin: 50% 50%;
  animation: boot-spin 1.1s linear infinite;
}

.boot-loader__text {
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: currentColor;
  margin: 0;
}

.boot-loader__hint {
  font-size: 0.875rem;
  opacity: 0.7;
  margin: 0;
}

@keyframes boot-spin {
  to {
    transform: rotate(360deg);
  }
}

.boot-fade-leave-active {
  transition: opacity 280ms ease;
}

.boot-fade-leave-to {
  opacity: 0;
}
</style>
