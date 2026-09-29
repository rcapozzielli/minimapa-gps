// Cartão de baixo: tempo, distância e horário de chegada, ou o status da rota.
import { setState, subscribe } from '../state';
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
    <button class="trip-cancel" aria-label="Cancelar rota">✕</button>`;
  root.append(card);

  const time = card.querySelector<HTMLElement>('.trip-time')!;
  const sub = card.querySelector<HTMLElement>('.trip-sub')!;
  card.querySelector('.trip-cancel')!.addEventListener('click', () => setState({ destination: null }));

  subscribe((s) => {
    card.hidden = !s.destination;
    card.classList.toggle('trip-error', !!s.routeError);
    if (s.routeError) {
      time.textContent = 'Ops';
      sub.textContent = s.routeError;
    } else if (s.routeLoading) {
      time.textContent = 'Calculando…';
      sub.textContent = s.position ? s.destination?.label ?? '' : 'Aguardando o GPS';
    } else if (s.route) {
      time.textContent = formatDuration(s.route.duration);
      sub.textContent = `${formatDistance(s.route.distance)} · chegada ${formatArrival(s.route.duration)}`;
    }
  });
}
