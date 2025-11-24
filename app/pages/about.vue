<template>
  <div class="w-full flex flex-col h-[calc(100dvh-64px-52px)] overflow-y-auto max-w-screen min-w-0 md:min-w-2xl md:max-w-2xl md:mx-auto p-4">
    <div class="w-full min-h-[300px] flex justify-center items-center rounded-xl overflow-hidden border border-primary/50 relative">
      <DarkVeil
        :hue-shift="0"
        :noise-intensity="0"
        :scanline-intensity="0"
        :speed="1"
        :scanline-frequency="0"
        :warp-amount="0"
        :resolution-scale="1"
      />
      <div class="absolute top-0 h-full flex-1 flex flex-col justify-center items-center text-white rounded-xl">
        <Icon name="tabler:brand-netease-music" size="128" class="min-h-32" />
        <div class="flex flex-col items-center gap-4 p-4">
          <span class="leading-6 font-bold text-5xl">
            Acappella
          </span>
          <ShinyText
            text="Cánticos Espirituales"
            :disabled="false"
            :speed="3"
            class-name="font-normal text-xl"
          />
        </div>
      </div>
    </div>
    <div>
      <h2 class="text-3xl font-bold text-left md:text-center mt-8">
        Acerca de Acappella
      </h2>
      <p class="md:max-w-2xl md:mx-auto text-left md:text-center mt-4 leading-8">
        "Acappella" nace con una misión clara: poner la tecnología al servicio de la alabanza. Es una herramienta diseñada para que la Iglesia pueda exaltar el nombre del Señor, a quien sea toda la honra y la gloria. Amén.
      </p>
      <p class="md:max-w-2xl md:mx-auto text-left md:text-center mt-4 leading-8">
        Esta aplicación es completamente gratuita y de código abierto. Puedes encontrar el código fuente en <a
          class="text-blue-500 underline underline-offset-2"
          href="https://github.com/ariel-aguado/acappella"
          target="_blank"
          rel="noopener noreferrer"
        >GitHub</a>.
      </p>
      <p class="md:max-w-2xl md:mx-auto text-left md:text-center mt-4 leading-8">
        Si necesitas ayuda, tienes alguna sugerencia o encuentras algún error, puedes contactar a través de la siguiente dirección de correo electrónico al:
        <a
          class="text-blue-500 underline underline-offset-2"
          href="mailto:ariel.841207@gmail.com"
        >Desarrollador de Acappella</a>.
      </p>
    </div>
  </div>
</template>
