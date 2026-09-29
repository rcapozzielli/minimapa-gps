// Cartão de baixo: tempo, distância e horário de chegada, ou o status da rota.
// Antes de navegar mostra o botão "Iniciar"; durante, o que falta até o destino.
import { setState, subscribe } from '../state';
import { startNavigation } from '../nav/navigator';
import { formatArrival, formatDistance, formatDuration } from './format';

export function createTripInfo(root: HTMLElement): void {
  const card = document.createElement('div');
  card.className = 'trip';
  card.hidden = true;
  card.innerHTML = `
    <div class="trip-main">
      <div class="trip-time"></div>
      <div class="trip-sub"></div>
    </div>
    <button class="trip-start">Iniciar</button>
    <button class="trip-cancel" aria-label="Cancelar rota">✕</button>`;
  root.append(card);

  const time = card.querySelector<HTMLElement>('.trip-time')!;
  const sub = card.querySelector<HTMLElement>('.trip-sub')!;
  const start = card.querySelector<HTMLButtonElement>('.trip-start')!;
  const cancel = card.querySelector<HTMLButtonElement>('.trip-cancel')!;
  start.addEventListener('click', startNavigation);
  cancel.addEventListener('click', () => setState({ destination: null }));

  subscribe((s) => {
    card.hidden = !s.destination;
    card.classList.toggle('trip-error', !!s.routeError);
    start.hidden = !s.route || s.navigating;
    cancel.setAttribute('aria-label', s.navigating ? 'Encerrar navegação' : 'Cancelar rota');

    if (s.routeError) {
      time.textContent = 'Ops';
      sub.textContent = s.routeError;
    } else if (s.routeLoading) {
      time.textContent = 'Calculando…';
      sub.textContent = s.position ? s.destination?.label ?? '' : 'Aguardando o GPS';
    } else if (s.route) {
      const dist = s.nav?.remainingDistance ?? s.route.distance;
      const dur = s.nav?.remainingDuration ?? s.route.duration;
      time.textContent = formatDuration(dur);
      sub.textContent = `${formatDistance(dist)} · chegada ${formatArrival(dur)}`;
    }
  });
}
