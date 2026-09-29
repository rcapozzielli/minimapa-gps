// Coluna de botões do mapa, à direita, logo abaixo da busca (estilo Google Maps):
//  - "Camadas": abre a folha de temas ('themes');
//  - bússola: só aparece com o mapa girado fora do modo seguir; toque = norte para cima;
//  - voz liga/desliga: só durante a navegação.
import type * as maplibregl from 'maplibre-gl';
import { getState, setState, subscribe } from '../state';
import { setMuted } from '../nav/voice';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';

const LAYERS_ICON = `
<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path d="M12 3 2 8.5 12 14l10-5.5z" fill="currentColor"/>
  <path d="M4.2 12.3 2 13.5 12 19l10-5.5-2.2-1.2L12 16.6z" fill="currentColor" opacity=".7"/>
</svg>`;

/** Agulha: metade norte vermelha (convenção de bússola), metade sul na cor do texto. */
const COMPASS_ICON = `
<svg class="compass-needle" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
  <path d="M12 2 16 12H8z" fill="#e53935"/>
  <path d="M12 22 8 12h8z" fill="currentColor" opacity=".85"/>
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
  layers.addEventListener('click', () => setState({ sheet: 'themes' }));

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

  col.append(layers, compass, mute);

  // A agulha gira ao contrário do mapa, para apontar sempre para o norte de verdade.
  const updateCompass = () => {
    const b = map.getBearing();
    compass.hidden = getState().following || Math.abs(b) < BEARING_EPS;
    if (!compass.hidden) needle.style.transform = `rotate(${-b}deg)`;
  };
  map.on('rotate', updateCompass);
  map.on('moveend', updateCompass);

  subscribe((s, changed) => {
    if ('following' in changed) updateCompass();
    if ('navigating' in changed) mute.hidden = !s.navigating;
    if ('muted' in changed) renderMute(s.muted);
  });
}
