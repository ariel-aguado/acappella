// import type { Directions, LocaleObject } from '@nuxtjs/i18n'

export function setupPageHeader() {
  // const { locale, locales, t } = useI18n()
  // const colorMode = useColorMode()
  // const buildInfo = useBuildInfo()
  // const enablePinchToZoom = usePreferences('enablePinchToZoom')

  // const localeMap = (locales.value as LocaleObject[]).reduce((acc, l) => {
  //   acc[l.code!] = l.dir ?? 'ltr'
  //   return acc
  // }, {} as Record<string, Directions>)

  console.log("Setting up page header");

  useHead({
    htmlAttrs: {
      lang: () => "es",
      // lang: () => locale.value,
      dir: () => "ltr",
      // dir: () => localeMap[locale.value] ?? 'ltr',
      // class: () => enablePinchToZoom.value ? ['enable-pinch-to-zoom'] : [],
    },
    meta: [{
      name: "viewport",
      content: () => `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover`,
      // content: () => `width=device-width,initial-scale=1${enablePinchToZoom.value ? '' : ',maximum-scale=1,user-scalable=0'},viewport-fit=cover`,
    }],
    titleTemplate: c => c ? `${c} - Acappella` : "Acappella",
    link: import.meta.client
    // link: (import.meta.client && useAppConfig().pwaEnabled)
      ? () => [{
          key: "webmanifest",
          rel: "manifest",
          href: `/manifest.json`,
          // href: `/manifest-${locale.value}${colorMode.value === 'dark' ? '-dark' : ''}.webmanifest`,
        }]
      : [],
  });
}
