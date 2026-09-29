// Desenha a rota (brilho + contorno + linha) e o marcador do destino.
// As cores vêm do tema (metadata.minimapa.route). Como setStyle() apaga
// camadas que não são do tema, redesenhamos a cada tema aplicado.
import * as maplibregl from 'maplibre-gl';
import { getState, subscribe } from '../state';
import { getThemeMeta, onThemeApplied } from './themes';

const SOURCE = 'route';
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const PIN_SVG = `
<svg viewBox="0 0 36 48" width="36" height="48" aria-hidden="true">
  <path d="M18 2C9.2 2 2 9 2 17.7 2 29.5 18 46 18 46s16-16.5 16-28.3C34 9 26.8 2 18 2z"
        fill="var(--ui-accent)" stroke="#000" stroke-opacity=".6" stroke-width="2"/>
  <circle cx="18" cy="18" r="6" fill="#fff"/>
</svg>`;

/** Largura da linha conforme o zoom; `extra` engrossa para contorno/brilho. */
function width(extra: number): maplibregl.ExpressionSpecification {
  return ['interpolate', ['exponential', 1.5], ['zoom'], 10, 4 + extra / 2, 14, 8 + extra, 18, 18 + extra * 2];
}

export function setupRouteLayer(map: maplibregl.Map): void {
  const pinEl = document.createElement('div');
  pinEl.className = 'waypoint';
  pinEl.innerHTML = PIN_SVG;
  const pin = new maplibregl.Marker({ element: pinEl, anchor: 'bottom' });

  onThemeApplied(() => addLayers(map));

  subscribe((s, changed) => {
    if ('route' in changed || 'nav' in changed) updateData(map);
    if ('destination' in changed) {
      if (s.destination) pin.setLngLat(s.destination.lngLat).addTo(map);
      else pin.remove();
    }
  });
}

function addLayers(map: maplibregl.Map): void {
  const { route: c } = getThemeMeta();
  // A rota fica acima de toda a geometria (ruas, prédios) e abaixo dos rótulos que vêm
  // depois dela, para os nomes das ruas continuarem legíveis. Não basta "antes do primeiro
  // rótulo": alguns estilos (ex.: o dark usado pelo sickmaps) têm rótulos no meio da lista.
  const layers = map.getStyle().layers;
  let lastGeometry = -1;
  layers.forEach((l, i) => {
    if (l.type !== 'symbol') lastGeometry = i;
  });
  const beforeId = layers[lastGeometry + 1]?.id;

  map.addSource(SOURCE, { type: 'geojson', data: EMPTY });
  const common = { type: 'line', source: SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' } } as const;
  map.addLayer(
    { ...common, id: 'route-glow', paint: { 'line-color': c.glow, 'line-width': width(14), 'line-blur': 10, 'line-opacity': 0.45 } },
    beforeId,
  );
  map.addLayer({ ...common, id: 'route-casing', paint: { 'line-color': c.casing, 'line-width': width(5) } }, beforeId);
  map.addLayer({ ...common, id: 'route-line', paint: { 'line-color': c.color, 'line-width': width(0) } }, beforeId);
  updateData(map);
}

function updateData(map: maplibregl.Map): void {
  const src = map.getSource<maplibregl.GeoJSONSource>(SOURCE);
  if (!src) return; // tema ainda carregando; addLayers vai chamar de novo
  const { route, nav } = getState();
  if (!route) {
    src.setData(EMPTY);
    return;
  }
  // Navegando: desenha só o que falta, a partir do seu ponto na rota (como no GPS do jogo).
  const coords = nav ? [nav.snapped, ...route.coords.slice(nav.segIndex + 1)] : route.coords;
  src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
}
