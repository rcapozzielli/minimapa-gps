// Modo "seguir": a câmera acompanha o jogador, inclinada em 3D e girada
// na direção do movimento. Arrastar o mapa sai do modo seguir.
//
// Câmera fiel ao jogo (temas com metadata.minimapa.cameraFiel, se o usuário escolher 'fiel'):
// norte sempre para cima (o mapa não gira; só a seta, em player.ts), zoom só em inteiros.
import * as maplibregl from 'maplibre-gl';
import { getState, setState, subscribe, type LngLat } from '../state';
import { getThemeMeta, onThemeApplied } from './themes';

const FOLLOW_PITCH = 60;
const FOLLOW_ZOOM = 17;

/**
 * Zoom desejado no modo seguir. Guardamos numa variável em vez de ler
 * map.getZoom(): se uma animação de zoom for interrompida pela próxima
 * leitura do GPS, o zoom "no meio do caminho" não vira o novo padrão.
 */
let followZoom = FOLLOW_ZOOM;

/** A câmera fiel ao jogo está ligada? (o tema oferece e o usuário escolheu) */
export function cameraFielAtiva(): boolean {
  return !!getThemeMeta().cameraFiel && getState().cameraMapa === 'fiel';
}

const ehInteiro = (z: number) => Math.abs(z - Math.round(z)) < 1e-6;

export function setupCamera(map: maplibregl.Map): void {
  let firstFix = true;

  // Eventos disparados por gesto do usuário têm originalEvent; os nossos (easeTo) não.
  map.on('dragstart', (e) => {
    if ('originalEvent' in e && e.originalEvent) setState({ following: false });
  });
  // Zoom de pinça (ou roda do mouse) vira o novo zoom do modo seguir (inteiro no modo fiel).
  map.on('zoomend', (e) => {
    if ('originalEvent' in e && e.originalEvent) {
      followZoom = cameraFielAtiva() ? Math.round(map.getZoom()) : map.getZoom();
    }
  });
  // Modo fiel: ao fim de qualquer movimento, o zoom "encaixa" num inteiro. Gesto do usuário
  // arredonda; os nossos (ex.: ver a rota inteira) arredondam para baixo, para tudo caber.
  // Seguindo o jogador, quem cuida é o follow() (o zoom-alvo dele já é inteiro).
  map.on('moveend', (e) => {
    const z = map.getZoom();
    if (!cameraFielAtiva() || ehInteiro(z)) return;
    const doUsuario = 'originalEvent' in e && !!e.originalEvent;
    if (getState().following && !doUsuario) return;
    map.easeTo({ zoom: doUsuario ? Math.round(z) : Math.floor(z), duration: 200 });
  });

  // Liga/desliga o modo fiel ao trocar de tema ou de escolha no seletor de mapas.
  const aplicarModo = () => {
    if (cameraFielAtiva()) {
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      followZoom = Math.round(followZoom);
      const z = map.getZoom();
      if (map.getBearing() !== 0 || !ehInteiro(z)) map.easeTo({ bearing: 0, zoom: Math.round(z), duration: 300 });
    } else {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.keyboard.enableRotation();
    }
    if (getState().following && getState().position) follow(map, false);
  };
  onThemeApplied(aplicarModo);

  subscribe((s, changed) => {
    if ('cameraMapa' in changed) aplicarModo();
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

/**
 * Mostra a rota inteira vista de cima (sai do modo seguir).
 * `bottom`: altura (px) coberta embaixo pela folha da rota, para a rota não ficar atrás dela.
 */
export function showRouteOverview(map: maplibregl.Map, coords: LngLat[], bottom = 220): void {
  if (!coords.length) return;
  setState({ following: false });
  const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
  // Espaço para a barra de busca (+ notch) em cima e a folha embaixo. Se o padding passar
  // da altura da tela, o fitBounds não faz nada: limitamos para sobrar ao menos 120 px de mapa.
  const h = map.getContainer().clientHeight;
  const top = 150;
  // bottom + 90: a folha + a fileira de botões que fica logo acima dela ("Recentralizar", 56 px + folgas).
  const bottomPad = Math.max(40, Math.min(bottom + 90, h - top - 120));
  map.fitBounds(bounds, {
    padding: { top, bottom: bottomPad, left: 48, right: 72 }, // à direita, a coluna de botões
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
    bearing: cameraFielAtiva() ? 0 : (heading ?? map.getBearing()),
    pitch: FOLLOW_PITCH,
    zoom: followZoom,
    padding: { top, bottom: 0, left: 0, right: 0 },
    duration: recentered ? 600 : 1000,
    easing: (t) => t, // linear: movimento contínuo entre leituras do GPS
  });
}
