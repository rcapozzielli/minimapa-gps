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

export interface ThemeMeta {
  label: string;
  route: { color: string; casing: string; glow: string };
  ui: Record<string, string>;
  /** Classe CSS extra no contêiner do mapa enquanto o tema estiver ativo (ex.: papel envelhecido). */
  containerClass?: string;
  /** Skin da interface (fonte, forma dos painéis, ícones); ver src/skins/index.ts. */
  skin?: string;
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
  label: 'Minecraft',
  skin: 'mc',
  route: { color: '#ff2a1a', casing: '#3d0500', glow: '#ff6a4d' }, // "redstone"
  ui: {
    bg: 'rgba(28, 28, 28, 0.92)',
    fg: '#ffffff',
    accent: '#5b9c3a',
    'player-fill': '#ffffff',
    'player-stroke': '#000000',
    font: "'Courier New', ui-monospace, monospace",
  },
};

// San Andreas: o sickmaps já monta o radar do SA (chão verde-escuro, ruas claras, sem
// rótulos) e o CSS dele (classe sickmaps--gta-sa) dá o tom sépia e a moldura. Não precisou
// de ajuste como o tuneMinecraft: o estilo "dark" não tem prédios 3D nem camadas órfãs.
// Rota amarela, como os blips de missão do radar do SA; interface preta de texto claro.
const SA_META: ThemeMeta = {
  label: 'San Andreas',
  skin: 'sa',
  route: { color: '#ffd23a', casing: '#241a00', glow: '#ffe27a' },
  ui: {
    bg: 'rgba(0, 0, 0, 0.78)',
    fg: '#dfe8f4', // branco levemente azulado, como o texto dos menus do SA
    accent: '#f0b429', // dourado
    'accent-fg': '#000000',
    'player-fill': '#ffffff',
    'player-stroke': '#000000',
    font: "'Oswald', 'Arial Narrow', system-ui, sans-serif",
  },
};

/** Para adicionar um tema: crie o JSON em public/styles/ (ou use um tema do sickmaps) e registre aqui. */
export const THEMES: ThemeInfo[] = [
  jsonTheme('los-santos', 'Los Santos', 'los-santos.json', {
    land: '#2f3336',
    road: '#cdd0d2',
    route: '#c93fe0',
    accent: '#c93fe0',
  }),
  jsonTheme('red-dead', 'Red Dead', 'red-dead.json', {
    land: '#dec29b',
    road: '#5a4a3a',
    route: '#9e1b1b',
    accent: '#b22a22',
  }),
  // (cores literais: MC_MAP só é definido mais abaixo no arquivo)
  sickmapsTheme('minecraft', MINECRAFT_META, {
    land: '#7fb238',
    road: '#8f8f8f',
    route: '#ff2a1a',
    accent: '#5b9c3a',
  }, minecraftEnter),
  sickmapsTheme('gta-sa', SA_META, {
    land: '#2a3024',
    road: '#ebe4d4',
    route: '#ffd23a',
    accent: '#f0b429',
  }),
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
let current: { id: string; teardown: () => void } | null = null;
let switchToken = 0;
const appliedListeners: Array<(meta: ThemeMeta) => void> = [];

// ---------- Tipos de tema ----------

function jsonTheme(id: string, label: string, file: string, preview: ThemePreview): ThemeInfo {
  // BASE_URL cobre o caso de o app ser publicado numa subpasta (GitHub Pages).
  const url = `${import.meta.env.BASE_URL}styles/${file}`;
  return {
    id,
    label,
    preview,
    load: cached(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Tema ${label}: ${res.status}`);
      return res.json();
    }),
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
 *  - Prédios: materiais conforme a altura (tábuas, tijolos, tijolos de pedra,
 *    quartzo) e mais baixos (30%, máx. 25 m) para não esconderem a rota.
 */
const MC_MAP = {
  grass: '#7fb238', // cor GRASS do item "mapa" do Minecraft
  stone: '#8f8f8f',
  planks: '#a58a52',
  bricks: '#96503f',
  stoneBricks: '#7a7a7a',
  quartz: '#e9e4d8',
};

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
      const h = paint['fill-extrusion-height'];
      const b = paint['fill-extrusion-base'];
      if (h !== undefined) paint['fill-extrusion-height'] = ['min', 25, ['*', 0.3, h]] as never;
      if (b !== undefined) paint['fill-extrusion-base'] = ['min', 25, ['*', 0.3, b]] as never;
      paint['fill-extrusion-color'] = [
        'step', ['coalesce', ['get', 'render_height'], 8],
        MC_MAP.planks, 6, MC_MAP.bricks, 15, MC_MAP.stoneBricks, 40, MC_MAP.quartz,
      ] as never;
    }
  }

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
    if (map.getLayer('sickmaps-mc-chunk-lines') && map.getLayer('route-glow')) {
      map.moveLayer('sickmaps-mc-chunk-lines', 'route-glow');
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

// ---------- API usada pelo resto do app ----------

export function getThemeMeta(): ThemeMeta {
  return currentMeta;
}

export function getCurrentThemeId(): string {
  return current?.id ?? THEMES[0].id;
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
  map.setMissingStyleImageResolver((id) => {
    if (id.startsWith('mc_') && !map.hasImage(id)) {
      map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    }
  });

  map.on('style.load', () => {
    const meta = (map.getStyle().metadata as { minimapa?: Partial<ThemeMeta> } | undefined)?.minimapa;
    currentMeta = {
      ...DEFAULT_META,
      ...meta,
      route: { ...DEFAULT_META.route, ...meta?.route },
    };
    applyUiVars(currentMeta.ui);
    applySkinClass(currentMeta.skin);
    for (const fn of appliedListeners) fn(currentMeta);
  });
}

/** Troca o tema. Rejeita a Promise se o estilo não puder ser carregado (o tema atual continua). */
export async function setTheme(map: maplibregl.Map, id: string): Promise<void> {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const token = ++switchToken;
  const style = await theme.load();
  // Se outra troca começou enquanto esperávamos, esta é descartada.
  if (token !== switchToken) return;

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

/** Troca a classe `skin-<id>` do <html> (liga o CSS da skin; ver src/skins/). */
function applySkinClass(skin: string | undefined): void {
  const cl = document.documentElement.classList;
  if (appliedSkinClass) cl.remove(appliedSkinClass);
  appliedSkinClass = skin ? `skin-${skin}` : null;
  if (appliedSkinClass) cl.add(appliedSkinClass);
}
