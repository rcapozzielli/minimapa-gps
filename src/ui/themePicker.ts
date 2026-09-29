// Folha "themes" (título "Mapas"): grade de cartões, um por tema, com uma miniatura
// desenhada em SVG a partir de `preview` (chão, ruas, um trecho de rota e o destino).
// Tocar num cartão troca o tema e fecha a folha. Funciona com qualquer número de
// temas: tudo vem da lista THEMES de src/map/themes.ts.
import type * as maplibregl from 'maplibre-gl';
import { setState, subscribe, type CorJogador } from '../state';
import { THEMES, getTargetThemeId, getThemeMeta, setTheme, type ThemePreview } from '../map/themes';
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

  const cores = createCorJogador(sheet.body);

  // Ao abrir, marca o tema atual e mostra a escolha de cor só nos temas que a usam.
  sheet.onOpen(() => {
    const current = getTargetThemeId();
    for (const card of cards) {
      const on = card.dataset.theme === current;
      card.classList.toggle('is-current', on);
      card.setAttribute('aria-checked', String(on));
    }
    cores.hidden = !SKINS_COM_COR.has(getThemeMeta().skin ?? '');
  });
}

// ---------- Cor do jogador ----------
// Nos temas do GTA V dá para escolher a cor da seta, como os três protagonistas. A escolha
// vira o atributo data-cor-jogador no <html>; as cores ficam no skin.css do tema.
const SKINS_COM_COR = new Set(['gta']);
const CORES: Array<[CorJogador, string]> = [
  ['verde', 'Verde (Franklin)'],
  ['azul', 'Azul (Michael)'],
  ['laranja', 'Laranja (Trevor)'],
];
const CHAVE_COR = 'minimapa:cor-jogador';

function createCorJogador(parent: HTMLElement): HTMLElement {
  const linha = document.createElement('div');
  linha.className = 'cor-jogador';
  linha.setAttribute('role', 'radiogroup');
  linha.setAttribute('aria-label', 'Cor do jogador');
  linha.innerHTML = '<span class="cor-jogador-titulo">Personagem</span>';
  const botoes = CORES.map(([cor, nome]) => {
    const b = document.createElement('button');
    b.className = 'cor-jogador-opcao';
    b.dataset.cor = cor;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', nome);
    b.addEventListener('click', () => setState({ corJogador: cor }));
    return b;
  });
  linha.append(...botoes);
  parent.append(linha);

  subscribe((s, changed) => {
    if (!('corJogador' in changed)) return;
    document.documentElement.dataset.corJogador = s.corJogador;
    for (const b of botoes) b.setAttribute('aria-checked', String(b.dataset.cor === s.corJogador));
    try {
      localStorage.setItem(CHAVE_COR, s.corJogador);
    } catch {
      /* sem armazenamento: vale só nesta sessão */
    }
  });

  let salva: string | null = null;
  try {
    salva = localStorage.getItem(CHAVE_COR);
  } catch {
    /* sem armazenamento */
  }
  const inicial = CORES.find(([c]) => c === salva)?.[0] ?? 'verde';
  setState({ corJogador: inicial });
  return linha;
}
