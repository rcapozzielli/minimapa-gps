// Controlador de rota: quando o destino muda, pede as rotas ao OSRM (a melhor +
// alternativas). Se o GPS ainda não respondeu, espera a primeira posição.
// Quem escolhe outra alternativa (toque no mapa ou na folha da rota) faz
// setState({ routeIndex, route }); aqui só preenchemos as opções.
import { getState, setState, subscribe } from '../state';
import { fetchRoutes, RouteError, type Route } from '../services/osrm';

let pending = false;

/** `onNewRoutes` recebe todas as opções (para a câmera enquadrar todas). */
export function startRouting(onNewRoutes: (routes: Route[]) => void): void {
  subscribe((s, changed) => {
    if ('destination' in changed) {
      if (!s.destination) {
        pending = false;
        setState({ route: null, routes: [], routeIndex: 0, routeLoading: false, routeError: null });
        return;
      }
      pending = true;
      setState({ route: null, routes: [], routeIndex: 0, routeError: null, routeLoading: true });
    }
    if (pending && s.position && s.destination) {
      pending = false;
      void calculate(onNewRoutes);
    }
  });
}

/** Direção atual, só se estiver em movimento (parado, a direção é ruído). */
function movingHeading(): number | null {
  const { heading, speed } = getState();
  return speed > 2 ? heading : null;
}

/**
 * Recalcula a rota a partir de onde você está, mantendo o destino.
 * Usado pelo navegador quando você sai do trajeto. Retorna false se falhar.
 * No recálculo só importa a melhor rota (não há tempo de escolher dirigindo).
 */
export async function reroute(): Promise<boolean> {
  const { position, destination } = getState();
  if (!position || !destination) return false;
  setState({ rerouting: true });
  try {
    const [route] = await fetchRoutes(position, destination.lngLat, movingHeading(), false);
    if (getState().destination !== destination) return false;
    setState({ route, routes: [route], routeIndex: 0, rerouting: false });
    return true;
  } catch {
    setState({ rerouting: false });
    return false;
  }
}

async function calculate(onNewRoutes: (routes: Route[]) => void): Promise<void> {
  const { position, destination } = getState();
  if (!position || !destination) return;
  try {
    const routes = await fetchRoutes(position, destination.lngLat, movingHeading());
    // O usuário pode ter trocado/cancelado o destino enquanto esperávamos.
    if (getState().destination !== destination) return;
    setState({ routes, routeIndex: 0, route: routes[0], routeLoading: false });
    onNewRoutes(routes);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const msg = err instanceof RouteError ? err.message : 'Sem conexão com o servidor de rotas.';
    setState({ routeLoading: false, routeError: msg });
  }
}
