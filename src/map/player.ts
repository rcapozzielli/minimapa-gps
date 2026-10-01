// Marcador do jogador: uma seta em SVG que gira conforme a direção.
// O desenho vem da skin do tema (src/skins/index.ts) e é trocado a cada tema aplicado.
import * as maplibregl from 'maplibre-gl';
import { subscribe } from '../state';
import { getSkin } from '../skins';
import { getThemeMeta, onThemeApplied } from './themes';
import { cameraFielAtiva } from './camera';

/** Câmera fiel ao jogo: a seta gira em 16 direções (passos de 22,5°), como no mapa do Minecraft. */
const PASSO_FIEL = 22.5;

export function createPlayer(map: maplibregl.Map): void {
  const el = document.createElement('div');
  el.className = 'player';
  el.innerHTML = getSkin(getThemeMeta().skin).player;
  // rotationAlignment 'map': a rotação é relativa ao norte do mapa,
  // então a seta continua certa mesmo com o mapa girado.
  const marker = new maplibregl.Marker({
    element: el,
    rotationAlignment: 'map',
    pitchAlignment: 'map',
  });
  let added = false;

  // Última direção recebida; a rotação mostrada depende do modo de câmera (reaplicada ao trocar).
  let heading: number | null = null;
  const girar = () => {
    if (heading == null) return;
    marker.setRotation(cameraFielAtiva() ? Math.round(heading / PASSO_FIEL) * PASSO_FIEL : heading);
  };
  // O Marker é um elemento DOM: o setStyle() não o apaga, basta trocar o desenho.
  onThemeApplied((meta) => {
    el.innerHTML = getSkin(meta.skin).player;
    girar();
  });

  subscribe((s, changed) => {
    if (changed.position && s.position) {
      marker.setLngLat(s.position);
      if (!added) {
        marker.addTo(map);
        added = true;
      }
    }
    if (changed.heading != null) heading = changed.heading;
    if (changed.heading != null || 'cameraMapa' in changed) girar();
  });
}
