// Desenha a rota (brilho + contorno + linha) e o marcador do destino.
// As cores vêm do tema (metadata.minimapa.route). Como setStyle() apaga
// camadas que não são do tema, redesenhamos a cada tema aplicado.
import * as maplibregl from 'maplibre-gl';
import { getState, subscribe } from '../state';
import { getThemeMeta, onThemeApplied } from './themes';
import { getSkin } from '../skins';

const SOURCE = 'route';
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Largura da linha conforme o zoom; `extra` engrossa para contorno/brilho. */
function width(extra: number): maplibregl.ExpressionSpecification {
  return ['interpolate', ['exponential', 1.5], ['zoom'], 10, 4 + extra / 2, 14, 8 + extra, 18, 18 + extra * 2];
}

export function setupRouteLayer(map: maplibregl.Map): void {
  // Pino do destino: desenho e ponto de ancoragem vêm da skin do tema. O Marker não
  // troca de âncora depois de criado, então a cada tema criamos um novo.
  let pin = createPin(getThemeMeta().skin);
  const showPin = () => {
    const { destination } = getState();
    if (destination) pin.setLngLat(destination.lngLat).addTo(map);
    else pin.remove();
  };

  onThemeApplied((meta) => {
    addLayers(map);
    pin.remove();
    pin = createPin(meta.skin);
    showPin();
  });

  subscribe((_s, changed) => {
    if ('route' in changed || 'nav' in changed) updateData(map);
    if ('destination' in changed) showPin();
  });
}

function createPin(skinId: string | undefined): maplibregl.Marker {
  const skin = getSkin(skinId);
  const el = document.createElement('div');
  el.className = 'waypoint';
  el.innerHTML = skin.pin;
  return new maplibregl.Marker({ element: el, anchor: skin.pinAnchor });
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
