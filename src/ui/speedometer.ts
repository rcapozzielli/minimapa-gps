// Velocímetro redondo (canto inferior esquerdo), como no Waze: km/h a partir de
// state.speed (m/s, vindo do GPS ou do simulador). Some sem GPS ou parado.
import { subscribe } from '../state';

/** Abaixo disso (≈ 4 km/h) consideramos parado: a velocidade do GPS vira ruído. */
const MIN_SPEED_MS = 1.1;

export function createSpeedometer(root: HTMLElement): void {
  const el = document.createElement('div');
  el.className = 'speedo';
  el.hidden = true;
  el.setAttribute('role', 'img');
  el.innerHTML = `<span class="speedo-value"></span><span class="speedo-unit" aria-hidden="true">km/h</span>`;
  root.append(el);
  const value = el.querySelector<HTMLElement>('.speedo-value')!;

  subscribe((s, changed) => {
    if (!('speed' in changed || 'position' in changed)) return;
    el.hidden = !s.position || !(s.speed >= MIN_SPEED_MS);
    if (el.hidden) return;
    const kmh = String(Math.round(s.speed * 3.6));
    if (value.textContent !== kmh) {
      value.textContent = kmh;
      el.setAttribute('aria-label', `${kmh} quilômetros por hora`);
    }
  });
}
