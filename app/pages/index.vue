<script setup lang="ts">
import { Navigation, Virtual } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { z } from "zod";
// Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/virtual";

// Swiper navigation module
const swiperModules = [Navigation, Virtual];

// Song store
const songStore = useSongStore();
const { songs, songId, currentSong, isLoading } = storeToRefs(songStore);

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

// Init swiper instance
function onSwiper(swiper: any) {
  swiper.value = swiper;
  swiper.value.slideTo(Number(songId.value) - 1, 0);
};

// New song schema validation
const validationSchema = z.object({
  newSongId: z.preprocess(
    val => (val === null || val === undefined || val === "" ? undefined : val),
    z.number({
      required_error: "El número del himno es requerido",
      invalid_type_error: "El número del himno debe ser un número",
    })
      .min(1, "El número del himno debe ser mayor que 0")
      .max(380, "El número del himno debe ser menor o igual a 380"),
  ),
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
    swiper.value = document.querySelector(".swiper").swiper;
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
    // Update the current song index
    songId.value = swiper.activeIndex + 1;
  }, 50);
}

// Function to show the song number modal
async function showUpSongNumberModal() {
  errors.value = {};
  showDialog.value = true;
  setTimeout(() => {
    songNumberModal.value?.showModal();
    newSongInput.value?.focus();
  }, 50);
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

  // If the song ID is valid, navigate to the song
  if (isValid.value) {
    // Reset validation errors
    errors.value = {};
    navigateToSong();
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col justify-center items-center relative">
    <div v-if="isLoading">
      <span class="loading loading-dots loading-xl" />
    </div>
    <div v-else class="max-w-screen md:max-w-5xl md:mx-auto">
      <Swiper
        class="swiper"
        :modules="swiperModules"
        :slides-per-view="1"
        :space-between="20"
        :navigation="true"
        :virtual="true"
        @active-index-change="onActiveIndexChange"
        @swiper="onSwiper"
      >
        <SwiperSlide
          v-for="song in songs"
          :key="song.id"
          :virtual-index="song.id"
        >
          <div class="h-[calc(100vh-64px-52px)] overlay overflow-auto p-4 pb-18">
            <h2
              v-if="currentSong"
              class="text-left md:text-center"
              :style="{ fontSize: `${fontSize * 1.5}px`, lineHeight: `${fontSize * 1.5 * 1.2}px` }"
            >
              <strong :style="{ fontSize: `${fontSize * 2}px`, lineHeight: `${fontSize * 2 * 1.1}px` }">{{ song.songId }}.</strong> {{ song.title }}
            </h2>
            <MDCRenderer
              v-if="song"
              :body="song.lyricParsed.body"
              :data="song.lyricParsed.data"
              class="[&>p]:my-4 [&>p:has(em)]:flex [&>p:has(em)]:justify-center [&>p:has(em)]:!leading-[1px] text-left md:text-center mt-6"
              :style="{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.6}px` }"
            />
          </div>
        </SwiperSlide>
      </Swiper>
    </div>

    <!-- Show the song number modal -->
    <button
      type="button"
      class="btn btn-secondary btn-sm absolute w-14 h-14 aspect-square bottom-[20px] right-[20px] p-0 rounded-xl z-20"
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
    <transition name="modal-fade">
      <dialog v-if="showDialog" ref="songNumberModal" class="modal">
        <div class="modal-box">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold">
              Elija un himno
            </h3>
            <button class="btn btn-ghost rounded-full p-0 w-8 h-8" @click="showDialog = false">
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
                v-model="newSongId"
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
html {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

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

.modal {
  backdrop-filter: blur(8px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
