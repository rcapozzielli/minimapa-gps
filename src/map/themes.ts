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
}

interface ThemeInfo {
  id: string;
  label: string;
  /** Monta o estilo MapLibre completo do tema. */
  load: () => Promise<maplibregl.StyleSpecification>;
  /** Liga efeitos extras depois do setStyle; devolve a função que os desfaz. */
  enter?: (map: maplibregl.Map) => () => void;
}

// Cores da rota e da interface para os temas do sickmaps (que não trazem as nossas).
const MINECRAFT_META: ThemeMeta = {
  label: 'Minecraft',
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

/** Para adicionar um tema: crie o JSON em public/styles/ (ou use um tema do sickmaps) e registre aqui. */
export const THEMES: ThemeInfo[] = [
  jsonTheme('los-santos', 'Los Santos', 'los-santos.json'),
  sickmapsTheme('minecraft', MINECRAFT_META, minecraftEnter),
  // Outros temas do sickmaps entram numa linha, ex.:
  // sickmapsTheme('gta-v', { ...MINECRAFT_META, label: 'GTA V (sickmaps)' }),
];

const DEFAULT_META: ThemeMeta = {
  label: '',
  route: { color: '#c93fe0', casing: '#3a0d45', glow: '#e27bf2' },
  ui: {},
};
const STORAGE_KEY = 'minimapa:theme';

let currentMeta: ThemeMeta = DEFAULT_META;
let appliedUiKeys: string[] = [];
let current: { id: string; teardown: () => void } | null = null;
let switchToken = 0;
const appliedListeners: Array<(meta: ThemeMeta) => void> = [];

// ---------- Tipos de tema ----------

function jsonTheme(id: string, label: string, file: string): ThemeInfo {
  // BASE_URL cobre o caso de o app ser publicado numa subpasta (GitHub Pages).
  const url = `${import.meta.env.BASE_URL}styles/${file}`;
  return {
    id,
    label,
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
  extra?: (map: maplibregl.Map) => () => void,
): ThemeInfo {
  return {
    id: theme,
    label: meta.label,
    load: cached(async () => {
      const style = (await loadGameMapStyle(theme)) as maplibregl.StyleSpecification;
      flattenBuildings(style);
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
 * O Minecraft do sickmaps levanta os prédios em 3D com a altura real. Numa cidade
 * como São Paulo, com a câmera inclinada, eles escondem a rota. Mantemos os blocos,
 * mas baixos: 30% da altura, no máximo 25 m.
 */
function flattenBuildings(style: maplibregl.StyleSpecification): void {
  for (const layer of style.layers) {
    if (layer.type !== 'fill-extrusion' || !layer.paint) continue;
    const { paint } = layer;
    const h = paint['fill-extrusion-height'];
    const b = paint['fill-extrusion-base'];
    if (h !== undefined) paint['fill-extrusion-height'] = ['min', 25, ['*', 0.3, h]] as never;
    if (b !== undefined) paint['fill-extrusion-base'] = ['min', 25, ['*', 0.3, b]] as never;
  }
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
 * installMinecraftEnhancements espera o estilo estar 100% carregado; se não estiver,
 * ele aguarda o evento 'load' do mapa, que só dispara UMA vez na vida do mapa (e
 * nunca depois de um setStyle). Por isso só chamamos quando isStyleLoaded() é true.
 */
function minecraftEnter(map: maplibregl.Map): () => void {
  map.setPixelRatio(getMinecraftPixelRatio());
  let undoEnhancements: (() => void) | null = null;

  const tryInstall = () => {
    if (!map.isStyleLoaded()) return;
    stopWaiting();
    undoEnhancements = installMinecraftEnhancements(map);
    // A grade de chunks é adicionada por cima de tudo; colocamos abaixo da rota.
    if (map.getLayer('sickmaps-mc-chunk-lines') && map.getLayer('route-glow')) {
      map.moveLayer('sickmaps-mc-chunk-lines', 'route-glow');
    }
  };
  const startWaiting = () => {
    map.on('render', tryInstall);
    map.on('idle', tryInstall);
  };
  const stopWaiting = () => {
    map.off('style.load', startWaiting);
    map.off('render', tryInstall);
    map.off('idle', tryInstall);
  };
  map.once('style.load', startWaiting);

  return () => {
    stopWaiting();
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
  current = { id: theme.id, teardown: theme.enter?.(map) ?? (() => {}) };
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
