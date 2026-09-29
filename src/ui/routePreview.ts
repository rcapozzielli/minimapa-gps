// Folha "route": prévia da rota antes de navegar (estilo Google Maps).
// Mostra o destino, o tempo em destaque, distância · chegada, as opções de rota
// (a escolhida destacada) e o botão "Iniciar". Também mostra "calculando" e erros.
//
// Abre sozinha quando há destino e não estamos navegando; fecha ao cancelar,
// ao iniciar a navegação ou ao chegar. Não fecha arrastando: cancelar é no ✕.
import { getState, setState, subscribe, type AppState } from '../state';
import { startNavigation } from '../nav/navigator';
import { createSheet, type Sheet } from './sheet';
import { formatArrival, formatDistance, formatDuration } from './format';

export function createRoutePreview(root: HTMLElement): Sheet {
  const sheet = createSheet(root, 'route', { dismissible: false });
  sheet.el.setAttribute('aria-label', 'Prévia da rota');
  sheet.body.innerHTML = `
    <div class="rp-head">
      <div class="rp-dest"></div>
      <button class="btn-secondary rp-close" aria-label="Cancelar rota">✕</button>
    </div>
    <div class="rp-status" role="status" aria-live="polite">
      <span class="rp-status-text"></span>
      <button class="btn-secondary rp-retry">Tentar de novo</button>
    </div>
    <div class="rp-summary">
      <div class="rp-time"></div>
      <div class="rp-sub"></div>
    </div>
    <div class="rp-options" role="radiogroup" aria-label="Opções de rota"></div>
    <button class="btn-primary rp-start">Iniciar</button>`;

  const $ = <T extends HTMLElement>(sel: string) => sheet.body.querySelector<T>(sel)!;
  const dest = $('.rp-dest');
  const status = $('.rp-status');
  const statusText = $('.rp-status-text');
  const retry = $<HTMLButtonElement>('.rp-retry');
  const summary = $('.rp-summary');
  const time = $('.rp-time');
  const sub = $('.rp-sub');
  const options = $('.rp-options');
  const start = $<HTMLButtonElement>('.rp-start');

  $('.rp-close').addEventListener('click', () => setState({ destination: null }));
  start.addEventListener('click', startNavigation);
  // Tentar de novo: um objeto de destino novo faz o routing.ts pedir a rota outra vez.
  retry.addEventListener('click', () => {
    const d = getState().destination;
    if (d) setState({ destination: { ...d } });
  });

  let drawnRoutes: AppState['routes'] | null = null;

  const renderOptions = (s: AppState) => {
    if (s.routes !== drawnRoutes) {
      drawnRoutes = s.routes;
      const fastest = Math.min(...s.routes.map((r) => r.duration));
      options.replaceChildren(
        ...s.routes.map((r, i) => {
          const btn = document.createElement('button');
          btn.className = 'route-option';
          btn.setAttribute('role', 'radio');
          const diffMin = Math.round((r.duration - fastest) / 60);
          const diff = r.duration === fastest ? 'Mais rápida' : diffMin < 1 ? 'Tempo parecido' : `+${diffMin} min`;
          btn.innerHTML = `<span class="ro-time"></span><span class="ro-dist"></span><span class="ro-diff"></span>`;
          btn.querySelector('.ro-time')!.textContent = formatDuration(r.duration);
          btn.querySelector('.ro-dist')!.textContent = formatDistance(r.distance);
          btn.querySelector('.ro-diff')!.textContent = diff;
          btn.addEventListener('click', () => {
            const { routes } = getState();
            if (routes[i]) setState({ routeIndex: i, route: routes[i] });
          });
          return btn;
        }),
      );
    }
    options.querySelectorAll<HTMLElement>('.route-option').forEach((btn, i) => {
      const selected = i === s.routeIndex;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-checked', String(selected));
    });
    // Com uma rota só, a lista não acrescenta nada.
    options.hidden = s.routes.length < 2;
  };

  const render = () => {
    const s = getState();
    dest.textContent = s.destination?.label ?? '';
    const ready = !!s.route && !s.routeLoading && !s.routeError;
    summary.hidden = !ready;
    start.hidden = !ready;
    status.hidden = ready;
    status.classList.toggle('is-error', !!s.routeError);
    retry.hidden = !s.routeError;

    if (s.routeError) {
      statusText.textContent = s.routeError;
    } else if (!ready) {
      statusText.textContent = s.position ? 'Calculando a rota…' : 'Aguardando o GPS…';
    }
    if (s.route) {
      time.textContent = formatDuration(s.route.duration);
      sub.textContent = `${formatDistance(s.route.distance)} · chegada ${formatArrival(s.route.duration)}`;
    }
    if (ready) renderOptions(s);
    else options.hidden = true;
  };

  subscribe((s, changed) => {
    const wanted = !!s.destination && !s.navigating;
    if (wanted && s.sheet !== 'route' && ('destination' in changed || 'navigating' in changed || s.sheet === null)) {
      // Abre com um destino novo, ao sair da navegação, ou quando outra folha (ex.: Mapas) fecha.
      setState({ sheet: 'route' });
      return; // o setState acima já chamou este ouvinte de novo
    }
    if (!wanted && s.sheet === 'route') {
      setState({ sheet: null });
      return;
    }
    if (
      'destination' in changed || 'route' in changed || 'routes' in changed || 'routeIndex' in changed ||
      'routeLoading' in changed || 'routeError' in changed || 'sheet' in changed ||
      ('position' in changed && !s.route) // só importa enquanto espera o GPS
    ) {
      if (s.sheet === 'route') render();
    }
  });

  // O horário de chegada muda com o relógio: atualiza enquanto a folha estiver aberta.
  setInterval(() => {
    if (getState().sheet === 'route') render();
  }, 30_000);

  return sheet;
}
