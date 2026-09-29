// Ícones das manobras em SVG (48×48), desenhados por código: uma seta que
// sobe e dobra no ângulo da manobra. Cor = currentColor (herda do CSS).
import type { IconKind } from '../nav/instructions';

const STROKE = 'fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';

/** Ponta de seta (triângulo) em (x, y) apontando para o ângulo `a` (graus, 0 = cima). */
function head(x: number, y: number, a: number): string {
  const r = (a * Math.PI) / 180;
  const f = (dx: number, dy: number) => {
    // gira (dx, dy) pelo ângulo e translada até a ponta
    const rx = dx * Math.cos(r) - dy * Math.sin(r);
    const ry = dx * Math.sin(r) + dy * Math.cos(r);
    return `${(x + rx).toFixed(1)},${(y + ry).toFixed(1)}`;
  };
  return `<polygon points="${f(0, -9)} ${f(9, 3)} ${f(-9, 3)}" fill="currentColor"/>`;
}

function arrow(angle: number): string {
  const r = (angle * Math.PI) / 180;
  const len = 13;
  const ex = 24 + len * Math.sin(r);
  const ey = 22 - len * Math.cos(r);
  return `<path d="M24 44 V22 L${ex.toFixed(1)} ${ey.toFixed(1)}" ${STROKE}/>${head(ex, ey, angle)}`;
}

// No Brasil (mão à direita) o retorno é feito pela esquerda.
const UTURN = `<path d="M32 44 V20 a8 8 0 0 0 -16 0 V30" ${STROKE}/>${head(16, 33, 180)}`;

function roundabout(exit?: number): string {
  const label = exit
    ? `<text x="24" y="21" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="currentColor" font-family="sans-serif">${exit}</text>`
    : '';
  return `<circle cx="24" cy="20" r="10" ${STROKE.replace('stroke-width="6"', 'stroke-width="4.5"')}/>
    <path d="M24 44 V31" ${STROKE}/>${label}`;
}

const ARRIVE = `<path d="M14 44 V6" ${STROKE}/>
  <path d="M17 7 H38 L33 15 L38 23 H17 Z" fill="currentColor"/>`;

export function maneuverIcon(icon: IconKind): string {
  let body: string;
  switch (icon.kind) {
    case 'arrow':
      body = arrow(icon.angle);
      break;
    case 'uturn':
      body = UTURN;
      break;
    case 'roundabout':
      body = roundabout(icon.exit);
      break;
    case 'arrive':
      body = ARRIVE;
      break;
  }
  return `<svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">${body}</svg>`;
}

export const SPEAKER_ON = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
  <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export const SPEAKER_OFF = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
  <path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;
