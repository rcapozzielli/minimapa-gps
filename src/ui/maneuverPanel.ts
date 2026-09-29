// Painel do topo durante a navegação: ícone da próxima manobra, distância até
// ela, o que fazer e em qual rua. Substitui a barra de busca enquanto navega.
// Logo abaixo, um chip "Depois" mostra a manobra seguinte (quando existe), como
// no Google Maps: ajuda a se posicionar na faixa certa com antecedência.
import { getState, subscribe } from '../state';
import { buildInstruction } from '../nav/instructions';
import { isSilent } from '../nav/navigator';
import { maneuverIcon } from './icons';
import { formatDistance } from './format';

export function createManeuverPanel(root: HTMLElement): void {
  const wrap = document.createElement('div');
  wrap.className = 'nav-top';
  wrap.hidden = true;
  wrap.innerHTML = `
    <div class="maneuver" role="status">
      <div class="maneuver-icon"></div>
      <div class="maneuver-text">
        <div class="maneuver-dist"></div>
        <div class="maneuver-action"></div>
        <div class="maneuver-street"></div>
      </div>
    </div>
    <div class="maneuver-next panel" role="note" hidden>
      <span class="maneuver-next-label" aria-hidden="true">Depois</span>
      <span class="maneuver-next-icon" aria-hidden="true"></span>
    </div>`;
  root.append(wrap);

  const icon = wrap.querySelector<HTMLElement>('.maneuver-icon')!;
  const dist = wrap.querySelector<HTMLElement>('.maneuver-dist')!;
  const action = wrap.querySelector<HTMLElement>('.maneuver-action')!;
  const street = wrap.querySelector<HTMLElement>('.maneuver-street')!;
  const next = wrap.querySelector<HTMLElement>('.maneuver-next')!;
  const nextIcon = wrap.querySelector<HTMLElement>('.maneuver-next-icon')!;
  let lastStep: unknown = null;

  subscribe((s, changed) => {
    if (!('nav' in changed || 'navigating' in changed || 'rerouting' in changed)) return;
    wrap.hidden = !s.navigating || !s.nav;
    if (wrap.hidden || !s.nav || !s.route) return;

    if (s.rerouting) {
      dist.textContent = 'Recalculando…';
      return;
    }

    const steps = getState().route!.steps;
    const step = steps[s.nav.stepIndex];
    // Só redesenha ícone e textos quando a manobra muda; a distância muda sempre.
    if (step !== lastStep) {
      lastStep = step;
      const ins = buildInstruction(step);
      icon.innerHTML = maneuverIcon(ins.icon);
      action.textContent = ins.action;
      street.textContent = ins.street;
      street.hidden = !ins.street;

      // Manobra seguinte: a primeira depois desta que vira aviso (pula as "silenciosas").
      const after = steps.slice(s.nav.stepIndex + 1).find((st) => !isSilent(st));
      next.hidden = !after;
      if (after) {
        const insAfter = buildInstruction(after);
        nextIcon.innerHTML = maneuverIcon(insAfter.icon);
        next.setAttribute('aria-label', `Depois: ${insAfter.action}`);
      }
    }
    dist.textContent = formatDistance(s.nav.distToManeuver);
  });
}
