<script lang="ts" setup>
import { marked } from "marked";
import { z } from "zod";

// Song store
const songStore = useSongStore();
const { songs, songId } = storeToRefs(songStore);

// Reactive Mouse Position
const { x, y } = useMouse();
let lastMouseX = x.value;
let lastMouseY = y.value;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

// Reveal.js
const Reveal = ref<any>(null);
const revealStyle = shallowRef<HTMLLinkElement | null>(null);
// let themeStyle: HTMLLinkElement | null = null;

const isFabNavVisible = ref(false);
const songNumberModal = shallowRef<HTMLDialogElement>();
const newSongInput = shallowRef<HTMLInputElement | null>(null);
const showDialog = ref(false);
const newSongId = ref<number | null>(null);
const isLoading = ref(false);

const stanzas = computed(() => parseSong(songs.value[songId.value - 1].lyric));

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

function loadRevealCss() {
  revealStyle.value = document.createElement("link");
  revealStyle.value.rel = "stylesheet";
  revealStyle.value.href = "/styles/reveal.css";
  document.head.appendChild(revealStyle.value);

  // themeStyle = document.createElement("link");
  // themeStyle.rel = "stylesheet";
  // themeStyle.href = "/styles/beige.css";
  // document.head.appendChild(themeStyle);
}

function unloadRevealCss() {
  if (revealStyle.value && revealStyle.value.parentNode) {
    revealStyle.value.parentNode.removeChild(revealStyle.value);
  }
  // if (themeStyle && themeStyle.parentNode) {
  //   themeStyle.parentNode.removeChild(themeStyle);
  // }
}

function parseSong(text: string): string[] {
  // Procesar texto como antes
  const verses = text
    .replace(/^\([^)]*\)\s*/m, "") // Eliminar cita bíblica inicial
    .replace(/\*\d+\*\s*/g, "") // Eliminar divisores numéricos
    .trim()
    .split(/\n\s*\n/) // Separar estrofas
    .map(verse => verse.trim()) // Limpiar espacios
    .filter(Boolean); // Filtrar vacíos

  // Buscar y extraer el coro
  const coroIndex = verses.findIndex(v => v.startsWith("**CORO"));
  if (coroIndex === -1)
    return verses;

  const coro = verses[coroIndex];
  const estrofas = verses.filter((_, i) => i !== coroIndex);

  // Intercalar el coro después de cada estrofa
  const intercalado: string[] = [];
  for (let i = 0; i < estrofas.length; i++) {
    intercalado.push(estrofas[i]);
    if (i < estrofas.length - 1) {
      intercalado.push(coro);
    }
  }

  // Opcional: añadir el coro al final también
  intercalado.push(coro);

  return intercalado;
}

// Function to validate the new song ID
async function validateSongId() {
  await validatePartial({
    newSongId: newSongId.value,
  });
}

async function navigateToSong() {
  // Update the current song index
  songId.value = JSON.parse(JSON.stringify(newSongId.value));

  // Close the modal
  songNumberModal.value?.close();

  // Reset new song ID
  newSongId.value = null;

  // Forzar actualización de RevealJS
  const revealModule = await import("reveal.js");
  const RevealDefault = revealModule.default;
  Reveal.value = new RevealDefault();

  await Reveal.value.initialize({
    slideNumber: "c/t",
    progress: false,
    hash: true,
    disableLayout: false,
  });

  Reveal.value.layout();
  Reveal.value.slide(0);
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

// Function to hide the song number modal
function cancelSongNumberModal() {
  newSongId.value = null;
  showDialog.value = false;
  setTimeout(() => {
    songNumberModal.value?.close();
  }, 200); // Wait for animation
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

onMounted(async () => {
  loadRevealCss();

  const revealModule = await import("reveal.js");
  const RevealDefault = revealModule.default;
  Reveal.value = new RevealDefault();

  await Reveal.value.initialize({
    slideNumber: "c/t",
    progress: false,
    hash: true,
    disableLayout: false,
  });

  setTimeout(() => {
    Reveal.value.layout();
  }, 500);
});

onBeforeUnmount(() => {
  isLoading.value = true;
  setTimeout(() => {
    unloadRevealCss();
    Reveal.value.destroy();
    Reveal.value = null;
  }, 200);
});

watchEffect(() => {
  if (x.value !== lastMouseX || y.value !== lastMouseY) {
    lastMouseX = x.value;
    lastMouseY = y.value;
    isFabNavVisible.value = true;
    if (hideTimeout)
      clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      isFabNavVisible.value = false;
    }, 5000); // 5 seconds
  }
});
</script>

<template>
  <section v-if="isLoading" class="w-full h-full flex justify-center items-center">
    <span class="loading loading-dots loading-xl" />
  </section>
  <div v-else class="reveal">
    <div class="slides">
      <section
        v-for="stanza in stanzas"
        :key="stanza"
        class="h-full !perspective-distant !flex flex-col justify-between"
        data-background-image="/img/background-fullscreen.webp"
        data-background-size="cover"
      >
        <p
          class="r-fit-text font-bold text-9xl text-white text-shadow-lg text-shadow-black/50"
          :class="{
            'leading-22': stanzas.length > 1,
            'leading-20': stanzas.length === 1,
          }"
          v-html="marked.parse(stanza)"
        />
        <p class="r-fit-text font-bold text-4xl text-white text-shadow-lg text-shadow-black/50">
          <span>{{ songId }}.</span>
          {{ songs[songId - 1]?.title ?? '' }}
        </p>
      </section>
    </div>

    <!-- Fab Navigation -->
    <div v-if="isFabNavVisible" class="fab bottom-20">
      <!-- a focusable div with tabindex is necessary to work on all browsers. role="button" is necessary for accessibility -->
      <div tabindex="0" role="button" class="btn btn-lg btn-circle btn-secondary">
        <Icon name="tabler:brand-netease-music" size="32" />
      </div>

      <!-- close button should not be focusable so it can close the FAB when clicked. It's just a visual placeholder -->
      <div class="fab-close">
        <span class="btn btn-circle btn-lg btn-secondary">✕</span>
      </div>

      <!-- buttons that show up when FAB is open -->
      <button class="btn btn-circle btn-lg" @click="showUpSongNumberModal()">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
        ><path fill="currentColor" d="M20 9c0-.55-.45-1-1-1h-3V5c0-.55-.45-1-1-1s-1 .45-1 1v3h-4V5c0-.55-.45-1-1-1s-1 .45-1 1v3H5c-.55 0-1 .45-1 1s.45 1 1 1h3v4H5c-.55 0-1 .45-1 1s.45 1 1 1h3v3c0 .55.45 1 1 1s1-.45 1-1v-3h4v3c0 .55.45 1 1 1s1-.45 1-1v-3h3c.55 0 1-.45 1-1s-.45-1-1-1h-3v-4h3c.55 0 1-.45 1-1m-6 5h-4v-4h4z" /></svg>
      </button>
      <button class="btn btn-circle btn-lg" @click="navigateTo('/search')">
        <Icon name="tabler:music-search" size="24" />
      </button>
      <button class="btn btn-circle btn-lg" @click="navigateTo('/fully-search')">
        <Icon name="tabler:search" size="24" />
      </button>
      <button class="btn btn-circle btn-lg" @click="navigateTo('/about')">
        <Icon name="tabler:music-cog" size="24" />
      </button>
    </div>

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
