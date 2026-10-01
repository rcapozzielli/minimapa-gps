// Linha de botões flutuantes de baixo, em três colunas:
//  - esquerda: o velocímetro (src/ui/speedometer.ts);
//  - centro: no modo simulação, o botão "Desviar (sim)";
//  - direita: vazia (a atribuição do OSM fica no canto inferior direito).
// Os botões do mapa (Camadas, bússola, voz, Recentralizar) ficam na coluna da direita: mapControls.ts.

export interface BottomRow {
  row: HTMLElement;
  /** Coluna da esquerda (velocímetro). */
  left: HTMLElement;
  /** Coluna do centro (botão do simulador). */
  center: HTMLElement;
}

export function createButtons(root: HTMLElement): BottomRow {
  const row = document.createElement('div');
  row.className = 'fab-row';
  row.innerHTML = `<div class="fab-row-left"></div><div class="fab-row-center"></div><div class="fab-row-right"></div>`;
  root.append(row);
  const left = row.querySelector<HTMLElement>('.fab-row-left')!;
  const center = row.querySelector<HTMLElement>('.fab-row-center')!;
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
