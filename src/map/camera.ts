// Modo "seguir": a câmera acompanha o jogador, inclinada em 3D e girada
// na direção do movimento. Arrastar o mapa sai do modo seguir.
import type * as maplibregl from 'maplibre-gl';
import { getState, setState, subscribe } from '../state';

const FOLLOW_PITCH = 60;
const FOLLOW_ZOOM = 17;

export function setupCamera(map: maplibregl.Map): void {
  let firstFix = true;

  // Eventos disparados por gesto do usuário têm originalEvent; os nossos (easeTo) não.
  map.on('dragstart', (e) => {
    if ('originalEvent' in e && e.originalEvent) setState({ following: false });
  });

  subscribe((s, changed) => {
    if (!s.position) return;

    if (firstFix && changed.position) {
      firstFix = false;
      map.jumpTo({ center: s.position, zoom: FOLLOW_ZOOM, pitch: FOLLOW_PITCH });
      return;
    }

    const recentered = changed.following === true;
    if (s.following && (changed.position || changed.heading != null || recentered)) {
      follow(map, recentered);
    }
  });
}

function follow(map: maplibregl.Map, recentered: boolean): void {
  const { position, heading } = getState();
  if (!position) return;

  // Padding no topo empurra o jogador para o terço de baixo da tela,
  // como num minimapa de jogo: você vê mais do que está à frente.
  const top = map.getContainer().clientHeight * 0.35;

  map.easeTo({
    center: position,
    bearing: heading ?? map.getBearing(),
    pitch: FOLLOW_PITCH,
    // Ao recentralizar volta ao zoom padrão; senão respeita o zoom de pinça do usuário.
    zoom: recentered ? FOLLOW_ZOOM : map.getZoom(),
    padding: { top, bottom: 0, left: 0, right: 0 },
    duration: recentered ? 600 : 1000,
    easing: (t) => t, // linear: movimento contínuo entre leituras do GPS
  });
}
