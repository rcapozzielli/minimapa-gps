// Rotas no servidor público de demonstração do OSRM (perfil carro).
// Política de uso: ele é compartilhado e sem garantia. Por isso garantimos
// no máximo uma requisição a cada 2 s, e só uma de cada vez.
import type { LngLat } from '../state';

export interface OsrmManeuver {
  type: string; // turn, depart, arrive, roundabout, fork, merge, ...
  modifier?: string; // left, right, slight left, sharp right, straight, uturn
  location: LngLat;
  bearing_before: number;
  bearing_after: number;
  exit?: number; // número da saída em rotatórias
}

export interface OsrmStep {
  distance: number; // metros até a próxima manobra
  duration: number; // segundos
  name: string; // nome da rua que você vai pegar
  ref?: string; // ex.: "SP-070"
  rotary_name?: string;
  destinations?: string;
  maneuver: OsrmManeuver;
  geometry: { coordinates: LngLat[] };
}

export interface Route {
  coords: LngLat[];
  distance: number; // metros
  duration: number; // segundos
  steps: OsrmStep[];
}

const URL_BASE = 'https://router.project-osrm.org/route/v1/driving/';
const MIN_INTERVAL_MS = 2000;

let lastRequestAt = 0;
let inflight: AbortController | null = null;

export class RouteError extends Error {}

/**
 * Calcula a rota de `from` até `to`. `heading` (opcional) diz em que direção
 * você está indo, para o OSRM não mandar dar meia-volta sem necessidade.
 */
export async function fetchRoute(from: LngLat, to: LngLat, heading?: number | null): Promise<Route> {
  inflight?.abort();
  const ctrl = new AbortController();
  inflight = ctrl;

  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  if (ctrl.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  lastRequestAt = Date.now();

  const coords = [from, to].map((c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`).join(';');
  const params = new URLSearchParams({ overview: 'full', geometries: 'geojson', steps: 'true' });
  if (heading != null) params.set('bearings', `${Math.round(heading)},60;`);

  const res = await fetch(`${URL_BASE}${coords}?${params}`, { signal: ctrl.signal });
  if (res.status === 429) throw new RouteError('Servidor de rotas ocupado. Tente de novo em instantes.');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new RouteError(
      data.code === 'NoRoute' ? 'Não encontrei rota de carro até esse destino.' : 'Não consegui calcular a rota.',
    );
  }

  const r = data.routes[0];
  return {
    coords: r.geometry.coordinates,
    distance: r.distance,
    duration: r.duration,
    steps: r.legs[0].steps,
  };
}
