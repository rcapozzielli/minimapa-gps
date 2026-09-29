// Desenha a rota (brilho + contorno + linha), as rotas alternativas e o marcador do destino.
// As cores vêm do tema (metadata.minimapa.route). Como setStyle() apaga
// camadas que não são do tema, redesenhamos a cada tema aplicado.
//
// Alternativas (antes de navegar): cinza, mais finas e ABAIXO da rota escolhida, para
// a hierarquia ficar clara (a escolhida sempre por cima). Tocar numa delas a escolhe.
import * as maplibregl from 'maplibre-gl';
import { getState, setState, subscribe } from '../state';
import { getThemeMeta, onThemeApplied } from './themes';
import { getSkin } from '../skins';

const SOURCE = 'route';
const ALT_SOURCE = 'route-alts';
/** Camadas das alternativas (a de "toque" é invisível e larga, para acertar com o dedo). */
const ALT_HIT_LAYER = 'route-alt-hit';
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Cinza neutro: funciona sobre fundos claros e escuros, e não compete com a cor da rota. */
const ALT_COLOR = '#9aa0a6';
const ALT_CASING = '#44484c';

/** Largura da linha conforme o zoom; `extra` engrossa para contorno/brilho (negativo afina). */
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
    if ('routes' in changed || 'routeIndex' in changed || 'navigating' in changed) updateAlternatives(map);
    if ('destination' in changed) showPin();
  });

  // Toque numa alternativa: ela vira a rota escolhida. O ouvinte "por camada" do MapLibre
  // continua valendo depois de um setStyle (ele ignora camadas que não existem no momento).
  map.on('click', ALT_HIT_LAYER, (e: maplibregl.MapLayerMouseEvent) => {
    const { routes, navigating } = getState();
    if (navigating) return;
    // As alternativas costumam dividir o começo e o fim com a rota escolhida. O
    // queryRenderedFeatures não respeita a ordem das camadas, então um toque em cima da
    // rota escolhida também "acerta" a faixa de toque da alternativa: nesse caso, ignoramos.
    // (Caixa de ±12 px em volta do dedo: a rota escolhida é bem mais fina que a faixa de toque.)
    const { x, y } = e.point;
    const box: [maplibregl.PointLike, maplibregl.PointLike] = [[x - 12, y - 12], [x + 12, y + 12]];
    if (map.queryRenderedFeatures(box, { layers: ['route-line', 'route-casing'] }).length) return;
    const i = Number(e.features?.[0]?.properties?.index);
    if (!Number.isInteger(i) || !routes[i]) return;
    setState({ routeIndex: i, route: routes[i] });
  });
  // No PC, o cursor vira "mãozinha" em cima de uma alternativa.
  map.on('mouseenter', ALT_HIT_LAYER, () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', ALT_HIT_LAYER, () => (map.getCanvas().style.cursor = ''));
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

  // Todas entram "antes de beforeId", na ordem em que são adicionadas: primeiro as
  // alternativas (ficam por baixo), depois a rota escolhida (fica por cima).
  map.addSource(ALT_SOURCE, { type: 'geojson', data: EMPTY });
  const alt = { type: 'line', source: ALT_SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' } } as const;
  map.addLayer({ ...alt, id: 'route-alt-casing', paint: { 'line-color': ALT_CASING, 'line-width': width(2) } }, beforeId);
  map.addLayer({ ...alt, id: 'route-alt-line', paint: { 'line-color': ALT_COLOR, 'line-width': width(-2) } }, beforeId);
  // Área de toque: larga (≈ 44 px) e transparente. queryRenderedFeatures considera a
  // largura da linha, não a opacidade, então ela "pega" o toque mesmo invisível.
  map.addLayer({ ...alt, id: ALT_HIT_LAYER, paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 44 } }, beforeId);

  map.addSource(SOURCE, { type: 'geojson', data: EMPTY });
  const common = { type: 'line', source: SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' } } as const;
  map.addLayer(
    { ...common, id: 'route-glow', paint: { 'line-color': c.glow, 'line-width': width(14), 'line-blur': 10, 'line-opacity': 0.45 } },
    beforeId,
  );
  map.addLayer({ ...common, id: 'route-casing', paint: { 'line-color': c.casing, 'line-width': width(5) } }, beforeId);
  map.addLayer({ ...common, id: 'route-line', paint: { 'line-color': c.color, 'line-width': width(0) } }, beforeId);
  updateData(map);
  updateAlternatives(map);
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

/** Alternativas = todas as rotas menos a escolhida; só antes de começar a navegar. */
function updateAlternatives(map: maplibregl.Map): void {
  const src = map.getSource<maplibregl.GeoJSONSource>(ALT_SOURCE);
  if (!src) return;
  const { routes, routeIndex, navigating } = getState();
  if (navigating) {
    src.setData(EMPTY);
    return;
  }
  src.setData({
    type: 'FeatureCollection',
    features: routes.flatMap((r, index) =>
      index === routeIndex
        ? []
        : [{ type: 'Feature', properties: { index }, geometry: { type: 'LineString', coordinates: r.coords } } as const],
    ),
  });
}
