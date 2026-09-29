import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // Certificado autoassinado: geolocalização só funciona em HTTPS (ou localhost).
    basicSsl(),
    // PWA: gera o manifest e o service worker (só no build; no `npm run dev` fica desligado).
    VitePWA({
      // 'prompt': uma versão nova só entra quando o usuário toca em "Atualizar".
      // (Com 'autoUpdate' a página recarregaria sozinha, até no meio de uma navegação.)
      registerType: 'prompt',
      manifest: {
        name: 'Minimapa GPS',
        short_name: 'Minimapa',
        description: 'Navegação GPS com visual de minimapa de jogo.',
        lang: 'pt-BR',
        theme_color: '#1b1d1f',
        background_color: '#1b1d1f',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Guarda só o "casco" do app (HTML, JS, CSS, ícones, temas JSON). Tiles, rotas
        // e buscas NÃO vão para o cache: sempre vêm da rede, para não abusar dos
        // serviços públicos (e mapa/rotas velhos não fariam sentido num GPS).
        globPatterns: ['**/*.{html,js,css,svg,png,ico,json,txt}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // o JS do MapLibre tem ~1 MB
      },
    }),
  ],
  server: {
    host: true, // expõe na rede local para abrir no celular
    port: 5173,
  },
  // `npm run preview` serve o build (com o service worker) também na rede local.
  preview: {
    host: true,
    port: 4173,
  },
  // O MapLibre sozinho tem ~1 MB (280 kB com gzip); é esperado.
  build: { chunkSizeWarningLimit: 1200 },
  // Worker do MapLibre em formato ES module (ver src/map/map.ts).
  worker: { format: 'es' },
});
