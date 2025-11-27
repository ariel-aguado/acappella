<script setup lang="ts">
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { z } from "zod";
// Swiper styles
import "swiper/css";
import "swiper/css/navigation";

// Swiper navigation module
const swiperModules = [Navigation];

// Song store
const songStore = useSongStore();
const { songs, songId, isLoading } = storeToRefs(songStore);

// Font store
const fontStore = useFontStore();
const { fontSize } = storeToRefs(fontStore);

// New song ID input
const newSongId = ref<number | null>(null);

// Html elements
const newSongInput = shallowRef<HTMLInputElement | null>(null);
const songNumberModal = shallowRef<HTMLDialogElement>();
const showDialog = ref(false);

// Swiper reference
const swiper = shallowRef();
let _ignoreNextActiveChange = false;

// Init swiper instance
function onSwiper(swiper: any) {
  swiper.value = swiper;
  // Prevent the initial active-index-change event from overwriting the persisted songId
  _ignoreNextActiveChange = true;
  swiper.value.slideTo((Number(songId.value) || 1) - 1, 0);
};

// New song schema validation (dynamic max based on loaded songs)
const maxSongId = computed(() => Math.max(songs.value.length, 1));
const validationSchema = z.object({
  newSongId: z.coerce
    .number()
    // Empty string coerces to NaN; treat as required error
    .refine(val => !Number.isNaN(val), {
      message: "El número del himno es requerido",
    })
    .min(1, { message: "El número del himno debe ser mayor que 0" })
    .refine(val => val <= maxSongId.value, {
      message: `El número del himno debe ser menor o igual a ${maxSongId.value}`,
    }),
});

// Populate the validation composable
const { validatePartial, isValid, getError, errors } = useValidation(
  validationSchema,
  { newSongId },
  {
    mode: "partial",
  },
);

// Function to validate the new song ID
async function validateSongId() {
  await validatePartial({
    newSongId: newSongId.value,
  });
}

function navigateToSong() {
  // Initialize the swiper for the first time
  if (!swiper.value) {
    const el = document.querySelector(".swiper") as any;
    if (el && el.swiper)
      swiper.value = el.swiper;
  }

  // Navigate to the song with the given ID
  swiper.value.slideTo(Number(newSongId.value) - 1, 0);

  // Close the modal
  songNumberModal.value?.close();

  // Reset new song ID
  newSongId.value = null;
}

async function onActiveIndexChange(swiper: any) {
  setTimeout(() => {
    // If we set the slide programmatically during init, ignore the first event
    if (_ignoreNextActiveChange) {
      _ignoreNextActiveChange = false;
      return;
    }

    // Update the current song index (coerce to number)
    songId.value = Number(swiper.activeIndex) + 1;
  }, 50);
}

// Function to show the song number modal
async function showUpSongNumberModal() {
  errors.value = {};
  showDialog.value = true;
  await nextTick();
  songNumberModal.value?.showModal();
  // Wait for modal and transition to be fully visible before focusing
  setTimeout(() => {
    newSongInput.value?.focus();
  }, 150);
}

// Function to hide the song number modal
function cancelSongNumberModal() {
  newSongId.value = null;
  showDialog.value = false;
  setTimeout(() => {
    songNumberModal.value?.close();
  }, 200); // Wait for animation
}

// Function to handle navigation to the song
async function onNavigateToSong() {
  // Validate the song ID
  await validateSongId();

  // If schema failed, stop; useValidation will surface the error
  if (!isValid.value)
    return;

  // If the song ID is valid, navigate to the song
  if (isValid.value) {
    // Reset validation errors
    errors.value = {};
    navigateToSong();
  }
}

onMounted(async () => {
  // Only fetch songs if:
  // 1. Songs are not yet loaded (empty array)
  // 2. Arriving via page refresh (no navigation state)
  // 3. Not coming from internal search pages
  const router = useRouter();
  const fromInternalPage = router.options.history.state.back;
  const fromPath = typeof fromInternalPage === "string" ? fromInternalPage : "";
  const isFromSearchPages = fromPath
    && (fromPath.includes("/search") || fromPath.includes("/fully-search"));

  // Fetch songs only if they're empty OR if we're NOT coming from search pages
  if (songs.value.length === 0 || !isFromSearchPages) {
    await songStore.getSongs();
  }
});
</script>

