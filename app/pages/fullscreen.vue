<script lang="ts" setup>
import { marked } from "marked";
import { z } from "zod";

// Color mode
const colorMode = useColorMode();

// Song store
const songStore = useSongStore();
const { songs, songId, isLoading } = storeToRefs(songStore);

// Reactive Mouse Position
const { x, y } = useMouse();
let lastMouseX = x.value;
let lastMouseY = y.value;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

// Reveal.js
const Reveal = ref<any>(null);
const revealStyle = shallowRef<HTMLLinkElement | null>(null);
// let themeStyle: HTMLLinkElement | null = null;

const songNumberModal = shallowRef<HTMLDialogElement>();
const newSongInput = shallowRef<HTMLInputElement | null>(null);
const newSongId = ref<number | null>(null);
const stanzaLineCounts = ref<number[]>([]);
const isSongNumberDialogVisible = ref(false);
const isFabNavVisible = ref(false);

// Font size manual override por slide
const baseFontSizes = [48, 46, 42, 40, 36];
const fontSizes = ref<number[]>([]);

const stanzas = computed(() => {
  const song = songs.value?.[songId.value - 1];
  if (!song || !song.lyric)
    return [];
  return parseSong(song.lyric);
});

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

// Load RevealJS Css
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

// Unload RevealJS Css
function unloadRevealCss() {
  if (revealStyle.value && revealStyle.value.parentNode) {
    revealStyle.value.parentNode.removeChild(revealStyle.value);
  }
  // if (themeStyle && themeStyle.parentNode) {
  //   themeStyle.parentNode.removeChild(themeStyle);
  // }
}

// Parse song
function parseSong(text: string): string[] {
  const verses = text
    .replace(/^\([^)]*\)\s*/m, "") // Delete initial Bible quote
    .replace(/\*\d+\*\s*/g, "") // Remove numerical divisors
    .trim()
    .split(/\n\s*\n/) // Split stanzas
    .map(verse => verse.trim()) // Clean spaces
    .filter(Boolean); // Filter spaces

  // Search and extract the chorus
  const chorusIndex = verses.findIndex(v => v.startsWith("**CORO"));
  if (chorusIndex === -1) {
    // Calculate lines per verse if there is no chorus
    stanzaLineCounts.value = verses.map(v => v.split(/\n+/).filter(line => line.trim().length > 0).length);
    // You can use stanzaLineCounts wherever you need it
    // Set the fontSize for each stanza based on lines
    fontSizes.value = stanzaLineCounts.value.map(lines => getDefaultFontSize(lines));
    return verses;
  }

  const chorus = verses[chorusIndex];
  const stanzas = verses.filter((_, i) => i !== chorusIndex);

  // Insert the chorus after each verse
  const intercalado: string[] = [];

  for (let i = 0; i < stanzas.length; i++) {
    intercalado.push(stanzas[i]);
    stanzaLineCounts.value.push(stanzas[i].split(/\n+/).filter(line => line.trim().length > 0).length);
    if (i < stanzas.length - 1) {
      intercalado.push(chorus);
      stanzaLineCounts.value.push(chorus.split(/\n+/).filter(line => line.trim().length > 0).length);
    }
  }
  // Add the chorus at the end
  intercalado.push(chorus);
  stanzaLineCounts.value.push(chorus.split(/\n+/).filter(line => line.trim().length > 0).length);

  // Set the fontSize for each stanza based on lines
  fontSizes.value = stanzaLineCounts.value.map(lines => getDefaultFontSize(lines));

  return intercalado;
}

// Validate the new song ID
async function validateSongId() {
  await validatePartial({
    newSongId: newSongId.value,
  });
}

// Navigate to the selected song
async function navigateToSong() {
  // Update the current song index
  songId.value = JSON.parse(JSON.stringify(newSongId.value));

  // Close the modal
  songNumberModal.value?.close();

  // Reset new song ID
  newSongId.value = null;
}

// Handle navigation to the song
async function onNavigateToSong() {
  // Validate the song ID
  await validateSongId();

  // If the song ID is valid, navigate to the song
  if (isValid.value) {
    // Reset validation errors
    errors.value = {};
    // Reset stanzas and font sizes
    stanzaLineCounts.value = [];
    fontSizes.value = [];
    navigateToSong();
    recreateRevealInstance();
  }
}

// Hide the song number modal
function cancelSongNumberModal() {
  newSongId.value = null;
  isSongNumberDialogVisible.value = false;
  setTimeout(() => {
    songNumberModal.value?.close();
  }, 200); // Wait for animation
}

// Show the song number modal
async function showUpSongNumberModal() {
  errors.value = {};
  isSongNumberDialogVisible.value = true;
  setTimeout(() => {
    songNumberModal.value?.showModal();
    newSongInput.value?.focus();
  }, 50);
}

