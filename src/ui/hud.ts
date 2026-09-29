// Peças de HUD que cada tema liga no seu JSON (metadata.minimapa.hud), como nos jogos:
//   'local'   caixa "BAIRRO / RUA" (mapa de pausa do GTA V)
//   'escala'  barra de escala (GTA V)
//   'regiao'  nome grande do bairro atual (Zelda: Tears of the Kingdom)
//   'posicao' caixa com as coordenadas (Minecraft)
//   'bussola' rosa dos ventos girando com o mapa (Red Dead)
// themes.ts põe a classe `mostra-<peça>` no <html>; o CSS só mostra as peças ligadas, e a skin
// do tema dá a aparência. Tudo é criado uma vez; nada é recriado ao trocar de tema.
//
// Bairro e rua saem dos TILES QUE O MAPA JÁ BAIXOU (camadas `place` e `transportation_name`
// do esquema OpenMapTiles): nenhuma API nova, nenhuma requisição a mais. Navegando, a rua
// vem da própria rota. Atualiza no máximo uma vez por segundo.
import type * as maplibregl from 'maplibre-gl';
import { getState, subscribe, type LngLat } from '../state';
import { cumulativeDistances, distance, projectOnLine } from '../geo/math';

const INTERVALO_MS = 1000;
/** Rua mais próxima só vale se estiver até esta distância (senão, não mostramos rua). */
const RAIO_RUA_M = 40;
const CLASSES_BAIRRO = new Set(['neighbourhood', 'suburb', 'quarter']);

/**
 * Memória de bairros já vistos (nome -> ponto). O esquema OpenMapTiles não tem o contorno dos
 * bairros, só um ponto no meio de cada um; no zoom de navegação a área carregada é pequena e
 * esse ponto quase sempre fica fora dela. Então guardamos todo ponto de bairro que aparece
 * (visão geral da rota, zoom afastado) e escolhemos o mais próximo desta memória.
 */
const bairrosVistos = new Map<string, LngLat>();
const MAX_BAIRROS = 400;

const ligado = (peca: string) => document.documentElement.classList.contains(`mostra-${peca}`);

