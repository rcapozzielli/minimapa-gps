// Barra de baixo durante a navegação (estilo Google Maps/Waze): horário de chegada em
// destaque, tempo e km que faltam, e o botão ✕ "Encerrar".
import { setState, subscribe } from '../state';
import { formatArrival, formatDistance, formatDuration } from './format';

export function createNavBar(root: HTMLElement): void {
  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <div class="nav-bar-main" role="status">
      <div class="nav-bar-eta"></div>
      <div class="nav-bar-sub"></div>
    </div>
    <button class="btn-secondary nav-bar-end" aria-label="Encerrar navegação">
      <span aria-hidden="true">✕</span><span class="nav-bar-end-label">Encerrar</span>
    </button>`;
  root.append(bar);

  const eta = bar.querySelector<HTMLElement>('.nav-bar-eta')!;
  const sub = bar.querySelector<HTMLElement>('.nav-bar-sub')!;
  // Encerrar = esquecer o destino (o navegador para sozinho quando o destino some).
  bar.querySelector('.nav-bar-end')!.addEventListener('click', () => setState({ destination: null }));

  subscribe((s, changed) => {
    if (!('navigating' in changed || 'nav' in changed || 'route' in changed || 'rerouting' in changed)) return;
    bar.hidden = !s.navigating || !s.route;
    if (bar.hidden || !s.route) return;
    const dist = s.nav?.remainingDistance ?? s.route.distance;
    const dur = s.nav?.remainingDuration ?? s.route.duration;
    eta.textContent = formatArrival(dur);
    sub.textContent = s.rerouting ? 'Recalculando…' : `${formatDuration(dur)} · ${formatDistance(dist)}`;
  });
}
