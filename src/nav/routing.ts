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
        setState({ route: null, routeLoading: false, routeError: null });
        return;
      }
      pending = true;
      setState({ route: null, routeError: null, routeLoading: true });
    }
    if (pending && s.position && s.destination) {
      pending = false;
      void calculate(onNewRoute);
    }
  });
}

async function calculate(onNewRoute: (route: Route) => void): Promise<void> {
  const { position, destination, heading } = getState();
  if (!position || !destination) return;
  try {
    const route = await fetchRoute(position, destination.lngLat, heading);
    // O usuário pode ter trocado/cancelado o destino enquanto esperávamos.
    if (getState().destination !== destination) return;
    setState({ route, routeLoading: false });
    onNewRoute(route);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const msg = err instanceof RouteError ? err.message : 'Sem conexão com o servidor de rotas.';
    setState({ routeLoading: false, routeError: msg });
  }
}
