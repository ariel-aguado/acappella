<script setup lang="ts">
const { show, applyUpdate } = useUpdateNotification();
</script>

<template>
  <Transition name="toast-slide">
    <div
      v-if="show"
      class="update-toast"
      role="status"
      aria-live="polite"
    >
      <div class="update-toast__icon">
        <Icon name="tabler:refresh" size="22" />
      </div>
      <div class="update-toast__text">
        <p class="update-toast__title">
          Nueva versión disponible
        </p>
        <p class="update-toast__subtitle">
          Recargá para ver el himnario actualizado
        </p>
      </div>
      <div class="update-toast__actions">
        <button
          class="btn btn-primary btn-sm"
          @click="applyUpdate"
        >
          Recargar
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-toast {
  position: fixed;
  bottom: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 39; /* below install-banner (40) */
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-base-100, #fff);
  color: var(--color-base-content, #1f2937);
  border-radius: 1rem;
  box-shadow:
    0 -4px 24px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  max-width: 32rem;
  margin: 0 auto;
}

.update-toast__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  background: var(--color-primary, #422ad5);
  color: var(--color-primary-content, #fff);
}

.update-toast__text {
  flex: 1;
  min-width: 0;
}

.update-toast__title {
  font-weight: 600;
  line-height: 1.2;
  margin: 0;
}

.update-toast__subtitle {
  font-size: 0.8125rem;
  opacity: 0.7;
  line-height: 1.25;
  margin: 0;
}

.update-toast__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition:
    transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 200ms ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  transform: translateY(120%);
  opacity: 0;
}
</style>
