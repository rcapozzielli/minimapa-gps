// Estado global do app + aviso para quem quiser reagir às mudanças.
// É um "store" mínimo: set() mescla o que mudou e chama os ouvintes.

import type { Route } from './services/osrm';

export type LngLat = [number, number];

/** Folhas de baixo do app: prévia da rota, seletor de temas, chegada. */
export type SheetId = 'route' | 'themes' | 'arrived';

export interface Destination {
  lngLat: LngLat;
  label: string;
}

/** Progresso da navegação, recalculado a cada leitura do GPS. */
export interface NavProgress {
  /** Índice (em route.steps) da próxima manobra. */
  stepIndex: number;
  /** Metros até a próxima manobra. */
  distToManeuver: number;
  remainingDistance: number;
  remainingDuration: number;
  /** Seu ponto "encaixado" na rota e o segmento em que ele está (para apagar o trecho já percorrido). */
  snapped: LngLat;
  segIndex: number;
}

export interface AppState {
  /** Para onde vamos (da busca ou de um toque longo), ou null. */
  destination: Destination | null;
  /** Rota escolhida até o destino (é a que a navegação segue). */
  route: Route | null;
  /** Todas as opções de rota calculadas (a principal + alternativas); route === routes[routeIndex]. */
  routes: Route[];
  routeIndex: number;
  /** Qual folha de baixo está aberta (ver src/ui/sheet.ts), ou null. */
  sheet: SheetId | null;
  routeLoading: boolean;
  routeError: string | null;
  /** Navegação passo a passo ligada? (depois de tocar em "Iniciar") */
  navigating: boolean;
  nav: NavProgress | null;
  /** Recalculando a rota porque você saiu do trajeto. */
  rerouting: boolean;
  /** Voz desligada? */
  muted: boolean;
  /** Última posição do GPS, ou null enquanto não chega a primeira. */
  position: LngLat | null;
  /** Direção do movimento em graus (0 = norte), ou null se ainda não se sabe. */
  heading: number | null;
  /** Velocidade em m/s (0 se parado ou desconhecida). */
  speed: number;
  /** Precisão do GPS em metros. */
  accuracy: number | null;
  /** Câmera acompanhando o jogador? */
  following: boolean;
}

type Listener = (state: AppState, changed: Partial<AppState>) => void;

const state: AppState = {
  destination: null,
  route: null,
  routes: [],
  routeIndex: 0,
  sheet: null,
  routeLoading: false,
  routeError: null,
  navigating: false,
  nav: null,
  rerouting: false,
  muted: false,
  position: null,
  heading: null,
  speed: 0,
  accuracy: null,
  following: true,
};

const listeners = new Set<Listener>();

export function getState(): Readonly<AppState> {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state, patch);
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
