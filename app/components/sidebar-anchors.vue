<script setup lang="ts">
type Props = {
  ids: number[] | string[];
  sections?: number;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "jump", id: number): void;
}>();

const songStore = useSongStore();
const {
  currentTab,
} = storeToRefs(songStore);

const railEl = ref<HTMLElement | null>(null);
const anchorsRef = ref<number[] | string[]>([]);
const dragging = ref(false);
const lastIdx = ref<number | null>(null);

watch(
  () => [props.ids, props.sections] as const,
  () => {
    if (currentTab.value === "byNumber") {
      anchorsRef.value = songStore.generateAnchorsFromSongIds(props.ids as number[], props.sections ?? 15);
    }
    else if (currentTab.value === "byTitle") {
      anchorsRef.value = songStore.generateAnchorFromInitials(props.ids as string[]);
    }
  },
  { immediate: true, deep: true },
);

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function handleAt(clientY: number) {
  const el = railEl.value;
  if (!el || anchorsRef.value.length === 0)
    return;
  const rect = el.getBoundingClientRect();
  const y = clientY - rect.top;
  const ratio = clamp(y / rect.height, 0, 1);
  const i = clamp(Math.floor(ratio * anchorsRef.value.length), 0, anchorsRef.value.length - 1);

  if (i !== lastIdx.value) {
    lastIdx.value = i;
    const id = anchorsRef.value[i];
    if (id != null)
      emit("jump", id);
  }
}

function onPointerDown(ev: PointerEvent) {
  dragging.value = true;
  (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  handleAt(ev.clientY);
  ev.preventDefault();
}

function onPointerMove(ev: PointerEvent) {
  if (!dragging.value)
    return;
  handleAt(ev.clientY);
}

function onPointerUp(ev: PointerEvent) {
  dragging.value = false;
  lastIdx.value = null;
  (ev.currentTarget as HTMLElement).releasePointerCapture?.(ev.pointerId);
}

onMounted(() => {
  const el = railEl.value;
  if (!el)
    return;
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
});

onBeforeUnmount(() => {
  const el = railEl.value;
  if (!el)
    return;
  el.removeEventListener("pointerdown", onPointerDown);
  el.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
});
</script>

<template>
  <div
    ref="railEl"
    class="sticky top-0 z-50 flex flex-col items-center bg-secondary/10 w-7 h-full rounded-t-full rounded-b-full py-4"
    style="width: 28px; height: 100%; touch-action: none;"
  >
    <div
      v-for="a in anchorsRef"
      :key="a"
      class="flex-1 flex justify-center items-center w-full text-secondary hover:cursor-pointer text-xs leading-none"
    >
      {{ a }}
    </div>
  </div>
</template>

<style scoped>
  div[ref="railEl"] > div {
  padding: 6px 0;
}
</style>
