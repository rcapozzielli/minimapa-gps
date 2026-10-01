// Sistema de temas. Há dois tipos:
//  - Tema JSON (nossos): arquivo de estilo MapLibre em public/styles/.
//  - Tema sickmaps: estilo gerado pela biblioteca @iantroisi/sickmaps a partir
//    do estilo "dark" do OpenFreeMap (mesmos dados, outra aparência).
// Todo estilo carrega um bloco "metadata.minimapa" com as cores da rota e da
// interface; aqui lemos esse bloco e aplicamos como variáveis CSS.
//
// Trocar de tema chama map.setStyle(), que APAGA camadas que não são do tema
// (a nossa rota, a grade do Minecraft...). Por isso:
//  - usamos { diff: false }, que sempre dispara 'style.load' (no modo diff,
//    padrão do MapLibre, esse evento não dispara e a rota não seria redesenhada);
//  - routeLayer.ts redesenha a rota em onThemeApplied;
//  - efeitos extras de um tema (enter) são desfeitos antes de trocar.
import * as maplibregl from 'maplibre-gl';
import {
  decorateMapContainer,
  getMinecraftPixelRatio,
  installMinecraftEnhancements,
  loadGameMapStyle,
  undecorateMapContainer,
  type GameMapTheme,
} from '@iantroisi/sickmaps';
import '@iantroisi/sickmaps/css';
import { BLOCO_MC, hexMc, imagemDeTextura } from './patterns';
import { adicionarCurvasDeNivel } from './contornos';

export interface ThemeMeta {
  label: string;
  /** `estilo: 'redstone'`: rota de pó de redstone pixelado, sem brilho nem contorno (routeLayer.ts). */
  route: { color: string; casing: string; glow: string; estilo?: 'redstone' };
  ui: Record<string, string>;
  /** Classe CSS extra no contêiner do mapa enquanto o tema estiver ativo (ex.: papel envelhecido). */
  containerClass?: string;
  /** Skin da interface (fonte, forma dos painéis, ícones); ver src/skins/index.ts. */
  skin?: string;
  /**
   * Peças de HUD que o tema liga (ver src/ui/hud.ts): 'local' (caixa BAIRRO / RUA),
   * 'escala' (barra de escala), 'regiao' (nome grande do bairro), 'posicao' (coordenadas),
   * 'bussola' (rosa dos ventos girando com o mapa).
   * Cada uma vira a classe `mostra-<peça>` no <html>.
   */
  hud?: string[];
  /**
   * O tema oferece a câmera "fiel ao jogo" (norte sempre para cima, seta em passos de 22,5°,
   * zoom inteiro), que o usuário escolhe no seletor de mapas (ver camera.ts).
   */
  cameraFiel?: boolean;
  /** Ícones de POI em pixel art com 1 pixel do ícone = 1 pixel do canvas (temas pixelados). */
  iconesEmBlocos?: boolean;
}

/** Cores para desenhar a miniatura do tema no seletor, sem precisar baixar o estilo. */
export interface ThemePreview {
  /** Cor do "chão" do mapa. */
  land: string;
  /** Cor das ruas. */
  road: string;
  /** Cor da rota. */
  route: string;
  /** Cor de destaque da interface. */
  accent: string;
}

export interface ThemeInfo {
  id: string;
  label: string;
  preview: ThemePreview;
  /** Monta o estilo MapLibre completo do tema. */
  load: () => Promise<maplibregl.StyleSpecification>;
  /** Liga efeitos extras depois do setStyle; devolve a função que os desfaz. */
  enter?: (map: maplibregl.Map) => () => void;
}

// Cores da rota e da interface para os temas do sickmaps (que não trazem as nossas).
const MINECRAFT_META: ThemeMeta = {
  label: 'Minecraft 3D',
  skin: 'mc',
  route: { color: '#ff2a1a', casing: '#3d0500', glow: '#ff6a4d' }, // "redstone"
  // Painéis cinza-claros como o inventário do jogo, com texto cinza-escuro (contraste 6:1).
  // O verde de destaque é escuro o bastante para texto branco por cima (6,5:1).
  ui: {
    bg: '#c6c6c6',
    fg: '#373737',
    accent: '#2f6b1f',
    'accent-fg': '#ffffff',
    'player-fill': '#ffffff',
    'player-stroke': '#000000',
    font: "'Pixelify Sans', 'Courier New', ui-monospace, monospace",
  },
};

