// "Tocar e segurar" no mapa. O MapLibre não tem esse evento, então montamos:
// um dedo parado por 550 ms dispara; mexer, soltar ou usar dois dedos cancela.
// No PC, o clique com o botão direito faz o mesmo.
import type * as maplibregl from 'maplibre-gl';
import type { LngLat } from '../state';

const HOLD_MS = 550;
const MOVE_TOLERANCE_PX = 12;

export function onLongPress(map: maplibregl.Map, cb: (lngLat: LngLat) => void): void {
  let timer: number | undefined;
  let start: maplibregl.Point | null = null;
  let lastFired = 0;

  const fire = (ll: maplibregl.LngLat) => {
    // Android também dispara 'contextmenu' num toque longo: evita marcar duas vezes.
    if (Date.now() - lastFired < 1000) return;
    lastFired = Date.now();
    navigator.vibrate?.(30);
    cb([ll.lng, ll.lat]);
  };
  const cancel = () => {
    clearTimeout(timer);
    start = null;
  };

  map.on('touchstart', (e) => {
    cancel();
    if (e.originalEvent.touches.length !== 1) return;
    start = e.point;
    const ll = e.lngLat;
    timer = window.setTimeout(() => fire(ll), HOLD_MS);
  });
  map.on('touchmove', (e) => {
    if (start && e.point.dist(start) > MOVE_TOLERANCE_PX) cancel();
  });
  map.on('touchend', cancel);
  map.on('touchcancel', cancel);
  map.on('contextmenu', (e) => fire(e.lngLat));
}
