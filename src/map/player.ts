// Marcador do jogador: uma seta em SVG que gira conforme a direção.
// O desenho vem da skin do tema (src/skins/index.ts) e é trocado a cada tema aplicado.
import * as maplibregl from 'maplibre-gl';
import { subscribe } from '../state';
import { getSkin } from '../skins';
import { getThemeMeta, onThemeApplied } from './themes';

export function createPlayer(map: maplibregl.Map): void {
  const el = document.createElement('div');
  el.className = 'player';
  el.innerHTML = getSkin(getThemeMeta().skin).player;
  // O Marker é um elemento DOM: o setStyle() não o apaga, basta trocar o desenho.
  onThemeApplied((meta) => {
    el.innerHTML = getSkin(meta.skin).player;
  });

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
