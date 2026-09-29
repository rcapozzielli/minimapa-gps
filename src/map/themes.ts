// Temas = arquivos de estilo MapLibre em public/styles/. Além das camadas do
// mapa, cada JSON tem um bloco "metadata.minimapa" com as cores da rota e da
// interface; aqui lemos esse bloco e aplicamos como variáveis CSS.
import type * as maplibregl from 'maplibre-gl';

export interface ThemeInfo {
  id: string;
  file: string;
}

/** Para adicionar um tema: crie o JSON em public/styles/ e registre aqui. */
export const THEMES: ThemeInfo[] = [{ id: 'los-santos', file: 'los-santos.json' }];

export interface ThemeMeta {
  label: string;
  route: { color: string; casing: string; glow: string };
  ui: Record<string, string>;
}

const DEFAULT_META: ThemeMeta = {
  label: '',
  route: { color: '#c93fe0', casing: '#3a0d45', glow: '#e27bf2' },
  ui: {},
};

let currentMeta: ThemeMeta = DEFAULT_META;
const appliedListeners: Array<(meta: ThemeMeta) => void> = [];

export function themeUrl(id: string): string {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  // BASE_URL cobre o caso de o app ser publicado numa subpasta (GitHub Pages).
  return `${import.meta.env.BASE_URL}styles/${theme.file}`;
}

export function getThemeMeta(): ThemeMeta {
  return currentMeta;
}

/** Chamado sempre que um tema termina de carregar (útil para redesenhar a rota). */
export function onThemeApplied(fn: (meta: ThemeMeta) => void): void {
  appliedListeners.push(fn);
}

/** Liga o mapa ao sistema de temas; chame uma vez, logo após criar o mapa. */
export function bindThemes(map: maplibregl.Map): void {
  // 'style.load' dispara no carregamento inicial e a cada setStyle().
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

export function setTheme(map: maplibregl.Map, id: string): void {
  map.setStyle(themeUrl(id));
}

function applyUiVars(ui: Record<string, string>): void {
  const root = document.documentElement.style;
  for (const [key, value] of Object.entries(ui)) root.setProperty(`--ui-${key}`, value);
}
