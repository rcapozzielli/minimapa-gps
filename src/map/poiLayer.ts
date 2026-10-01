// Ícones de pontos de interesse (POI) no estilo de cada jogo: restaurantes, postos, hotéis...
//
// Dados: a camada `poi` dos tiles da OpenFreeMap (esquema OpenMapTiles), já baixada com o
// mapa (nenhuma requisição a mais). Ícones: src/skins/<skin>/poi/<categoria>.svg; cada tema
// usa os da sua skin (tema sem pasta poi/ fica sem ícones).
//
// Como setStyle() apaga imagens e camadas que não são do tema, tudo é refeito a cada tema
// aplicado (mesmo padrão do routeLayer.ts). Os ícones aparecem a partir do zoom 15, com a
// detecção de colisão do próprio MapLibre (um não cobre o outro), abaixo da rota.
//
// Aeroportos não estão na camada `poi`: vêm da `aerodrome_label` numa camada nossa à parte, a
// partir do zoom 11 (são referência de longe). Entram os que têm código IATA (Congonhas está no
// OSM como class "other") e os internacionais, públicos e regionais; heliportos e pistas
// particulares ficam de fora.
import * as maplibregl from 'maplibre-gl';
import { getState, subscribe } from '../state';
import { getPoiIcons } from '../skins';
import { onThemeApplied } from './themes';

const CAMADA = 'poi-icones';
const ZOOM_MINIMO = 15;
const CAMADA_AEROPORTOS = 'poi-aeroportos';
const ZOOM_AEROPORTOS = 11;
const CLASSES_AEROPORTO = ['international', 'public', 'regional'];
const CAMADAS = [CAMADA, CAMADA_AEROPORTOS];

/** Categoria do app -> valores de `class` na camada `poi` do OpenMapTiles. */
const CATEGORIAS: Record<string, string[]> = {
  restaurante: ['restaurant'],
  'fast-food': ['fast_food'],
  bar: ['bar', 'beer'],
  cafe: ['cafe'],
  loja: ['shop', 'grocery'],
  posto: ['fuel'],
  farmacia: ['pharmacy', 'hospital'],
  hotel: ['lodging'],
};
const NOME_DA_CATEGORIA: Record<string, string> = {
  restaurante: 'Restaurante',
  'fast-food': 'Fast food',
  bar: 'Bar',
  cafe: 'Café',
  loja: 'Loja',
  posto: 'Posto de combustível',
  farmacia: 'Farmácia / hospital',
  hotel: 'Hotel',
  aeroporto: 'Aeroporto',
};

/** class do OpenMapTiles -> categoria do app. */
const CATEGORIA_DA_CLASSE = Object.fromEntries(
  Object.entries(CATEGORIAS).flatMap(([cat, classes]) => classes.map((c) => [c, cat])),
);

export function setupPoiLayer(map: maplibregl.Map): void {
  let versao = 0;
  let icones: Record<string, string> = {};
  let popup: maplibregl.Popup | null = null;

  onThemeApplied(async (meta) => {
    const minha = ++versao;
    popup?.remove();
    icones = getPoiIcons(meta.skin) ?? {};
    if (!Object.keys(icones).length) return;
    await Promise.all(Object.entries(icones).map(([cat, svg]) => registrarIcone(map, `poi-${cat}`, svg)));
    // Se o tema trocou enquanto os ícones eram desenhados, este resultado não vale mais.
    if (minha !== versao || map.getLayer(CAMADA)) return;
    adicionarCamada(map);
    if (icones.aeroporto) adicionarCamadaAeroportos(map);
  });

  subscribe((s, changed) => {
    if (!('poisVisible' in changed)) return;
    for (const id of CAMADAS) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', s.poisVisible ? 'visible' : 'none');
    }
    if (!s.poisVisible) popup?.remove();
  });

  // Tocar num ícone: balão com o nome, no estilo do tema (classe popup-poi + skin).
  const aoTocar = (e: maplibregl.MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f || f.geometry.type !== 'Point') return;
    const aeroporto = f.layer.id === CAMADA_AEROPORTOS;
    const cat = aeroporto ? 'aeroporto' : (CATEGORIA_DA_CLASSE[f.properties?.class] ?? '');
    let nome = (f.properties?.['name:pt'] ?? f.properties?.name ?? NOME_DA_CATEGORIA[cat]) as string;
    if (aeroporto && f.properties?.iata) nome += ` (${f.properties.iata})`;
    const conteudo = document.createElement('div');
    conteudo.className = 'popup-poi-conteudo';
    const texto = document.createElement('span');
    texto.textContent = nome; // textContent: o nome vem de fora (OSM), nada de innerHTML
    const icone = document.createElement('span');
    icone.className = 'popup-poi-icone';
    icone.innerHTML = icones[cat] ?? ''; // SVG nosso (src/skins), não vem de fora
    conteudo.append(texto, icone);
    popup?.remove();
    popup = new maplibregl.Popup({ closeButton: false, className: 'popup-poi', offset: 16, maxWidth: '260px' })
      .setLngLat(f.geometry.coordinates as [number, number])
      .setDOMContent(conteudo)
      .addTo(map);
  };
  for (const id of CAMADAS) {
    map.on('click', id, aoTocar);
    map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''));
  }
}

