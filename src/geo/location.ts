// Lê o GPS continuamente e publica posição + direção no estado.
import { setState, type LngLat } from '../state';
import { bearing, distance } from './math';

/** Abaixo disso (m/s ≈ 3 km/h) a direção do GPS é ruído. */
const MIN_SPEED = 0.8;
/** Deslocamento mínimo para calcular a direção nós mesmos. */
const MIN_MOVE_M = 6;

let lastForHeading: LngLat | null = null;

export function startLocation(onError: (msg: string) => void): void {
  if (!('geolocation' in navigator)) {
    onError('Este navegador não tem GPS.');
    return;
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      const here: LngLat = [pos.coords.longitude, pos.coords.latitude];
      const { heading: gpsHeading, speed } = pos.coords;
      const patch: { position: LngLat; accuracy: number; heading?: number } = {
        position: here,
        accuracy: pos.coords.accuracy,
      };

      // Preferimos a direção que o próprio GPS informa (só vem em movimento).
      // Sem ela, calculamos pelo deslocamento desde o último ponto "longe o bastante".
      if (gpsHeading != null && !Number.isNaN(gpsHeading) && (speed ?? 0) > MIN_SPEED) {
        patch.heading = gpsHeading;
        lastForHeading = here;
      } else if (!lastForHeading) {
        lastForHeading = here;
      } else if (distance(lastForHeading, here) > MIN_MOVE_M) {
        patch.heading = bearing(lastForHeading, here);
        lastForHeading = here;
      }

      setState(patch);
    },
    (err) => {
      const msgs: Record<number, string> = {
        1: 'Permissão de localização negada. Libere nas configurações do navegador.',
        2: 'Não consegui obter sua localização.',
        3: 'O GPS demorou demais para responder.',
      };
      onError(msgs[err.code] ?? err.message);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
  );
}
