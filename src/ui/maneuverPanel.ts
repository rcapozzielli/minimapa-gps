// Painel do topo durante a navegação: ícone da próxima manobra, distância até
// ela, o que fazer e em qual rua. Substitui a barra de busca enquanto navega.
import { getState, subscribe } from '../state';
import { buildInstruction } from '../nav/instructions';
import { maneuverIcon } from './icons';
import { formatDistance } from './format';

export function createManeuverPanel(root: HTMLElement): void {
  const panel = document.createElement('div');
  panel.className = 'maneuver';
  panel.hidden = true;
  panel.setAttribute('role', 'status');
  panel.innerHTML = `
    <div class="maneuver-icon"></div>
    <div class="maneuver-text">
      <div class="maneuver-dist"></div>
      <div class="maneuver-action"></div>
      <div class="maneuver-street"></div>
    </div>`;
  root.append(panel);

  const icon = panel.querySelector<HTMLElement>('.maneuver-icon')!;
  const dist = panel.querySelector<HTMLElement>('.maneuver-dist')!;
  const action = panel.querySelector<HTMLElement>('.maneuver-action')!;
  const street = panel.querySelector<HTMLElement>('.maneuver-street')!;
  let lastStep: unknown = null;

  subscribe((s, changed) => {
    if (!('nav' in changed || 'navigating' in changed || 'rerouting' in changed)) return;
    panel.hidden = !s.navigating || !s.nav;
    if (panel.hidden || !s.nav || !s.route) return;

    if (s.rerouting) {
      dist.textContent = 'Recalculando…';
      return;
    }

    const step = getState().route!.steps[s.nav.stepIndex];
    // Só redesenha ícone e textos quando a manobra muda; a distância muda sempre.
    if (step !== lastStep) {
      lastStep = step;
      const ins = buildInstruction(step);
      icon.innerHTML = maneuverIcon(ins.icon);
      action.textContent = ins.action;
      street.textContent = ins.street;
      street.hidden = !ins.street;
    }
    dist.textContent = formatDistance(s.nav.distToManeuver);
  });
}