function adicionarCamada(map: maplibregl.Map): void {
  const fontes = map.getStyle().sources;
  const fonte = fontes.openmaptiles ? 'openmaptiles' : Object.keys(fontes).find((id) => fontes[id].type === 'vector');
  if (!fonte) return;
  // ['match', ['get','class'], ['restaurant'], 'restaurante', ['fast_food'], 'fast-food', ..., 'loja']
  const classeParaCategoria = [
    'match', ['get', 'class'],
    ...Object.entries(CATEGORIAS).flatMap(([cat, classes]) => [classes, cat]),
    'loja',
  ] as unknown as maplibregl.ExpressionSpecification;
  // Abaixo da rota (que o routeLayer.ts já desenhou neste mesmo tema).
  const antesDe = ['route-alt-casing', 'route-glow'].find((id) => map.getLayer(id));
  map.addLayer(
    {
      id: CAMADA,
      type: 'symbol',
      source: fonte,
      'source-layer': 'poi',
      minzoom: ZOOM_MINIMO,
      filter: ['match', ['get', 'class'], Object.values(CATEGORIAS).flat(), true, false],
      layout: {
        'icon-image': ['concat', 'poi-', classeParaCategoria],
        'icon-allow-overlap': false,
        'icon-padding': 4,
        'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
        visibility: getState().poisVisible ? 'visible' : 'none',
      },
    },
    antesDe,
  );
}

/** Aeroportos (camada `aerodrome_label`), também abaixo da rota. */
function adicionarCamadaAeroportos(map: maplibregl.Map): void {
  const fontes = map.getStyle().sources;
  const fonte = fontes.openmaptiles ? 'openmaptiles' : Object.keys(fontes).find((id) => fontes[id].type === 'vector');
  if (!fonte || map.getLayer(CAMADA_AEROPORTOS)) return;
  const antesDe = ['route-alt-casing', 'route-glow'].find((id) => map.getLayer(id));
  map.addLayer(
    {
      id: CAMADA_AEROPORTOS,
      type: 'symbol',
      source: fonte,
      'source-layer': 'aerodrome_label',
      minzoom: ZOOM_AEROPORTOS,
      filter: ['any', ['has', 'iata'], ['match', ['get', 'class'], CLASSES_AEROPORTO, true, false]],
      layout: {
        'icon-image': 'poi-aeroporto',
        'icon-allow-overlap': false,
        'icon-padding': 4,
        visibility: getState().poisVisible ? 'visible' : 'none',
      },
    },
    antesDe,
  );
}

/**
 * Desenha o SVG num canvas e registra como imagem do mapa (o MapLibre não usa SVG direto).
 * Ícones em pixel art (shape-rendering="crispEdges") são ampliados sem suavizar.
 */
async function registrarIcone(map: maplibregl.Map, id: string, svg: string): Promise<void> {
  const escala = 2; // nitidez em telas de alta densidade
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = !svg.includes('crispEdges');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (map.hasImage(id)) map.removeImage(id);
  map.addImage(id, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: escala });
}
