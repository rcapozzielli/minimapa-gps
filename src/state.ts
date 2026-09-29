// Estado global do app + aviso para quem quiser reagir às mudanças.
// É um "store" mínimo: set() mescla o que mudou e chama os ouvintes.

import type { Route } from './services/osrm';

export type LngLat = [number, number];

export interface Destination {
  lngLat: LngLat;
  label: string;
}

export interface AppState {
  /** Para onde vamos (da busca ou de um toque longo), ou null. */
  destination: Destination | null;
  /** Rota calculada até o destino. */
  route: Route | null;
  routeLoading: boolean;
  routeError: string | null;
  /** Última posição do GPS, ou null enquanto não chega a primeira. */
  position: LngLat | null;
  /** Direção do movimento em graus (0 = norte), ou null se ainda não se sabe. */
  heading: number | null;
  /** Precisão do GPS em metros. */
  accuracy: number | null;
  /** Câmera acompanhando o jogador? */
  following: boolean;
}

type Listener = (state: AppState, changed: Partial<AppState>) => void;

const state: AppState = {
  destination: null,
  route: null,
  routeLoading: false,
  routeError: null,
  position: null,
  heading: null,
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
