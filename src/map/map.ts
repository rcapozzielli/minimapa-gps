// Cria o mapa MapLibre já com o tema inicial (ver themes.ts).
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// O MapLibre 6 processa os tiles num Web Worker e o procura ao lado do próprio
// arquivo, o que quebra depois do bundle. "?worker&url" faz o Vite empacotar o
// worker (com as dependências dele) e nos dar a URL final.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { bindThemes, themeUrl } from './themes';

maplibregl.setWorkerUrl(workerUrl);

const FALLBACK_CENTER: [number, number] = [-46.6333, -23.5505]; // São Paulo, até o GPS responder

export function createMap(container: string, themeId: string): maplibregl.Map {
  const map = new maplibregl.Map({
    container,
    style: themeUrl(themeId),
    center: FALLBACK_CENTER,
    zoom: 12,
    maxPitch: 70,
    // A atribuição é exigida pela licença do OpenStreetMap: fica sempre aberta.
    // O texto vem automaticamente do TileJSON do OpenFreeMap.
    attributionControl: { compact: false },
  });
  bindThemes(map);

  // Gestos de rotação ficam ligados; quem controla a rotação no modo seguir é camera.ts.
  map.touchZoomRotate.enableRotation();
  return map;
}