/** Para adicionar um tema: crie o JSON em public/styles/ (ou use um tema do sickmaps) e registre aqui. */
export const THEMES: ThemeInfo[] = [
  jsonTheme('los-santos', 'Los Santos', 'los-santos.json', {
    land: '#181818',
    road: '#979797',
    route: '#c93fe0',
    accent: '#c93fe0',
  }),
  jsonTheme('red-dead', 'Red Dead', 'red-dead.json', {
    land: '#dcc19c',
    road: '#41423d',
    route: '#9e1b1b',
    accent: '#9e1b1b',
  }),
  // (cores literais: MC_MAP só é definido mais abaixo no arquivo)
  sickmapsTheme('minecraft', MINECRAFT_META, {
    land: '#7fb238',
    road: '#8f8f8f',
    route: '#ff2a1a',
    accent: '#2f6b1f',
  }, minecraftEnter),
  // Minecraft (mapa): o visual do item "mapa" do jogo. 2D, pixelado, cores planas por bloco.
  jsonTheme(
    'minecraft-mapa',
    'Minecraft (mapa)',
    'minecraft-mapa.json',
    { land: '#6d9930', road: '#606060', route: '#ff0000', accent: '#2f6b1f' },
    { ajustar: prediosMinecraftMapa, enter: minecraftMapaEnter },
  ),
  // San Andreas: tema JSON próprio (antes era o do sickmaps, com a lógica invertida:
  // ruas claras sobre fundo escuro). Cores medidas em referencias/sa-mapa.png.
  jsonTheme('san-andreas', 'San Andreas', 'san-andreas.json', {
    land: '#9f9f9e',
    road: '#0e110b',
    route: '#ffd23a',
    accent: '#f0b429',
  }),
  // Hyrule (Zelda: Tears of the Kingdom), com curvas de nível geradas no navegador.
  jsonTheme(
    'hyrule',
    'Hyrule',
    'hyrule.json',
    { land: '#252729', road: '#a39d7b', route: '#3b9aac', accent: '#584d20' },
    { ajustar: (style) => adicionarCurvasDeNivel(style, { cor: '#a39d7b', antesDe: 'building' }) },
  ),
  // Outros temas do sickmaps entram numa linha, ex.:
  // sickmapsTheme('gta-v', { ...MINECRAFT_META, label: 'GTA V (sickmaps)' }, { ...cores }),
];

const DEFAULT_META: ThemeMeta = {
  label: '',
  route: { color: '#c93fe0', casing: '#3a0d45', glow: '#e27bf2' },
  ui: {},
};
const STORAGE_KEY = 'minimapa:theme';

let currentMeta: ThemeMeta = DEFAULT_META;
let appliedUiKeys: string[] = [];
let appliedSkinClass: string | null = null;
let appliedHudClasses: string[] = [];
let current: { id: string; teardown: () => void } | null = null;
let switchToken = 0;
/** Último tema pedido (pode ainda estar carregando), ou null se nenhum troca está pendente. */
let requestedId: string | null = null;
const appliedListeners: Array<(meta: ThemeMeta) => void> = [];

// ---------- Tipos de tema ----------

interface OpcoesTemaJson {
  /** Mexe no estilo depois de baixado (ex.: inserir curvas de nível). */
  ajustar?: (style: maplibregl.StyleSpecification) => void;
  /** Liga efeitos extras depois do setStyle; devolve a função que os desfaz. */
  enter?: (map: maplibregl.Map) => () => void;
}

