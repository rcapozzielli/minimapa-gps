// Gera os ícones do PWA a partir de public/icon.svg (rode: npm run icons).
// O preset "minimal-2023" cria: favicon.ico, pwa-64x64, pwa-192x192, pwa-512x512,
// maskable-icon-512x512 (com margem para Android recortar em círculo) e apple-touch-icon-180x180.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1b1d1f' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1b1d1f' } },
  },
  images: ['public/icon.svg'],
});
