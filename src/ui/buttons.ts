// Linha de botões flutuantes de baixo, em três colunas:
//  - esquerda: o velocímetro (src/ui/speedometer.ts);
//  - centro: a pílula "Recentralizar" (aparece fora do modo seguir) e, no modo
//    simulação, o botão "Desviar (sim)";
//  - direita: vazia (a atribuição do OSM fica no canto inferior direito).
// Os botões do mapa (Camadas, bússola, voz) ficam na coluna da direita: mapControls.ts.
import { setState, subscribe } from '../state';

const RECENTER_ICON = `
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
  <path d="M12 2 L20 21 L12 16 L4 21 Z" fill="currentColor"/>
</svg>`;

export interface BottomRow {
  row: HTMLElement;
  /** Coluna da esquerda (velocímetro). */
  left: HTMLElement;
  /** Coluna do centro (Recentralizar, botão do simulador). */
  center: HTMLElement;
}

export function createButtons(root: HTMLElement): BottomRow {
  const row = document.createElement('div');
  row.className = 'fab-row';
  row.innerHTML = `<div class="fab-row-left"></div><div class="fab-row-center"></div><div class="fab-row-right"></div>`;
  root.append(row);
  const left = row.querySelector<HTMLElement>('.fab-row-left')!;
  const center = row.querySelector<HTMLElement>('.fab-row-center')!;

  const recenter = document.createElement('button');
  recenter.className = 'fab fab-pill';
  recenter.innerHTML = `${RECENTER_ICON}<span>Recentralizar</span>`;
  recenter.hidden = true;
  recenter.addEventListener('click', () => setState({ following: true }));
  center.append(recenter);

  subscribe((s, changed) => {
    if ('following' in changed) recenter.hidden = s.following;
  });
  return { row, left, center };
}

/** Mensagem temporária no topo: erro (vermelha) ou informação (cor do tema). */
export function toast(root: HTMLElement, msg: string, kind: 'error' | 'info' = 'error', ms = 5000): void {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.textContent = msg;
  root.append(el);
  setTimeout(() => el.remove(), ms);
}
