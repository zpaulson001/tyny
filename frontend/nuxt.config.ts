// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primeuix/themes/aura';

export default defineNuxtConfig({
  app: {
    head: {
      title: 'Tyny | Transcription and Translation in Real-Time',
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">💬</text></svg>',
        },
      ],
    },
  },
  compatibilityDate: '2025-05-15',
  ssr: false,
  css: ['primeicons/primeicons.css'],
  devtools: { enabled: true },
  modules: [
    '@primevue/nuxt-module',
    '@nuxt/fonts',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],
  primevue: {
    options: {
      theme: {
        preset: Aura,
      },
    },
    components: {
      include: ['Button'], // Only include components you actually use
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['onnxruntime-web'],
    },
  },
  devServer: {
    port: Number(process.env.PORT) || 5173,
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.API_BASE_URL || '',
      frontendBaseUrl: process.env.FRONTEND_BASE_URL || '',
    },
  },
});
