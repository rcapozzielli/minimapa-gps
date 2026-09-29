// Modo simulação (?sim na URL): durante a navegação, um "motorista falso" anda
// pela rota a ~50 km/h, uma posição por segundo, como o GPS faria. Serve para
// testar instruções, voz e recálculo sem sair de casa.
// O botão "Desviar" joga a posição 80 m para o lado, para forçar um recálculo.
import { getState, setState, subscribe, type LngLat } from '../state';
import type { Route } from '../services/osrm';
import { bearing, cumulativeDistances, offset, pointAlong, projectOnLine } from '../geo/math';

const SPEED_MS = 14; // ≈ 50 km/h
const TICK_MS = 1000;
const DETOUR_M = 80;

export function isSimulation(): boolean {
  return new URLSearchParams(location.search).has('sim');
}

export function startSimulator(buttonsRoot: HTMLElement): void {
  let route: Route | null = null;
  let cum: number[] = [];
  let along = 0;
  let detour: LngLat | null = null;

  const detourBtn = document.createElement('button');
  detourBtn.className = 'fab fab-sim';
  detourBtn.textContent = 'Desviar (sim)';
  detourBtn.hidden = true;
  buttonsRoot.append(detourBtn);
  detourBtn.addEventListener('click', () => {
    const { position, heading } = getState();
    if (position) detour = offset(position, (heading ?? 0) + 90, DETOUR_M);
  });

  subscribe((s, changed) => {
    if ('navigating' in changed) {
      detourBtn.hidden = !s.navigating;
      // Fim da navegação: o carro falso para (o velocímetro some).
      if (!s.navigating && s.speed) setState({ speed: 0 });
    }
    // Rota nova (ex.: recálculo): o desvio acabou; continua a partir da projeção na nova rota.
    if ('route' in changed) detour = null;
  });

  setInterval(() => {
    const s = getState();
    if (!s.navigating || !s.route || !s.position) return;

    // Enquanto desviado, fica parado fora da rota até o app recalcular.
    if (detour) {
      setState({ position: detour, speed: SPEED_MS, accuracy: 5 });
      return;
    }

    if (s.route !== route) {
      route = s.route;
      cum = cumulativeDistances(route.coords);
      along = projectOnLine(s.position, route.coords, cum).along;
    }

    along = Math.min(cum[cum.length - 1], along + SPEED_MS * (TICK_MS / 1000));
    const here = pointAlong(route.coords, cum, along).point;
    const ahead = pointAlong(route.coords, cum, along + 15).point;
    setState({ position: here, heading: bearing(here, ahead), speed: SPEED_MS, accuracy: 5 });
  }, TICK_MS);
}
