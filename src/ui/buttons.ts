// Botões flutuantes da parte de baixo: tema, voz liga/desliga (durante a
// navegação) e "Recentralizar" (aparece fora do modo seguir).
import { setState, subscribe } from '../state';
import { setMuted } from '../nav/voice';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';

const RECENTER_ICON = `
<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
  <path d="M12 2 L20 21 L12 16 L4 21 Z" fill="currentColor"/>
</svg>`;

const THEME_ICON = `
<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.7-.8 1.7-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3z" fill="currentColor"/>
  <circle cx="7.5" cy="11" r="1.5" fill="var(--ui-bg)"/><circle cx="10" cy="7" r="1.5" fill="var(--ui-bg)"/>
  <circle cx="14.5" cy="7" r="1.5" fill="var(--ui-bg)"/><circle cx="17" cy="11" r="1.5" fill="var(--ui-bg)"/>
</svg>`;

/** `onTheme` é chamado ao tocar no botão de tema (quem sabe trocar é o main, que tem o mapa). */
export function createButtons(root: HTMLElement, onTheme: () => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'fab-row';
  root.append(row);

  const theme = document.createElement('button');
  theme.className = 'fab fab-round';
  theme.setAttribute('aria-label', 'Trocar tema');
  theme.innerHTML = THEME_ICON;
  theme.addEventListener('click', onTheme);
  row.append(theme);

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
