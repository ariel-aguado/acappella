<script setup lang="ts">
const props = defineProps<{ open: boolean }>();
const emit = defineEmits(["update:open"]);

const dragging = ref(false);
const startY = ref(0);
const lastY = ref(0);
const dragDelta = ref(0);

const fontStore = useFontStore();

function increaseFont() {
  fontStore.increaseFont();
}
function decreaseFont() {
  fontStore.decreaseFont();
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1 || !e.touches[0])
    return;
  dragging.value = true;
  startY.value = e.touches[0].clientY;
  lastY.value = startY.value;
  dragDelta.value = 0;
  document.body.style.overflow = "hidden";
}

function onTouchMove(e: TouchEvent) {
  if (!dragging.value || e.touches.length !== 1 || !e.touches[0])
    return;
  const y = e.touches[0].clientY;
  dragDelta.value = y - startY.value;
  lastY.value = y;
  if (dragDelta.value > 60) {
    emit("update:open", false);
    onTouchEnd();
  }
}

function onTouchEnd() {
  dragging.value = false;
  dragDelta.value = 0;
  document.body.style.overflow = "";
}

function onMouseDown(e: MouseEvent) {
  dragging.value = true;
  startY.value = e.clientY;
  lastY.value = startY.value;
  dragDelta.value = 0;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.body.style.overflow = "hidden";
}
function onMouseMove(e: MouseEvent) {
  if (!dragging.value)
    return;
  const y = e.clientY;
  dragDelta.value = y - startY.value;
  lastY.value = y;
  if (dragDelta.value > 60) {
    emit("update:open", false);
    onMouseUp();
  }
}
function onMouseUp() {
  dragging.value = false;
  dragDelta.value = 0;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
  document.body.style.overflow = "";
}
</script>

<template>
  <div>
    <!-- Sidebar tipo drawer desde abajo -->
    <transition name="slide-up">
      <div
        v-if="props.open"
        class="fixed left-0 bottom-0 w-full bg-base-200 shadow-lg z-50 flex flex-col items-center rounded-t-2xl border-t border-base-300"
      >
        <!-- Handle para arrastrar/cerrar -->
        <div
          class="w-16 h-2 bg-base-300 rounded-full mt-2 mb-4 cursor-grab"
          @mousedown="onMouseDown"
          @touchstart="onTouchStart"
          @touchmove.prevent="onTouchMove"
          @touchend="onTouchEnd"
        />
        <span class="w-full px-4">Ajustar tamaño de letra:</span>
        <div class="w-full flex gap-4 mt-4 mb-8 px-4">
          <button class="flex-1 btn btn-secondary btn-sm rounded-full" @click="decreaseFont">
            A-
          </button>
          <button class="flex-1 btn btn-secondary btn-sm rounded-full text-2xl" @click="increaseFont">
            A+
          </button>
        </div>
      </div>
    </transition>
    <!-- Overlay para cerrar, solo click, no bloquea el resto -->
    <div
      v-if="props.open"
      class="fixed inset-0 bg-transparent z-40"
      style="pointer-events:auto;"
      @click.self="emit('update:open', false)"
    />
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0);
}
</style>
