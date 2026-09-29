// Botões flutuantes. Na fase 1: só "recentralizar" (aparece fora do modo seguir).
import { setState, subscribe } from '../state';

const RECENTER_ICON = `
<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
  <path d="M12 2 L20 21 L12 16 L4 21 Z" fill="currentColor"/>
</svg>`;

export function createButtons(root: HTMLElement): void {
  const recenter = document.createElement('button');
  recenter.className = 'fab fab-recenter';
  recenter.setAttribute('aria-label', 'Recentralizar');
  recenter.innerHTML = `${RECENTER_ICON}<span>Recentralizar</span>`;
  recenter.hidden = true;
  recenter.addEventListener('click', () => setState({ following: true }));
  root.append(recenter);

  subscribe((s, changed) => {
    if ('following' in changed) recenter.hidden = s.following;
  });
}

/** Mensagem temporária no rodapé (erros de GPS etc.). */
export function toast(root: HTMLElement, msg: string, ms = 5000): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.append(el);
  setTimeout(() => el.remove(), ms);
}
