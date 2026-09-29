// Folha "themes" (título "Mapas"): grade de cartões, um por tema, com uma miniatura
// desenhada em SVG a partir de `preview` (chão, ruas, um trecho de rota e o destino).
// Tocar num cartão troca o tema e fecha a folha. Funciona com qualquer número de
// temas: tudo vem da lista THEMES de src/map/themes.ts.
import type * as maplibregl from 'maplibre-gl';
import { setState } from '../state';
import { THEMES, getTargetThemeId, setTheme, type ThemePreview } from '../map/themes';
import { createSheet } from './sheet';
import { toast } from './buttons';

/** Miniatura: quarteirões com ruas, uma avenida e a rota com o destino. */
function thumbnail(p: ThemePreview): string {
  return `
<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect width="120" height="80" fill="${p.land}"/>
  <g stroke="${p.road}" stroke-linecap="round" fill="none">
    <path d="M-5 58 L125 44" stroke-width="7"/>
    <path d="M30 -5 L42 85 M84 -5 L78 85" stroke-width="4"/>
    <path d="M-5 20 L125 14" stroke-width="3" opacity=".8"/>
  </g>
  <path d="M36 88 L40 55 L80 49 L82 22" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="7"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M36 88 L40 55 L80 49 L82 22" fill="none" stroke="${p.route}" stroke-width="4.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="82" cy="20" r="6" fill="${p.accent}" stroke="#fff" stroke-width="2"/>
</svg>`;
}

export function createThemePicker(root: HTMLElement, map: maplibregl.Map): void {
  const sheet = createSheet(root, 'themes', { title: 'Mapas' });
  const grid = document.createElement('div');
  grid.className = 'theme-grid';
  grid.setAttribute('role', 'radiogroup');
  grid.setAttribute('aria-label', 'Mapas');
  sheet.body.append(grid);

  const cards = THEMES.map((t) => {
    const card = document.createElement('button');
    card.className = 'theme-card';
    card.setAttribute('role', 'radio');
    card.dataset.theme = t.id;
    card.innerHTML = `<span class="theme-thumb">${thumbnail(t.preview)}</span><span class="theme-name"></span>`;
    card.querySelector('.theme-name')!.textContent = t.label;
    card.addEventListener('click', () => {
      setState({ sheet: null });
      if (t.id === getTargetThemeId()) return;
      setTheme(map, t.id).catch(() => toast(root, `Não consegui carregar o mapa ${t.label}.`));
    });
    return card;
  });
  grid.append(...cards);

  // Ao abrir, marca o tema atual.
  sheet.onOpen(() => {
    const current = getTargetThemeId();
    for (const card of cards) {
      const on = card.dataset.theme === current;
      card.classList.toggle('is-current', on);
      card.setAttribute('aria-checked', String(on));
    }
  });
}
