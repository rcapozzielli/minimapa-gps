// Modo "seguir": a câmera acompanha o jogador, inclinada em 3D e girada
// na direção do movimento. Arrastar o mapa sai do modo seguir.
import * as maplibregl from 'maplibre-gl';
import { getState, setState, subscribe, type LngLat } from '../state';

const FOLLOW_PITCH = 60;
const FOLLOW_ZOOM = 17;

/**
 * Zoom desejado no modo seguir. Guardamos numa variável em vez de ler
 * map.getZoom(): se uma animação de zoom for interrompida pela próxima
 * leitura do GPS, o zoom "no meio do caminho" não vira o novo padrão.
 */
let followZoom = FOLLOW_ZOOM;

export function setupCamera(map: maplibregl.Map): void {
  let firstFix = true;

  // Eventos disparados por gesto do usuário têm originalEvent; os nossos (easeTo) não.
  map.on('dragstart', (e) => {
    if ('originalEvent' in e && e.originalEvent) setState({ following: false });
  });
  // Zoom de pinça (ou roda do mouse) vira o novo zoom do modo seguir.
  map.on('zoomend', (e) => {
    if ('originalEvent' in e && e.originalEvent) followZoom = map.getZoom();
  });

  subscribe((s, changed) => {
    if (!s.position) return;

    if (firstFix && changed.position) {
      firstFix = false;
      map.jumpTo({ center: s.position, zoom: FOLLOW_ZOOM, pitch: FOLLOW_PITCH });
      return;
    }

    const recentered = changed.following === true;
    if (recentered) followZoom = FOLLOW_ZOOM;
    if (s.following && (changed.position || changed.heading != null || recentered)) {
      follow(map, recentered);
    }
  });
}

/** Mostra a rota inteira vista de cima (sai do modo seguir). */
export function showRouteOverview(map: maplibregl.Map, coords: LngLat[]): void {
  setState({ following: false });
  const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
  map.fitBounds(bounds, {
    // Espaço para a barra de busca (+ notch) em cima e o cartão da viagem embaixo.
    padding: { top: 150, bottom: 220, left: 40, right: 40 },
    pitch: 0,
    bearing: 0,
    maxZoom: 17,
    duration: 800,
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
    zoom: followZoom,
    padding: { top, bottom: 0, left: 0, right: 0 },
    duration: recentered ? 600 : 1000,
    easing: (t) => t, // linear: movimento contínuo entre leituras do GPS
  });
}