function jsonTheme(
  id: string,
  label: string,
  file: string,
  preview: ThemePreview,
  { ajustar, enter }: OpcoesTemaJson = {},
): ThemeInfo {
  // BASE_URL cobre o caso de o app ser publicado numa subpasta (GitHub Pages).
  const url = `${import.meta.env.BASE_URL}styles/${file}`;
  return {
    id,
    label,
    preview,
    load: cached(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Tema ${label}: ${res.status}`);
      const style = (await res.json()) as maplibregl.StyleSpecification;
      ajustar?.(style);
      return style;
    }),
    enter,
  };
}

function sickmapsTheme(
  theme: GameMapTheme,
  meta: ThemeMeta,
  preview: ThemePreview,
  extra?: (map: maplibregl.Map) => () => void,
): ThemeInfo {
  return {
    id: theme,
    label: meta.label,
    preview,
    load: cached(async () => {
      const style = (await loadGameMapStyle(theme)) as maplibregl.StyleSpecification;
      if (theme === 'minecraft') tuneMinecraft(style);
      return { ...style, metadata: { ...(style.metadata as object), minimapa: meta } };
    }),
    enter: (map) => {
      // Classes de HUD do sickmaps no contêiner do mapa (a nossa interface fica num elemento à parte).
      const container = map.getContainer();
      decorateMapContainer(container, theme);
      const undoExtra = extra?.(map);
      return () => {
        undoExtra?.();
        undecorateMapContainer(container);
      };
    },
  };
}

/**
 * Nossos ajustes no Minecraft do sickmaps, inspirados no item "mapa" do jogo
 * (onde o mundo é desenhado com as cores dos blocos e o gramado domina):
 *  - O fundo do sickmaps é "bedrock" (quase preto) e só áreas residenciais e de
 *    vegetação ganham cor; o resto da cidade (comércio, indústria, vãos entre
 *    quadras) ficava preto. Agora o fundo é grama (com textura, ver minecraftEnter).
 *  - Bairros residenciais viram grama também (em vez de grandes manchas de terra).
 *  - Áreas comerciais/industriais ganham uma camada de pedra.
 *  - Prédios: mais baixos (30%, máx. 25 m) para não esconderem a rota, em degraus de 3 m
 *    (o horizonte fica escalonado, como blocos) e com textura de bloco (patterns.ts) conforme
 *    a altura real. O `id` do prédio alterna o material entre vizinhos da mesma faixa (os
 *    tiles não dizem o tipo do prédio). Faces chapadas, sem o degradê vertical do MapLibre.
 *  - Matas (landcover "wood") viram copas de folhas em 3D, como florestas vistas de cima.
 */
const MC_MAP = {
  grass: '#7fb238', // cor GRASS do item "mapa" do Minecraft
  stone: '#8f8f8f',
};

/**
 * Número estável por prédio, para variar o material entre vizinhos. Os ids dos tiles da
 * OpenFreeMap terminam sempre em 0 (o id do OSM vezes 10, mais o tipo): sem dividir por 10,
 * `id % n` só daria múltiplos de 10.
 */
const idDoPredio = ['floor', ['/', ['to-number', ['id'], 0], 10]];

/** Altura de um "degrau" dos prédios (m), depois do achatamento. */
const DEGRAU_M = 3;

/**
 * Textura do prédio (patterns.ts) pela altura REAL, alternando pelo `id` entre vizinhos:
 * casas (< 6 m) de tábuas, pedregulho ou terracota; sobrados e prédios baixos (< 15 m) de
 * tijolo ou terracota; médios (< 40 m) de tijolo de pedra ou quartzo; altos de vidro ou quartzo.
 */
function materialDoPredio(): unknown {
  const n = ['%', idDoPredio, 6]; // 0..5, estável por prédio
  const alterna = (...m: string[]) => ['match', ['%', n, m.length], ...m.slice(1).flatMap((x, i) => [i + 1, x]), m[0]];
  return [
    'step', ['coalesce', ['get', 'render_height'], 8],
    alterna('mc3d-tabuas', 'mc3d-pedregulho', 'mc3d-terracota'),
    6, alterna('mc3d-tijolo', 'mc3d-terracota'),
    15, alterna('mc3d-pedra', 'mc3d-quartzo'),
    40, alterna('mc3d-vidro', 'mc3d-quartzo'),
  ];
}

function tuneMinecraft(style: maplibregl.StyleSpecification): void {
  for (const layer of style.layers) {
    if (layer.type === 'background') {
      layer.paint = { ...layer.paint, 'background-color': MC_MAP.grass };
    }
    if (layer.id === 'landuse_residential') {
      layer.layout = { ...layer.layout, visibility: 'none' };
    }
    if (layer.type === 'fill-extrusion' && layer.paint) {
      const { paint } = layer;
      // Alturas lidas direto dos tiles: a expressão do sickmaps tem ['*', ['get', 'height'], 3],
      // que avisa no console quando o prédio não tem `height`.
      const h = paint['fill-extrusion-height'] && ['coalesce', ['get', 'render_height'], 8];
      const b = paint['fill-extrusion-base'] && ['coalesce', ['get', 'render_min_height'], 0];
      const degrau = (v: unknown, arred: 'ceil' | 'floor') =>
        ['*', DEGRAU_M, [arred, ['/', ['min', 25, ['*', 0.3, v]], DEGRAU_M]]];
      if (h !== undefined) paint['fill-extrusion-height'] = degrau(h, 'ceil') as never;
      if (b !== undefined) paint['fill-extrusion-base'] = degrau(b, 'floor') as never;
      delete paint['fill-extrusion-color']; // a textura substitui a cor
      paint['fill-extrusion-pattern'] = materialDoPredio() as never;
      paint['fill-extrusion-vertical-gradient'] = false;
    }
  }

  // Copas de folhas nas matas, logo abaixo dos prédios.
  const buildingIdx = style.layers.findIndex((l) => l.id === 'building');
  style.layers.splice(buildingIdx === -1 ? style.layers.length : buildingIdx, 0, {
    id: 'mc_copas',
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    minzoom: 13,
    filter: ['==', ['get', 'class'], 'wood'],
    paint: {
      'fill-extrusion-pattern': 'mc3d-folhas',
      'fill-extrusion-height': 2 * DEGRAU_M,
      'fill-extrusion-vertical-gradient': false,
    },
  });

  // Pedra nas áreas comerciais/industriais, logo abaixo da água.
  const waterIdx = style.layers.findIndex((l) => l.id === 'water');
  style.layers.splice(Math.max(0, waterIdx), 0, {
    id: 'mc_urban_stone',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['match', ['get', 'class'], ['commercial', 'industrial', 'retail', 'railway'], true, false],
    paint: { 'fill-color': MC_MAP.stone, 'fill-antialias': false },
  });
}

/**
 * Calçadas e caminhos de pedestre só a partir do zoom 17, em todo tema (inclusive os do
 * sickmaps): antes disso viram um tracejado denso que polui o mapa. Pega as camadas de
 * `transportation` cujo filtro trata de `class = path` sem misturar com ruas de verdade.
 */
const CLASSES_DE_RUA = /"(motorway|trunk|primary|secondary|tertiary|minor|service)"/;

function pedestresSoNoZ17(style: maplibregl.StyleSpecification): void {
  for (const layer of style.layers) {
    if (!('source-layer' in layer) || layer['source-layer'] !== 'transportation') continue;
    const filtro = JSON.stringify(layer.filter ?? '');
    if (filtro.includes('"path"') && !CLASSES_DE_RUA.test(filtro)) {
      layer.minzoom = Math.max(layer.minzoom ?? 0, 17);
    }
  }
}

/**
 * Túneis discretos, em todo tema: as camadas de rua deixam de desenhar túneis (que cruzavam
 * quadras e confundiam o caminho), e uma camada só, tracejada e fraca, desenha os túneis de
 * carro ABAIXO das ruas. A rota (routeLayer.ts) continua por cima, então um trajeto que passa
 * por um túnel continua visível.
 * Só mexe em filtros no formato de expressão (todos os temas atuais, inclusive a base do
 * sickmaps); um filtro no formato antigo não pode ser misturado com expressões e fica como está.
 */
const CLASSES_DE_CARRO = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'];
const OPERADORES_ANTIGOS = new Set(['has', '!has', 'in', '!in', 'none', '==', '!=', '<', '<=', '>', '>=']);

function filtroAntigo(f: unknown): boolean {
  if (!Array.isArray(f)) return false;
  const [op, a] = f;
  if (op === 'all' || op === 'any') return f.slice(1).some(filtroAntigo);
  // Formato antigo: ["==", "class", "x"], ["in", "class", ...], ["has", "name"]... (chave como texto).
  return OPERADORES_ANTIGOS.has(op) && typeof a === 'string' && !(op === 'in' && f.length === 3 && Array.isArray(f[2]));
}

function tuneisDiscretos(style: maplibregl.StyleSpecification): void {
  let primeiraRua = -1;
  let corDaRua: unknown;
  style.layers.forEach((layer, i) => {
    if (layer.type !== 'line' || layer['source-layer'] !== 'transportation') return;
    if (filtroAntigo(layer.filter)) return;
    const naoTunel: maplibregl.ExpressionSpecification = ['!=', ['get', 'brunnel'], 'tunnel'];
    layer.filter = (layer.filter ? ['all', naoTunel, layer.filter] : naoTunel) as maplibregl.FilterSpecification;
    if (primeiraRua === -1) primeiraRua = i;
    const cor = layer.paint?.['line-color'];
    if (corDaRua === undefined && typeof cor === 'string' && !layer.id.includes('casing')) corDaRua = cor;
  });
  if (primeiraRua === -1) return;
  const fonte = (style.layers[primeiraRua] as maplibregl.LineLayerSpecification).source;
  style.layers.splice(primeiraRua, 0, {
    id: 'tuneis',
    type: 'line',
    source: fonte,
    'source-layer': 'transportation',
    minzoom: 12,
    filter: ['all', ['==', ['get', 'brunnel'], 'tunnel'], ['match', ['get', 'class'], CLASSES_DE_CARRO, true, false]],
    layout: { 'line-cap': 'butt' },
    paint: {
      'line-color': typeof corDaRua === 'string' ? corDaRua : '#888888',
      'line-opacity': 0.3,
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1, 18, 6],
      'line-dasharray': [2, 2],
    },
  });
}

// FONTES DOS RÓTULOS: um tema JSON SEM `glyphs` desenha os rótulos com as fontes da própria
// página (src/styles/fonts.css), no modo de fontes locais do MapLibre (GL JS >= 5.11), que já
// espera a fonte carregar antes de desenhar. Em `text-font` use SÓ o nome exato da família CSS
// ("Oswald", "Rye", "Cinzel"...): o MapLibre usa o nome inteiro como família, então
// "Oswald SemiBold" não existiria e cairia numa fonte genérica.

/** Guarda o estilo pronto: trocar de volta para um tema não baixa nada de novo. */
function cached(fn: () => Promise<maplibregl.StyleSpecification>) {
  let p: Promise<maplibregl.StyleSpecification> | null = null;
  return () => {
    p ??= fn().catch((err) => {
      p = null; // se falhou, tenta de novo na próxima vez
      throw err;
    });
    // Cópia: o MapLibre não deve mexer no objeto guardado.
    return p.then((s) => structuredClone(s));
  };
}

/**
 * Efeitos do Minecraft: pixelRatio "pixelado" + texturas de bloco e grade de chunks.
 *
 * installMinecraftEnhancements só instala na hora se map.isStyleLoaded() for true,
 * o que exige TODOS os tiles da tela carregados. Senão, espera o evento 'load' do
 * mapa, que só dispara UMA vez na vida do mapa (nunca depois de um setStyle): as
 * texturas não apareceriam nunca. Esperar "tudo carregado" também não serve: com a
 * câmera se mexendo na navegação e internet lenta, esse momento pode não chegar.
 * O que a instalação precisa de fato (addImage, addLayer) já funciona no
 * 'style.load'. Então, só durante a chamada, dizemos ao sickmaps que está pronto.
 */
function minecraftEnter(map: maplibregl.Map): () => void {
  map.setPixelRatio(getMinecraftPixelRatio());
  let undoEnhancements: (() => void) | null = null;

  const install = () => {
    const shadow = map as unknown as { isStyleLoaded: () => boolean };
    shadow.isStyleLoaded = () => true; // propriedade própria "esconde" o método...
    try {
      undoEnhancements = installMinecraftEnhancements(map);
    } finally {
      delete (shadow as Partial<typeof shadow>).isStyleLoaded; // ...e ao apagá-la, o original volta
    }
    // Texturas de bloco (registradas pelo sickmaps) no nosso fundo de grama e na pedra urbana.
    map.setPaintProperty('background', 'background-pattern', 'mc_grass');
    if (map.getLayer('mc_urban_stone')) map.setPaintProperty('mc_urban_stone', 'fill-pattern', 'mc_stone');
    // A grade de chunks é adicionada por cima de tudo; colocamos abaixo da rota
    // (que o routeLayer.ts já redesenhou neste mesmo 'style.load', num ouvinte anterior).
    // A primeira camada da rota é a das alternativas (route-alt-casing), abaixo da escolhida.
    const firstRouteLayer = ['route-alt-casing', 'route-glow'].find((id) => map.getLayer(id));
    if (map.getLayer('sickmaps-mc-chunk-lines') && firstRouteLayer) {
      map.moveLayer('sickmaps-mc-chunk-lines', firstRouteLayer);
    }
  };
  map.once('style.load', install);

  return () => {
    map.off('style.load', install); // se sair antes de o estilo carregar
    undoEnhancements?.(); // remove o listener de 'moveend' e a grade
    // null = volta a usar o devicePixelRatio do aparelho (o tipo diz number, mas o MapLibre aceita null).
    map.setPixelRatio(null as unknown as number);
  };
}

/**
 * Minecraft (mapa): como o item "mapa" do jogo, que é plano e feito de "pixels" grandes.
 *  - Pixelado: o mapa é desenhado a 1/4 da resolução (BLOCO_MC: 1 bloco = 1 pixel do canvas
 *    = 4 px de tela) e o CSS amplia sem suavizar (image-rendering: pixelated, na classe
 *    moldura-mc do contêiner). Texturas, ícones e rótulos são pensados nessa escala.
 *  - 2D: inclinação máxima 0; a câmera de navegação pede 60°, mas o MapLibre limita a 0.
 *  - Câmera fiel ao jogo (norte para cima, zoom inteiro): opcional, ver camera.ts.
 * Tudo é desfeito ao sair do tema.
 */
function minecraftMapaEnter(map: maplibregl.Map): () => void {
  const pitchMaximoAntes = map.getMaxPitch();
  map.setMaxPitch(0);
  map.setPixelRatio(BLOCO_MC);
  return () => {
    map.setMaxPitch(pitchMaximoAntes);
    // null = volta a usar o devicePixelRatio do aparelho (o tipo diz number, mas o MapLibre aceita null).
    map.setPixelRatio(null as unknown as number);
  };
}

/**
 * Prédios do Minecraft (mapa) com o sombreamento do item mapa do jogo, onde a cor de cada
 * bloco depende do vizinho ao norte: mais alto = tom claro, mais baixo = tom escuro.
 * Para cada faixa de altura, de baixo para cima:
 *  - sombra: o prédio em preto a 29% (escurece o chão para o tom 0, ×0,71), deslocado para o
 *    sul tantos blocos quanto a faixa (fill-translate não aceita valor por prédio, daí as faixas);
 *  - borda: o prédio no tom 2 (claro) do material, no lugar;
 *  - prédio: com a textura do material, deslocado 1 bloco para o sul. Sobra a faixa clara ao norte.
 * Faixas da mais baixa para a mais alta: a sombra de um prédio alto cai sobre os baixos.
 * Material pelo `id` (os tiles não dizem o tipo do prédio): ~65% pedra, 15% tijolo,
 * 15% madeira, 5% quartzo (branco só como exceção).
 */
function prediosMinecraftMapa(style: maplibregl.StyleSpecification): void {
  const i = style.layers.findIndex((l) => l.id === 'building');
  if (i === -1) return;
  const altura = ['coalesce', ['get', 'render_height'], 8];
  const material = (pedra: string, tijolo: string, madeira: string, quartzo: string) => [
    'step', ['%', idDoPredio, 20], pedra, 13, tijolo, 16, madeira, 19, quartzo,
  ];
  // Deslocamento para o sul em blocos (4 px no zoom 17; acompanha a escala do mapa).
  const sul = (blocos: number) => [
    'interpolate', ['exponential', 2], ['zoom'],
    15, ['literal', [0, blocos]], 17, ['literal', [0, blocos * 4]],
  ];
  const base = { type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14 } as const;
  const faixas: Array<[number, number, number]> = [[0, 6, 1], [6, 15, 2], [15, 40, 3], [40, Infinity, 4]];
  const camadas = faixas.flatMap(([de, ate, blocos], n) => {
    const filter = ['all', ['>=', altura, de], ...(ate < Infinity ? [['<', altura, ate]] : [])];
    return [
      { ...base, id: `building-sombra-${n}`, filter,
        paint: { 'fill-color': '#000000', 'fill-opacity': 0.29, 'fill-antialias': false,
          'fill-translate': sul(1 + blocos), 'fill-translate-anchor': 'map' } },
      { ...base, id: `building-borda-${n}`, filter,
        paint: { 'fill-antialias': false,
          'fill-color': material(hexMc('STONE', 2), hexMc('COLOR_RED', 2), hexMc('WOOD', 2), hexMc('QUARTZ', 2)) } },
      { ...base, id: n === faixas.length - 1 ? 'building' : `building-${n}`, filter,
        paint: { 'fill-antialias': false,
          'fill-pattern': material('pedra-predio-mc', 'tijolo-mc', 'madeira-mc', 'quartzo-mc'),
          'fill-translate': sul(1), 'fill-translate-anchor': 'map' } },
    ];
  });
  style.layers.splice(i, 1, ...(camadas as unknown as maplibregl.LayerSpecification[]));
}

// ---------- API usada pelo resto do app ----------

export function getThemeMeta(): ThemeMeta {
  return currentMeta;
}

export function getCurrentThemeId(): string {
  return current?.id ?? THEMES[0].id;
}

/**
 * O tema que vai ficar na tela: o último pedido, se ainda estiver carregando, ou o atual.
 * O seletor usa este (e não o atual) para não ignorar uma escolha feita durante um carregamento.
 */
export function getTargetThemeId(): string {
  return requestedId ?? getCurrentThemeId();
}

export function getSavedThemeId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id && THEMES.some((t) => t.id === id)) return id;
  } catch {
    /* sem armazenamento: usa o padrão */
  }
  return THEMES[0].id;
}

export function nextThemeId(): string {
  const i = THEMES.findIndex((t) => t.id === getCurrentThemeId());
  return THEMES[(i + 1) % THEMES.length].id;
}

export function themeLabel(id: string): string {
  return THEMES.find((t) => t.id === id)?.label ?? id;
}

/** Chamado sempre que um tema termina de carregar (útil para redesenhar a rota). */
export function onThemeApplied(fn: (meta: ThemeMeta) => void): void {
  appliedListeners.push(fn);
}

/** Liga o mapa ao sistema de temas; chame uma vez, logo após criar o mapa. */
export function bindThemes(map: maplibregl.Map): void {
  // Rede de segurança: logo depois de sair do Minecraft, o worker do MapLibre ainda pode
  // processar um tile com as camadas antigas e pedir uma textura "mc_*" que já não existe
  // (só gera um aviso no console). Respondemos com uma imagem transparente de 1×1.
  // O mesmo resolvedor cria as nossas texturas geradas em código (src/map/patterns.ts),
  // pedidas pelos temas pelo nome em background-pattern / fill-pattern.
  map.setMissingStyleImageResolver((id) => {
    if (map.hasImage(id)) return;
    const textura = imagemDeTextura(id);
    if (textura) map.addImage(id, textura, { pixelRatio: textura.pixelRatio ?? 1 });
    else if (id.startsWith('mc_')) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
  });

  map.on('style.load', () => {
    registrarTexturas(map);
    const meta = (map.getStyle().metadata as { minimapa?: Partial<ThemeMeta> } | undefined)?.minimapa;
    currentMeta = {
      ...DEFAULT_META,
      ...meta,
      route: { ...DEFAULT_META.route, ...meta?.route },
    };
    applyUiVars(currentMeta.ui);
    applySkinClass(currentMeta.skin);
    applyHudClasses(currentMeta.hud ?? []);
    for (const fn of appliedListeners) fn(currentMeta);
  });
}

/** Troca o tema. Rejeita a Promise se o estilo não puder ser carregado (o tema atual continua). */
export async function setTheme(map: maplibregl.Map, id: string): Promise<void> {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const token = ++switchToken;
  requestedId = theme.id;
  let style: maplibregl.StyleSpecification;
  try {
    style = await theme.load();
    pedestresSoNoZ17(style);
    tuneisDiscretos(style);
  } catch (err) {
    if (token === switchToken) requestedId = null; // falhou: o alvo volta a ser o tema atual
    throw err;
  }
  // Se outra troca começou enquanto esperávamos, esta é descartada.
  if (token !== switchToken) return;
  requestedId = null;

  current?.teardown();
  map.setStyle(style, { diff: false });

  // Classe CSS opcional do tema (definida no próprio JSON, em metadata.minimapa.containerClass).
  const container = map.getContainer();
  const cls = (style.metadata as { minimapa?: ThemeMeta } | undefined)?.minimapa?.containerClass;
  if (cls) container.classList.add(cls);
  const undoEnter = theme.enter?.(map);
  current = {
    id: theme.id,
    teardown: () => {
      undoEnter?.();
      if (cls) container.classList.remove(cls);
    },
  };
  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
  } catch {
    /* ignora */
  }
}

function applyUiVars(ui: Record<string, string>): void {
  const root = document.documentElement.style;
  // Limpa as variáveis do tema anterior (senão, ex., a fonte do Minecraft "vazaria" para outro tema).
  for (const key of appliedUiKeys) root.removeProperty(`--ui-${key}`);
  for (const [key, value] of Object.entries(ui)) root.setProperty(`--ui-${key}`, value);
  appliedUiKeys = Object.keys(ui);
}

/**
 * Registra, antes do primeiro quadro, as texturas geradas em código (src/map/patterns.ts)
 * que o estilo usa em *-pattern. Só o resolvedor de imagens faltantes não basta: um
 * `background-pattern` sem a imagem pronta simplesmente não desenha o fundo.
 */
function registrarTexturas(map: maplibregl.Map): void {
  const registrar = (valor: unknown): void => {
    // O padrão pode ser uma expressão (ex.: material conforme a altura): procura os nomes dentro dela.
    if (Array.isArray(valor)) return valor.forEach(registrar);
    if (typeof valor !== 'string' || map.hasImage(valor)) return;
    const textura = imagemDeTextura(valor);
    if (textura) map.addImage(valor, textura, { pixelRatio: textura.pixelRatio ?? 1 });
  };
  for (const layer of map.getStyle().layers) {
    const paint = ('paint' in layer ? layer.paint : undefined) as Record<string, unknown> | undefined;
    for (const prop of ['background-pattern', 'fill-pattern', 'line-pattern', 'fill-extrusion-pattern']) {
      registrar(paint?.[prop]);
    }
  }
}

/** Troca as classes `mostra-<peça>` do <html> (liga as peças de HUD do tema; ver src/ui/hud.ts). */
function applyHudClasses(pecas: string[]): void {
  const cl = document.documentElement.classList;
  for (const c of appliedHudClasses) cl.remove(c);
  appliedHudClasses = pecas.map((p) => `mostra-${p}`);
  for (const c of appliedHudClasses) cl.add(c);
}

/** Troca a classe `skin-<id>` do <html> (liga o CSS da skin; ver src/skins/). */
function applySkinClass(skin: string | undefined): void {
  const cl = document.documentElement.classList;
  if (appliedSkinClass) cl.remove(appliedSkinClass);
  appliedSkinClass = skin ? `skin-${skin}` : null;
  if (appliedSkinClass) cl.add(appliedSkinClass);
}