export function createHud(ui: HTMLElement, bottomStack: HTMLElement, map: maplibregl.Map): void {
  // Canto inferior esquerdo (GTA V): escala em cima, caixa de local embaixo. Fica na pilha de
  // baixo, então sobe junto quando uma folha abre.
  const canto = document.createElement('div');
  canto.className = 'hud-canto';
  canto.innerHTML = `
    <div class="hud-peca hud-escala" aria-hidden="true">
      <span class="hud-escala-barra"></span>
      <span class="hud-escala-zero">0</span><span class="hud-escala-valor"></span>
    </div>
    <div class="hud-peca hud-local-caixa" role="status"></div>`;
  bottomStack.prepend(canto);

  // Bússola (Red Dead): anel preto com 8 marcações e N/S/L/O, girando com o mapa.
  const bussola = document.createElement('div');
  bussola.className = 'hud-peca hud-bussola';
  bussola.setAttribute('aria-hidden', 'true');
  bussola.innerHTML = BUSSOLA_SVG;
  ui.append(bussola);
  const rosa = bussola.firstElementChild as SVGElement;
  let quadroBussola = 0;
  const girarBussola = () => {
    quadroBussola = 0;
    if (ligado('bussola')) rosa.style.transform = `rotate(${-map.getBearing()}deg)`;
  };
  map.on('rotate', () => {
    if (!quadroBussola) quadroBussola = requestAnimationFrame(girarBussola);
  });
  map.on('style.load', () => requestAnimationFrame(girarBussola));

  const regiao = document.createElement('div');
  regiao.className = 'hud-peca hud-regiao';
  regiao.setAttribute('role', 'status');
  const posicao = document.createElement('div');
  posicao.className = 'hud-peca hud-posicao';
  ui.append(regiao, posicao);


  const barra = canto.querySelector<HTMLElement>('.hud-escala-barra')!;
  const escalaValor = canto.querySelector<HTMLElement>('.hud-escala-valor')!;
  const caixaLocal = canto.querySelector<HTMLElement>('.hud-local-caixa')!;

  // ---- Bairro / rua ----
  let ultimo = 0;
  let agendado: number | undefined;
  const atualizarLocal = () => {
    agendado = undefined;
    ultimo = Date.now();
    if (!ligado('local') && !ligado('regiao')) return;
    const pos = getState().position;
    if (!pos || !map.isStyleLoaded()) return;
    const bairro = bairroMaisProximo(pos);
    const rua = ruaAtual(map, pos);
    caixaLocal.textContent = [bairro, rua].filter(Boolean).join(' / ');
    caixaLocal.hidden = !caixaLocal.textContent;
    regiao.textContent = bairro ?? '';
    regiao.hidden = !bairro;
  };
  const pedirLocal = () => {
    if (agendado !== undefined) return;
    agendado = window.setTimeout(atualizarLocal, Math.max(0, ultimo + INTERVALO_MS - Date.now()));
  };
  subscribe((_s, changed) => {
    if (changed.position || 'nav' in changed) pedirLocal();
  });
  map.on('idle', () => {
    lembrarBairros(map);
    pedirLocal(); // tiles novos (ex.: depois de trocar de tema)
  });

  // ---- Escala ----
  let quadro = 0;
  const atualizarEscala = () => {
    quadro = 0;
    if (!ligado('escala')) return;
    const { lat } = map.getCenter();
    // Metros por pixel no centro da tela (tiles de 512 px do MapLibre).
    const mPorPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** map.getZoom());
    const metros = distanciaRedonda(mPorPx * 110); // barra de até ~110 px
    barra.style.width = `${Math.round(metros / mPorPx)}px`;
    escalaValor.textContent = metros >= 1000 ? `${metros / 1000} km` : `${metros} m`;
  };
  map.on('move', () => {
    if (!quadro) quadro = requestAnimationFrame(atualizarEscala);
  });
  map.on('style.load', () => requestAnimationFrame(atualizarEscala));

  // ---- Posição ----
  subscribe((s, changed) => {
    if (!changed.position || !s.position) return;
    const [lng, lat] = s.position;
    posicao.textContent = `Posição: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  });
}

/**
 * Rosa dos ventos do minimapa do Red Dead (desenho próprio): anel preto grosso, 8 marcações
 * que atravessam o anel (as 4 cardeais maiores, com seta no norte) e N/S/L/O em letra de
 * cartaz. Cores medidas: anel e letras #000000. A letra usa a fonte da skin (Rye).
 */
const BUSSOLA_SVG = (() => {
  const marcas = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((a) => {
      const longa = a % 90 === 0;
      return `<line x1="50" y1="${longa ? 1 : 4}" x2="50" y2="${longa ? 17 : 14}" transform="rotate(${a} 50 50)"
        stroke="#000" stroke-width="${longa ? 3 : 2.5}"/>`;
    })
    .join('');
  const letras = [
    ['N', 0],
    ['L', 90],
    ['S', 180],
    ['O', 270],
  ]
    .map(([l, a]) => `<text x="50" y="27" transform="rotate(${a} 50 50)" text-anchor="middle"
        dominant-baseline="middle" font-size="12" fill="#000">${l}</text>`)
    .join('');
  return `<svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="41" fill="none" stroke="#000" stroke-width="7"/>
    ${marcas}
    <path d="M50 -4 L55 5 L45 5 Z" fill="#000"/>
    ${letras}
  </svg>`;
})();

/** Maior distância "redonda" (1, 2 ou 5 × 10ⁿ metros) que cabe em `max` metros. */
function distanciaRedonda(max: number): number {
  const base = 10 ** Math.floor(Math.log10(max));
  for (const m of [5, 2, 1]) if (m * base <= max) return m * base;
  return base;
}

function fonteVetorial(map: maplibregl.Map): string | undefined {
  const fontes = map.getStyle().sources;
  if (fontes.openmaptiles) return 'openmaptiles';
  return Object.keys(fontes).find((id) => fontes[id].type === 'vector');
}

const nomeDe = (p: Record<string, unknown> | null) =>
  (p?.['name:pt'] ?? p?.name ?? p?.['name:latin']) as string | undefined;

/** Guarda os pontos de bairro dos tiles carregados agora (chamado a cada 'idle' do mapa). */
function lembrarBairros(map: maplibregl.Map): void {
  if (!ligado('local') && !ligado('regiao')) return;
  const fonte = fonteVetorial(map);
  if (!fonte) return;
  for (const f of map.querySourceFeatures(fonte, { sourceLayer: 'place' })) {
    if (f.geometry.type !== 'Point' || !CLASSES_BAIRRO.has(f.properties?.class)) continue;
    const nome = nomeDe(f.properties);
    if (!nome) continue;
    bairrosVistos.delete(nome); // reinserir deixa os mais recentes no fim
    bairrosVistos.set(nome, f.geometry.coordinates as LngLat);
  }
  // Limite de memória: esquece os mais antigos.
  for (const nome of bairrosVistos.keys()) {
    if (bairrosVistos.size <= MAX_BAIRROS) break;
    bairrosVistos.delete(nome);
  }
}

/** Bairro mais próximo entre os já vistos (ver bairrosVistos). */
function bairroMaisProximo(pos: LngLat): string | undefined {
  let melhor: { nome: string; d: number } | undefined;
  for (const [nome, ponto] of bairrosVistos) {
    const d = distance(pos, ponto);
    if (!melhor || d < melhor.d) melhor = { nome, d };
  }
  return melhor?.nome;
}

function ruaAtual(map: maplibregl.Map, pos: LngLat): string | undefined {
  // Navegando: a rua em que você está é a do trecho atual da rota (o passo ANTES da próxima manobra).
  const { navigating, nav, route } = getState();
  if (navigating && nav && route) {
    const nome = route.steps[Math.max(0, nav.stepIndex - 1)]?.name;
    if (nome) return nome;
  }
  const fonte = fonteVetorial(map);
  if (!fonte) return;
  let melhor: { nome: string; d: number } | undefined;
  for (const f of map.querySourceFeatures(fonte, { sourceLayer: 'transportation_name' })) {
    const nome = nomeDe(f.properties);
    if (!nome) continue;
    const g = f.geometry;
    const linhas = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
    for (const linha of linhas as LngLat[][]) {
      if (linha.length < 2) continue;
      const d = projectOnLine(pos, linha, cumulativeDistances(linha)).dist;
      if (d < RAIO_RUA_M && (!melhor || d < melhor.d)) melhor = { nome, d };
    }
  }
  return melhor?.nome;
}
