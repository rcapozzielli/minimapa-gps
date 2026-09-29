// Folha "arrived": "Você chegou", com o nome do destino e o botão "OK".
// Quem abre é o main.ts (no aviso de chegada do navegador), com setState({ sheet: 'arrived' }).
// O nome vem do último destino: na hora em que a folha abre, o destino já foi limpo.
import { setState, subscribe } from '../state';
import { createSheet } from './sheet';
import { maneuverIcon } from './icons';

export function createArrivedSheet(root: HTMLElement): void {
  const sheet = createSheet(root, 'arrived', { title: 'Você chegou' });
  sheet.body.innerHTML = `
    <div class="arrived">
      <div class="arrived-icon">${maneuverIcon({ kind: 'arrive' })}</div>
      <div class="arrived-dest"></div>
    </div>
    <button class="btn-primary arrived-ok">OK</button>`;
  const dest = sheet.body.querySelector<HTMLElement>('.arrived-dest')!;
  const ok = sheet.body.querySelector<HTMLButtonElement>('.arrived-ok')!;
  ok.addEventListener('click', () => setState({ sheet: null }));

  let lastLabel = '';
  subscribe((s, changed) => {
    if ('destination' in changed && s.destination) lastLabel = s.destination.label;
  });
  sheet.onOpen(() => {
    dest.textContent = lastLabel;
    dest.hidden = !lastLabel;
  });
}
