// Cria o mapa MapLibre. O estilo (tema) vem de um JSON; na fase 1 usamos o
// estilo "liberty" do OpenFreeMap como provisório.
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const FALLBACK_CENTER: [number, number] = [-46.6333, -23.5505]; // São Paulo, até o GPS responder

export function createMap(container: string): maplibregl.Map {
  const map = new maplibregl.Map({
    container,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: FALLBACK_CENTER,
    zoom: 12,
    maxPitch: 70,
    // A atribuição é exigida pela licença do OpenStreetMap: fica sempre aberta.
    attributionControl: { compact: false },
  });

  // Gestos de rotação ficam ligados; quem controla a rotação no modo seguir é camera.ts.
  map.touchZoomRotate.enableRotation();
  return map;
}
