<script setup lang="ts">
const props = defineProps<{ open: boolean }>();
const emit = defineEmits(["update:open"]);

const dragging = ref(false);
const startY = ref(0);

const fontStore = useFontStore();

function increaseFont() {
  fontStore.increaseFont();
}
function decreaseFont() {
  fontStore.decreaseFont();
}

function startDrag(e: MouseEvent | TouchEvent) {
  dragging.value = true;
  startY.value = "touches" in e ? e.touches[0].clientY : e.clientY;
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchmove", onDrag);
  document.addEventListener("touchend", stopDrag);
}
function onDrag(e: MouseEvent | TouchEvent) {
  if (!dragging.value)
    return;
  const y = "touches" in e ? e.touches[0].clientY : e.clientY;
  const delta = y - startY.value;
  // Si el usuario arrastra hacia abajo más de 60px, cerrar
  if (delta > 60) {
    emit("update:open", false);
    stopDrag();
  }
}
function stopDrag() {
  dragging.value = false;
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
  document.removeEventListener("touchmove", onDrag);
  document.removeEventListener("touchend", stopDrag);
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
        <div class="w-16 h-2 bg-base-300 rounded-full mt-2 mb-4 cursor-grab" @mousedown="startDrag" @touchstart="startDrag" />
        <div class="w-full flex gap-4 mb-4 px-4">
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
