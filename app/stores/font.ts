const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 40;
const DEFAULT_FONT_SIZE = 18;

export const useFontStore = defineStore("font", () => {
  const fontSize = useLocalStorage<number>("acappellaFontSize", DEFAULT_FONT_SIZE);

  function increaseFont() {
    fontSize.value = Math.min(MAX_FONT_SIZE, fontSize.value + 2);
  }
  function decreaseFont() {
    fontSize.value = Math.max(MIN_FONT_SIZE, fontSize.value - 2);
  }
  function setFont(size: number) {
    fontSize.value = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
  }

  return { fontSize, increaseFont, decreaseFont, setFont };
});
