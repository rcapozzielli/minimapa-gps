// Marcador do jogador: uma seta em SVG que gira conforme a direção.
import * as maplibregl from 'maplibre-gl';
import { subscribe } from '../state';

const ARROW_SVG = `
<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
  <path d="M20 3 L34 35 L20 27 L6 35 Z" fill="var(--player-fill)" stroke="var(--player-stroke)"
        stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;

export function createPlayer(map: maplibregl.Map): void {
  const el = document.createElement('div');
  el.className = 'player';
  el.innerHTML = ARROW_SVG;

  // rotationAlignment 'map': a rotação é relativa ao norte do mapa,
  // então a seta continua certa mesmo com o mapa girado.
  const marker = new maplibregl.Marker({
    element: el,
    rotationAlignment: 'map',
    pitchAlignment: 'map',
  });
  let added = false;

  subscribe((s, changed) => {
    if (changed.position && s.position) {
      marker.setLngLat(s.position);
      if (!added) {
        marker.addTo(map);
        added = true;
      }
    }
    if (changed.heading != null) marker.setRotation(changed.heading);
  });
}
