// Coluna de botões do mapa, à direita, logo abaixo da busca (estilo Google Maps):
//  - "Camadas": abre (ou fecha) a faixa de temas ('themes');
//  - bússola: só aparece com o mapa girado fora do modo seguir; toque = norte para cima;
//  - pontos de interesse liga/desliga (ícones de restaurantes, postos...; src/map/poiLayer.ts);
//  - voz liga/desliga: só durante a navegação;
//  - Recentralizar: só fora do modo seguir; toque = volta a seguir o jogador.
import type * as maplibregl from 'maplibre-gl';
import { getState, setState, subscribe } from '../state';
import { setMuted } from '../nav/voice';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';

const LAYERS_ICON = `
<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path d="M12 3 2 8.5 12 14l10-5.5z" fill="currentColor"/>
  <path d="M4.2 12.3 2 13.5 12 19l10-5.5-2.2-1.2L12 16.6z" fill="currentColor" opacity=".7"/>
</svg>`;

const POI_ICON = `
<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z" fill="currentColor"/>
  <path d="M9 7v3.5a1.2 1.2 0 0 0 2.4 0V7M10.2 7v6M14 7c-1 1-1 3 0 4v2" fill="none"
        stroke="var(--ui-panel-bg, #000)" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;
const CHAVE_POIS = 'minimapa:pois';

/** Agulha: metade norte vermelha (convenção de bússola), metade sul na cor do texto. */
const COMPASS_ICON = `
<svg class="compass-needle" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
  <path d="M12 2 16 12H8z" fill="#e53935"/>
  <path d="M12 22 8 12h8z" fill="currentColor" opacity=".85"/>
</svg>`;

/** Recentralizar: a seta do jogador. */
const RECENTER_ICON = `
<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path d="M12 2 L20 21 L12 16 L4 21 Z" fill="currentColor"/>
</svg>`;

/** Abaixo disso (graus) o mapa está "de norte para cima" e a bússola some. */
const BEARING_EPS = 0.5;

export function createMapControls(root: HTMLElement, map: maplibregl.Map): void {
  const col = document.createElement('div');
  col.className = 'map-controls';
  root.append(col);

  const layers = document.createElement('button');
  layers.className = 'fab fab-round';
  layers.setAttribute('aria-label', 'Camadas: escolher o mapa');
  layers.innerHTML = LAYERS_ICON;
  // Abre a faixa de mapas; se ela já estiver aberta, fecha.
  layers.addEventListener('click', () => setState({ sheet: getState().sheet === 'themes' ? null : 'themes' }));

  const compass = document.createElement('button');
  compass.className = 'fab fab-round compass';
  compass.setAttribute('aria-label', 'Apontar o mapa para o norte');
  compass.innerHTML = COMPASS_ICON;
  compass.hidden = true;
  const needle = compass.querySelector<SVGElement>('.compass-needle')!;
  compass.addEventListener('click', () => map.easeTo({ bearing: 0, pitch: 0, duration: 250 }));

  const mute = document.createElement('button');
  mute.className = 'fab fab-round';
  mute.hidden = true;
  mute.addEventListener('click', () => setMuted(!getState().muted));
  const renderMute = (muted: boolean) => {
    mute.innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
    mute.setAttribute('aria-label', muted ? 'Ligar voz' : 'Desligar voz');
    mute.setAttribute('aria-pressed', String(muted));
  };
  renderMute(getState().muted);

  const pois = document.createElement('button');
  pois.className = 'fab fab-round';
  pois.innerHTML = POI_ICON;
  pois.addEventListener('click', () => setState({ poisVisible: !getState().poisVisible }));
  const renderPois = (on: boolean) => {
    pois.setAttribute('aria-label', on ? 'Esconder pontos de interesse' : 'Mostrar pontos de interesse');
    pois.setAttribute('aria-pressed', String(on));
    pois.classList.toggle('is-off', !on);
  };

  const recenter = document.createElement('button');
  recenter.className = 'fab fab-round recenter';
  recenter.setAttribute('aria-label', 'Recentralizar');
  recenter.title = 'Recentralizar';
  recenter.innerHTML = RECENTER_ICON;
  recenter.hidden = getState().following;
  recenter.addEventListener('click', () => setState({ following: true }));

  col.append(layers, pois, compass, mute, recenter);

  // A agulha gira ao contrário do mapa, para apontar sempre para o norte de verdade.
  const updateCompass = () => {
    const b = map.getBearing();
    compass.hidden = getState().following || Math.abs(b) < BEARING_EPS;
    if (!compass.hidden) needle.style.transform = `rotate(${-b}deg)`;
  };
  map.on('rotate', updateCompass);
  map.on('moveend', updateCompass);

  subscribe((s, changed) => {
    if ('following' in changed) {
      updateCompass();
      recenter.hidden = s.following;
    }
    if ('navigating' in changed) mute.hidden = !s.navigating;
    if ('muted' in changed) renderMute(s.muted);
    if ('poisVisible' in changed) {
      renderPois(s.poisVisible);
      try {
        localStorage.setItem(CHAVE_POIS, s.poisVisible ? '1' : '0');
      } catch {
        /* sem armazenamento: vale só nesta sessão */
      }
    }
  });

  // Preferência salva dos pontos de interesse (padrão: ligados).
  let salvo: string | null = null;
  try {
    salvo = localStorage.getItem(CHAVE_POIS);
  } catch {
    /* sem armazenamento */
  }
  setState({ poisVisible: salvo !== '0' });
}
