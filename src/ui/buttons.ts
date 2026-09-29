// Botões flutuantes da parte de baixo: voz liga/desliga (durante a navegação)
// e "Recentralizar" (aparece fora do modo seguir).
import { setState, subscribe } from '../state';
import { setMuted } from '../nav/voice';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';

const RECENTER_ICON = `
<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
  <path d="M12 2 L20 21 L12 16 L4 21 Z" fill="currentColor"/>
</svg>`;

export function createButtons(root: HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.className = 'fab-row';
  root.append(row);

  const mute = document.createElement('button');
  mute.className = 'fab fab-round';
  mute.hidden = true;
  let muted = false;
  mute.addEventListener('click', () => setMuted(!muted));
  row.append(mute);

  const recenter = document.createElement('button');
  recenter.className = 'fab';
  recenter.setAttribute('aria-label', 'Recentralizar');
  recenter.innerHTML = `${RECENTER_ICON}<span>Recentralizar</span>`;
  recenter.hidden = true;
  recenter.addEventListener('click', () => setState({ following: true }));
  row.append(recenter);

  subscribe((s, changed) => {
    if ('following' in changed) recenter.hidden = s.following;
    if ('navigating' in changed) mute.hidden = !s.navigating;
    if ('muted' in changed) {
      muted = s.muted;
      mute.innerHTML = s.muted ? SPEAKER_OFF : SPEAKER_ON;
      mute.setAttribute('aria-label', s.muted ? 'Ligar voz' : 'Desligar voz');
    }
  });
  mute.innerHTML = SPEAKER_ON;
  mute.setAttribute('aria-label', 'Desligar voz');
  return row;
}

/** Mensagem temporária no topo: erro (vermelha) ou informação (cor do tema). */
export function toast(root: HTMLElement, msg: string, kind: 'error' | 'info' = 'error', ms = 5000): void {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  root.append(el);
  setTimeout(() => el.remove(), ms);
}
