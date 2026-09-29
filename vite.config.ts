import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // Certificado autoassinado: geolocalização só funciona em HTTPS (ou localhost).
  plugins: [basicSsl()],
  server: {
    host: true, // expõe na rede local para abrir no celular
    port: 5173,
  },
  // O MapLibre sozinho tem ~1 MB (280 kB com gzip); é esperado.
  build: { chunkSizeWarningLimit: 1200 },
  // Worker do MapLibre em formato ES module (ver src/map/map.ts).
  worker: { format: 'es' },
});
