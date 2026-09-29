// Controlador de rota: quando o destino muda, pede a rota ao OSRM.
// Se o GPS ainda não respondeu, espera a primeira posição.
import { getState, setState, subscribe } from '../state';
import { fetchRoute, RouteError, type Route } from '../services/osrm';

let pending = false;

export function startRouting(onNewRoute: (route: Route) => void): void {
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
      void calculate(onNewRoute);
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
 */
export async function reroute(): Promise<boolean> {
  const { position, destination } = getState();
  if (!position || !destination) return false;
  setState({ rerouting: true });
  try {
    const route = await fetchRoute(position, destination.lngLat, movingHeading());
    if (getState().destination !== destination) return false;
    setState({ route, routes: [route], routeIndex: 0, rerouting: false });
    return true;
  } catch {
    setState({ rerouting: false });
    return false;
  }
}

async function calculate(onNewRoute: (route: Route) => void): Promise<void> {
  const { position, destination } = getState();
  if (!position || !destination) return;
  try {
    const route = await fetchRoute(position, destination.lngLat, movingHeading());
    // O usuário pode ter trocado/cancelado o destino enquanto esperávamos.
    if (getState().destination !== destination) return;
    setState({ route, routes: [route], routeIndex: 0, routeLoading: false });
    onNewRoute(route);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const msg = err instanceof RouteError ? err.message : 'Sem conexão com o servidor de rotas.';
    setState({ routeLoading: false, routeError: msg });
  }
}