// Navigate to next song
async function navigateToNextSong() {
  newSongId.value = songId.value + 1;
  // Reset stanzas and font sizes
  stanzaLineCounts.value = [];
  fontSizes.value = [];
  navigateToSong();
  recreateRevealInstance();
}

// Navigate to prev song
async function navigateToPrevSong() {
  newSongId.value = songId.value - 1;
  // Reset stanzas and font sizes
  stanzaLineCounts.value = [];
  fontSizes.value = [];
  navigateToSong();
  recreateRevealInstance();
}

// Get font size based on stanza lines
function getDefaultFontSize(lines: number): number {
  if (lines <= 8)
    return baseFontSizes[0];
  if (lines === 9)
    return baseFontSizes[1];
  if (lines === 10)
    return baseFontSizes[2];
  if (lines === 11)
    return baseFontSizes[3];
  return baseFontSizes[4];
}

// Re-create the RevealJS instance
async function recreateRevealInstance() {
  // Destroy the current RevealJS instance if it exists
  if (Reveal.value) {
    Reveal.value.destroy();
    Reveal.value = null;
  }

  // Wait for DOM update
  await nextTick();

  // Create a new RevealJS instance on the new song
  const revealModule = await import("reveal.js");
  const RevealDefault = revealModule.default;
  Reveal.value = new RevealDefault();

  await Reveal.value.initialize({
    slideNumber: "c/t",
    progress: false,
    hash: true,
    disableLayout: false,
    keyboard: {
      38: null, // arrow up
      40: null, // arrow down
      71: null, // g
      78: null, // n
      80: null, // p
    },
  });

  // Force layout and navigate
  await nextTick();
  Reveal.value.layout();
  Reveal.value.slide(0);
}

// Increase font size with up key
onKeyStroke("ArrowUp", () => {
  const slideIndex = Reveal.value?.getIndices().h ?? 0;
  fontSizes.value[slideIndex] = fontSizes.value[slideIndex] + 2;
});

// Decrease font size with down key
onKeyStroke("ArrowDown", () => {
  const slideIndex = Reveal.value?.getIndices().h ?? 0;
  fontSizes.value[slideIndex] = Math.max(fontSizes.value[slideIndex] - 2, 12);
});

// Navigate to about page
onKeyStroke("a", () => {
  navigateTo("/about");
}, { target: document, dedupe: true });

// Navigate to search songs by number and title
onKeyStroke("t", () => {
  navigateTo("/search");
}, { target: document, dedupe: true });

// Navigate to full text search songs
onKeyStroke("s", () => {
  navigateTo("/fully-search");
}, { target: document, dedupe: true });

// Go to next song with n key
onKeyStroke("n", () => {
  navigateToNextSong();
}, { target: document, dedupe: true });

// Go to prev song with p key
onKeyStroke("p", () => {
  navigateToPrevSong();
}, { target: document, dedupe: true });

// Show up number modal with g key
onKeyStroke("g", () => {
  showUpSongNumberModal();
}, { target: document, dedupe: true });

onMounted(async () => {
  // Set light mode in fullscreen by default
  colorMode.preference = "light";

  await songStore.getSongs();

  if (!isLoading.value) {
    await nextTick();

    loadRevealCss();

    const revealModule = await import("reveal.js");
    const RevealDefault = revealModule.default;
    Reveal.value = new RevealDefault();

    await Reveal.value.initialize({
      slideNumber: "c/t",
      progress: false,
      hash: true,
      disableLayout: false,
      keyboard: {
        38: null, // arrow up
        40: null, // arrow down
        71: null, // g
        78: null, // n
        80: null, // p
      },
    });

    Reveal.value.layout();

    // Workaround: Force layout recalculation after a delay
    // to fix rendering issues when navigating from search pages
    setTimeout(() => {
      if (Reveal.value) {
        Reveal.value.layout();
      }
    }, 100);
  }
});

