// Contas geográficas básicas. Coordenadas sempre em [lng, lat], como no MapLibre.
import type { LngLat } from '../state';

const R = 6371000; // raio da Terra em metros
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Distância em metros entre dois pontos (fórmula de haversine). */
export function distance(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ponto a `meters` de `p` na direção `bearingDeg` (aproximação plana; ótima para distâncias curtas). */
export function offset(p: LngLat, bearingDeg: number, meters: number): LngLat {
  const dNorth = meters * Math.cos(rad(bearingDeg));
  const dEast = meters * Math.sin(rad(bearingDeg));
  return [p[0] + deg(dEast / (R * Math.cos(rad(p[1])))), p[1] + deg(dNorth / R)];
}

/** Distância acumulada (m) do início da linha até cada vértice. */
export function cumulativeDistances(coords: LngLat[]): number[] {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + distance(coords[i - 1], coords[i]));
  return cum;
}

export interface Projection {
  /** Ponto da linha mais próximo de p. */
  point: LngLat;
  /** Metros do início da linha até esse ponto. */
  along: number;
  /** Distância de p até a linha, em metros. */
  dist: number;
  /** Índice do segmento (coords[seg] → coords[seg + 1]). */
  seg: number;
}

/**
 * Projeta p na linha: acha o ponto mais próximo nos segmentos [fromSeg, toSeg].
 * Usa coordenadas planas locais em metros, precisas o bastante na escala de uma rua.
 */
export function projectOnLine(
  p: LngLat,
  coords: LngLat[],
  cum: number[],
  fromSeg = 0,
  toSeg = coords.length - 2,
): Projection {
  const kx = (Math.PI / 180) * R * Math.cos(rad(p[1]));
  const ky = (Math.PI / 180) * R;
  let best: Projection = { point: coords[0], along: 0, dist: Infinity, seg: 0 };

  for (let i = Math.max(0, fromSeg); i <= Math.min(toSeg, coords.length - 2); i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky;
    const bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const x = ax + t * dx, y = ay + t * dy;
    const dist = Math.hypot(x, y);
    if (dist < best.dist) {
      best = {
        point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])],
        along: cum[i] + t * (cum[i + 1] - cum[i]),
        dist,
        seg: i,
      };
    }
  }
  return best;
}

/** Ponto que fica a `along` metros do início da linha. */
export function pointAlong(coords: LngLat[], cum: number[], along: number): { point: LngLat; seg: number } {
  if (along <= 0) return { point: coords[0], seg: 0 };
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < along) i++;
  const segLen = cum[i + 1] - cum[i];
  const t = segLen === 0 ? 0 : Math.min(1, (along - cum[i]) / segLen);
  const a = coords[i];
  const b = coords[i + 1] ?? a;
  return { point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], seg: i };
}

/** Direção de a até b em graus, 0 = norte, sentido horário. */
export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x =
    Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