<template>
  <div class="flex-1 flex flex-col justify-center items-center relative">
    <div v-if="isLoading">
      <span class="loading loading-dots loading-xl" />
    </div>
    <div v-else class="max-w-screen">
      <Swiper
        class="swiper"
        :modules="swiperModules"
        :slides-per-view="1"
        :space-between="0"
        :navigation="true"
        @active-index-change="onActiveIndexChange"
        @swiper="onSwiper"
      >
        <SwiperSlide
          v-for="song in songs"
          :key="song.id"
        >
          <div v-if="song" class="flex flex-col max-w-[calc(100dvw)] h-[calc(100dvh-64px-52px)] overflow-y-auto">
            <h2
              class="sticky top-0 z-10 bg-(--root-bg) text-left md:text-center px-4 pt-4"
              :style="{ fontSize: `${fontSize * 1.5}px`, lineHeight: `${fontSize * 1.5 * 1.2}px` }"
            >
              <strong :style="{ fontSize: `${fontSize * 2}px`, lineHeight: `${fontSize * 2 * 1.1}px` }">{{ song.songId }}.</strong> {{ song.title }}
            </h2>
            <div
              class="[&>p]:my-4 [&>p:has(em)]:flex [&>p:has(em)]:justify-center [&>p:has(em)]:text-sm [&>p:has(em)]:leading-5! [&>p:has(em)]:mt-4 [&>p:has(em)]:-mb-2 text-left md:text-center mt-6 px-4 pb-20"
              :style="{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.6}px` }"
              v-html="song.lyricParsed.body"
            />
          </div>
        </SwiperSlide>
      </Swiper>
    </div>

    <!-- Show the song number modal -->
    <button
      type="button"
      class="btn btn-secondary btn-sm absolute w-14 h-14 aspect-square bottom-5 right-5 p-0 rounded-xl z-20"
      @click="showUpSongNumberModal()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      ><path fill="#e0e0e1" d="M20 9c0-.55-.45-1-1-1h-3V5c0-.55-.45-1-1-1s-1 .45-1 1v3h-4V5c0-.55-.45-1-1-1s-1 .45-1 1v3H5c-.55 0-1 .45-1 1s.45 1 1 1h3v4H5c-.55 0-1 .45-1 1s.45 1 1 1h3v3c0 .55.45 1 1 1s1-.45 1-1v-3h4v3c0 .55.45 1 1 1s1-.45 1-1v-3h3c.55 0 1-.45 1-1s-.45-1-1-1h-3v-4h3c.55 0 1-.45 1-1m-6 5h-4v-4h4z" /></svg>
    </button>

    <!-- Song number modal with transition -->
    <transition name="slide-down">
      <dialog v-if="showDialog" ref="songNumberModal" class="modal">
        <div class="modal-box">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold">
              Elija un himno
            </h3>
            <button class="btn btn-ghost rounded-full p-0 w-8 h-8" @click="cancelSongNumberModal">
              <Icon name="tabler:x" size="20" />
            </button>
          </div>
          <p class="mt-2">
            Por favor, escriba el número del himno:
          </p>
          <div class="modal-action w-full mt-2">
            <form class="w-full" @submit.prevent="onNavigateToSong">
              <input
                ref="newSongInput"
                v-model.number="newSongId"
                name="newSongId"
                type="number"
                class="input w-full"
                :class="{
                  'input-error': !!getError('newSongId'),
                }"
              >
              <small class="leading-4 label text-error">{{ getError('newSongId') }}</small>
              <div class="flex justify-end gap-2 mt-4">
                <button type="button" class="btn btn-ghost" @click="cancelSongNumberModal">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-secondary">
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </transition>
  </div>
</template>

<style>
.swiper {
  width: 100%;
  height: 100%;
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
}

.swiper-button-prev,
.swiper-button-next {
  display: none;
}

/* Slide down transition for scroll title */
.slide-down-enter-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-32px);
}
.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-32px);
}
</style>