onBeforeUnmount(() => {
  unloadRevealCss();
  if (Reveal.value) {
    Reveal.value.destroy();
    Reveal.value = null;
  }
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
        v-for="(stanza, index) in stanzas"
        :key="`stanza-${index + 1}`"
        class="h-full !perspective-distant !flex flex-col justify-between"
        data-background-image="/img/background-fullscreen.webp"
        data-background-size="cover"
      >
        <div
          class="font-bold [&>p>strong]:font-bold text-white text-shadow-ultra text-shadow-black/50 mt-3"
          :style="{ fontSize: `${fontSizes[index]}px`, lineHeight: '1.4' }"
          v-html="marked.parse(stanza)"
        />
        <p class="font-bold text-4xl text-white text-shadow-ultra text-shadow-black/50">
          <span>{{ songId }}.</span>
          {{ songs[songId - 1]?.title ?? '' }}
        </p>
      </section>
    </div>

    <!-- Shortcuts for font size settings -->
    <!-- <div v-if="isFabNavVisible" class="fixed left-4 bottom-4 flex flex-col gap-2 z-50">
      <div>
        Presiona
        <kbd class="kbd kbd-sm">▲</kbd>
        para aumentar el tamaño del texto
      </div>
      <div>
        Presiona
        <kbd class="kbd kbd-sm">▼</kbd>
        para disminuir el tamaño del texto
      </div>
    </div> -->

    <!-- Fab Navigation -->
    <div v-if="isFabNavVisible" class="fab bottom-18 right-8">
      <!-- a focusable div with tabindex is necessary to work on all browsers. role="button" is necessary for accessibility -->
      <div tabindex="0" role="button" class="btn btn-lg btn-circle btn-secondary">
        <Icon name="tabler:brand-netease-music" size="32" />
      </div>

      <!-- close button should not be focusable so it can close the FAB when clicked. It's just a visual placeholder -->
      <div class="fab-close">
        <span class="btn btn-circle btn-lg btn-secondary">✕</span>
      </div>

      <!-- buttons that show up when FAB is open -->
      <div class="flex items-center gap-2">
        <div>
          Presiona
          <kbd class="kbd">n</kbd>
        </div>
        <button :disabled="songs.length === songId" class="btn btn-circle btn-lg" @click="navigateToNextSong()">
          <Icon name="tabler:player-track-next-filled" size="24" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <div>
          Presiona
          <kbd class="kbd">p</kbd>
        </div>
        <button
          :disabled="songId === 1"
          class="btn btn-circle btn-lg"
          @click="navigateToPrevSong()"
        >
          <Icon name="tabler:player-track-prev-filled" size="24" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <div>
          Presiona
          <kbd class="kbd">g</kbd>
        </div>
        <button class="btn btn-circle btn-lg" @click="showUpSongNumberModal()">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          ><path fill="currentColor" d="M20 9c0-.55-.45-1-1-1h-3V5c0-.55-.45-1-1-1s-1 .45-1 1v3h-4V5c0-.55-.45-1-1-1s-1 .45-1 1v3H5c-.55 0-1 .45-1 1s.45 1 1 1h3v4H5c-.55 0-1 .45-1 1s.45 1 1 1h3v3c0 .55.45 1 1 1s1-.45 1-1v-3h4v3c0 .55.45 1 1 1s1-.45 1-1v-3h3c.55 0 1-.45 1-1s-.45-1-1-1h-3v-4h3c.55 0 1-.45 1-1m-6 5h-4v-4h4z" /></svg>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <p class="">
          Presiona
          <kbd class="kbd">t</kbd>
        </p>
        <button class="btn btn-circle btn-lg" @click="navigateTo('/search')">
          <Icon name="tabler:music-search" size="24" />
        </button>
      </div>
      <!-- <button class="btn btn-circle btn-lg" @click="navigateTo('/fully-search')">
        <Icon name="tabler:search" size="24" />
      </button> -->
      <div class="flex items-center gap-2">
        <div>
          Presiona
          <kbd class="kbd">s</kbd>
        </div>
        <button class="btn btn-circle btn-lg" @click="navigateTo('/fully-search')">
          <Icon name="tabler:search" size="24" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <div>
          Presiona
          <kbd class="kbd">a</kbd>
        </div>
        <button class="btn btn-circle btn-lg" @click="navigateTo('/about')">
          <Icon name="tabler:music-cog" size="24" />
        </button>
      </div>
    </div>

    <!-- Song number modal with transition -->
    <transition name="modal-fade">
      <dialog v-if="isSongNumberDialogVisible" ref="songNumberModal" class="modal">
        <div class="modal-box">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold">
              Elija un himno
            </h3>
            <button class="btn btn-ghost rounded-full p-0 w-8 h-8" @click="isSongNumberDialogVisible = false">
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
              <small class="leading-4 label text-error mt-2">{{ getError('newSongId') }}</small>
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
.reveal .slide-number {
  right: 110px !important;
  bottom: 22px !important;
  padding: 12px !important;
}

.text-shadow-ultra {
  text-shadow:
    -2px 2px 0 rgba(0, 0, 0, 1),
    -2px -2px 0 rgba(0, 0, 0, 1),
    2px -2px 0 rgba(0, 0, 0, 1),
    -2px 1px 0 rgba(0, 0, 0, 1),
    -2px 4px 0 rgba(0, 0, 0, 1),
    1px 1px 0 rgba(0, 0, 0, 1),
    2px 2px 0 rgba(0, 0, 0, 1),
    3px 3px 1px rgba(0, 0, 0, 0.8),
    4px 4px 2px rgba(0, 0, 0, 0.7),
    5px 5px 3px rgba(0, 0, 0, 0.6);
}
</style>
