// Registro de skins: a "cara de jogo" da interface de cada tema.
//
// Um tema escolhe a skin em metadata.minimapa.skin (ex.: "gta"). Quando o tema carrega,
// themes.ts põe a classe `skin-<id>` no <html>, o que ativa o CSS de src/skins/<id>.css,
// e os marcadores (jogador e destino) pegam os SVGs daqui via getSkin().
//
// Regras para os SVGs (vêm da skill de cartografia do MapLibre):
//  - Contorno de contraste desenhado NO PRÓPRIO SVG: um marcador em DOM não tem halo como
//    os ícones SDF do mapa, então é o contorno que o separa de qualquer fundo.
//  - Sombra de contato (elipse borrada embaixo), e não uma sombra deslocada: "assenta" o
//    marcador no chão em vez de parecer que flutua.
//  - Forma diz o que é (seta = você, pino/blip = destino); não dependa só de cor.
//  - viewBox com folga, para o contorno e a sombra não serem cortados na borda.
//  - Ids dentro do SVG (gradientes, filtros) prefixados pela skin, para não colidirem.
//  - Pode usar var(--ui-player-fill), var(--ui-player-stroke) e var(--ui-accent).
import './gta.css';
import './sa.css';
import './rdr.css';
import './mc.css';
import './zelda.css';

export interface Skin {
  /** Seta do jogador. Aponta para CIMA (norte); o app gira conforme a direção. Centro = sua posição. */
  player: string;
  /** Marcador do destino. */
  pin: string;
  /** Qual ponto do SVG do destino fica sobre o local: 'bottom' (pino) ou 'center' (blip). */
  pinAnchor: 'bottom' | 'center';
}

const DEFAULT: Skin = {
  player: `
<svg viewBox="-4 -4 48 48" width="44" height="44" aria-hidden="true">
  <defs>
    <radialGradient id="sk-default-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="20" cy="23" rx="16" ry="14" fill="url(#sk-default-shadow)"/>
  <path d="M20 3 L34 35 L20 27 L6 35 Z" fill="var(--ui-player-fill)" stroke="var(--ui-player-stroke)"
        stroke-width="2.5" stroke-linejoin="round"/>
</svg>`,
  pin: `
<svg viewBox="0 0 36 52" width="36" height="52" aria-hidden="true">
  <defs>
    <radialGradient id="sk-default-pin-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".5"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="18" cy="48" rx="9" ry="3.5" fill="url(#sk-default-pin-shadow)"/>
  <path d="M18 2C9.2 2 2 9 2 17.7 2 29.5 18 46 18 46s16-16.5 16-28.3C34 9 26.8 2 18 2z"
        fill="var(--ui-accent)" stroke="#000" stroke-opacity=".6" stroke-width="2"/>
  <circle cx="18" cy="18" r="6" fill="#fff"/>
</svg>`,
  pinAnchor: 'bottom',
};

// ---------- Los Santos (GTA V) ----------
// Jogador: seta branca do radar, com a metade direita num cinza claro (dá volume, como se
// a luz viesse da esquerda) e contorno escuro. Destino: blip redondo magenta de aro branco
// (o "waypoint"), com um losango branco no meio; âncora no centro.
const GTA: Skin = {
  player: `
<svg viewBox="-4 -4 48 48" width="44" height="44" aria-hidden="true">
  <defs>
    <radialGradient id="sk-gta-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="20" cy="22" rx="15" ry="13" fill="url(#sk-gta-shadow)"/>
  <path d="M20 3 L34 35 L20 28 L6 35 Z" fill="var(--ui-player-fill)" stroke="var(--ui-player-stroke)"
        stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M20 5.5 L32.2 33.2 L20 27 Z" fill="#000" fill-opacity=".16"/>
</svg>`,
  pin: `
<svg viewBox="-4 -4 44 44" width="44" height="44" aria-hidden="true">
  <defs>
    <radialGradient id="sk-gta-pin-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".5"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="18" cy="20" rx="17" ry="15" fill="url(#sk-gta-pin-shadow)"/>
  <circle cx="18" cy="18" r="14" fill="#1a1c1e"/>
  <circle cx="18" cy="18" r="12" fill="#ffffff"/>
  <circle cx="18" cy="18" r="9.5" fill="var(--ui-accent)"/>
  <path d="M18 12 L24 18 L18 24 L12 18 Z" fill="#ffffff"/>
</svg>`,
  pinAnchor: 'center',
};

// ---------- Red Dead ----------
// Jogador: agulha de bússola dentro de um aro com marcas; a ponta da frente (vermelha) é a
// direção em que você vai, a de trás é cor de papel. Destino: "X" vermelho de mapa do
// tesouro, pintado a pincel sobre um traço de tinta escura (âncora no centro).
const RDR: Skin = {
  player: `
<svg viewBox="-4 -4 48 48" width="44" height="44" aria-hidden="true">
  <defs>
    <radialGradient id="sk-rdr-shadow">
      <stop offset="0" stop-color="#2b1a12" stop-opacity=".5"/>
      <stop offset="1" stop-color="#2b1a12" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="20" cy="22" rx="17" ry="15" fill="url(#sk-rdr-shadow)"/>
  <circle cx="20" cy="20" r="13.5" fill="#f4ecd8" fill-opacity=".85" stroke="#2b1a12" stroke-width="2"/>
  <circle cx="20" cy="20" r="10.5" fill="none" stroke="#2b1a12" stroke-width=".8" stroke-dasharray="1.2 2.1"/>
  <path d="M20 6.5 V9.5 M33.5 20 H30.5 M20 33.5 V30.5 M6.5 20 H9.5" stroke="#2b1a12" stroke-width="2"/>
  <path d="M20 1.5 L25.5 20 H14.5 Z" fill="#9e1b1b" stroke="#2b1a12" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M14.5 20 H25.5 L20 36 Z" fill="var(--ui-player-fill)" stroke="#2b1a12" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="20" cy="20" r="2.4" fill="#2b1a12"/>
  <circle cx="20" cy="20" r="1" fill="#c9a86a"/>
</svg>`,
  pin: `
<svg viewBox="-4 -4 44 44" width="44" height="44" aria-hidden="true">
  <defs>
    <radialGradient id="sk-rdr-pin-shadow">
      <stop offset="0" stop-color="#2b1a12" stop-opacity=".45"/>
      <stop offset="1" stop-color="#2b1a12" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="18" cy="20" rx="17" ry="14" fill="url(#sk-rdr-pin-shadow)"/>
  <g fill="none" stroke-linecap="round">
    <path d="M6.5 6 Q17 16.5 30 30.5 M29.5 6.5 Q19.5 17 6 30" stroke="#2b1a12" stroke-width="10"/>
    <path d="M6.5 6 Q17 16.5 30 30.5" stroke="#b3201b" stroke-width="6"/>
    <path d="M29.5 6.5 Q19.5 17 6 30" stroke="#c42a22" stroke-width="5.5"/>
    <path d="M9 9.5 Q15 15 19 19" stroke="#e8674f" stroke-width="1.5" stroke-opacity=".7"/>
  </g>
</svg>`,
  pinAnchor: 'center',
};

// ---------- Minecraft ----------

/**
 * Desenho em grade de pixels. Cada string é uma linha; cada letra, um pixel com a cor de
 * `palette` ('.' = vazio). Um contorno preto de 1 pixel é gerado sozinho em volta de tudo
 * (inclusive nas diagonais), como o contorno dos ícones do jogo. Devolve os <rect> (um por
 * sequência de pixels iguais na linha) e o tamanho total, já contando o contorno.
 */
function pixelArt(rows: string[], palette: Record<string, string>, cell: number) {
  const h = rows.length + 2;
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const at = (x: number, y: number) => rows[y - 1]?.[x - 1] ?? '.';
  const grid: string[][] = [];
  for (let y = 0; y < h; y++) {
    grid.push([]);
    for (let x = 0; x < w; x++) {
      let c = at(x, y);
      if (c === '.') {
        // vazio encostado (em 8 direções) em algum pixel pintado vira contorno
        const touches = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => at(x + dx, y + dy) !== '.'));
        if (touches) c = '#';
      }
      grid[y].push(c);
    }
  }
  const colors: Record<string, string> = { ...palette, '#': '#000' };
  let rects = '';
  grid.forEach((row, y) => {
    for (let x = 0; x < w; ) {
      const c = row[x];
      let run = 1;
      while (row[x + run] === c) run++;
      if (c !== '.') {
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${run * cell}" height="${cell}" fill="${colors[c]}"/>`;
      }
      x += run;
    }
  });
  return { rects, width: w * cell, height: h * cell };
}

// Jogador: marcador branco pixelado, como o do item "mapa" (desenho nosso), com a face
// direita cinza para dar volume. 9×10 pixels com o contorno, 4 px cada.
const MC_PLAYER = pixelArt(
  [
    '...W...',
    '..WWW..',
    '..WWW..',
    '.WWWWG.',
    '.WWWWG.',
    'WWWWWGG',
    'WWW.WGG',
    'WW...GG',
  ],
  { W: 'var(--ui-player-fill)', G: '#bdbdbd' },
  4,
);

// Destino: estandarte vermelho pixelado (desenho nosso): travessa e mastro de madeira,
// pano vermelho com um losango dourado e a barra franjada mais escura.
const MC_BANNER = pixelArt(
  [
    '....B....',
    'BBBBBBBBB',
    '.RRRRRRR.',
    '.RRRYRRR.',
    '.RRYYYRR.',
    '.RRRYRRR.',
    '.RRRRRRR.',
    '.RRRRRRR.',
    '.DRRRRRD.',
    '.DDRRRDD.',
    '.DD.D.DD.',
    '....B....',
    '....B....',
    '....B....',
  ],
  { B: '#8a6236', R: '#b02e26', D: '#7c1f1a', Y: '#f2c33a' },
  3,
);

const MC: Skin = {
  player: `
<svg viewBox="-4 -4 ${MC_PLAYER.width + 8} ${MC_PLAYER.height + 8}" width="${MC_PLAYER.width + 8}"
     height="${MC_PLAYER.height + 8}" shape-rendering="crispEdges" aria-hidden="true">
  <defs>
    <radialGradient id="sk-mc-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${MC_PLAYER.width / 2}" cy="${MC_PLAYER.height / 2 + 2}" rx="${MC_PLAYER.width / 2 + 2}"
           ry="${MC_PLAYER.height / 2}" fill="url(#sk-mc-shadow)" shape-rendering="auto"/>
  ${MC_PLAYER.rects}
</svg>`,
  // Âncora 'bottom': a base do mastro fica sobre o local (a sombra passa um pouco da borda).
  pin: `
<svg viewBox="0 0 ${MC_BANNER.width} ${MC_BANNER.height}" width="${MC_BANNER.width}"
     height="${MC_BANNER.height}" shape-rendering="crispEdges" aria-hidden="true">
  <defs>
    <radialGradient id="sk-mc-pin-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".5"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${MC_BANNER.width / 2}" cy="${MC_BANNER.height - 2}" rx="10" ry="4"
           fill="url(#sk-mc-pin-shadow)" shape-rendering="auto"/>
  ${MC_BANNER.rects}
</svg>`,
  pinAnchor: 'bottom',
};

// ---------- San Andreas ----------
// Jogador: seta branca "chapada" com contorno preto grosso e cantos vivos, como a seta do
// radar do SA. Destino: blip quadrado vermelho de contorno preto (âncora no centro).
const SA: Skin = {
  player: `
<svg viewBox="-4 -4 48 48" width="44" height="44" aria-hidden="true">
  <defs>
    <radialGradient id="sk-sa-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".5"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="20" cy="22" rx="15" ry="13" fill="url(#sk-sa-shadow)"/>
  <path d="M20 4 L33 34 L20 27.5 L7 34 Z" fill="var(--ui-player-fill)" stroke="var(--ui-player-stroke)"
        stroke-width="3.5" stroke-linejoin="miter" stroke-miterlimit="8"/>
</svg>`,
  pin: `
<svg viewBox="-4 -4 40 40" width="40" height="40" aria-hidden="true">
  <defs>
    <radialGradient id="sk-sa-pin-shadow">
      <stop offset="0" stop-color="#000" stop-opacity=".55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="16" cy="18" rx="17" ry="15" fill="url(#sk-sa-pin-shadow)"/>
  <rect x="5" y="5" width="22" height="22" fill="#d81e1e" stroke="#000" stroke-width="3.5"/>
  <path d="M8.5 23.5 V8.5 H23.5" fill="none" stroke="#ff7a6e" stroke-width="2"/>
  <rect x="12" y="12" width="8" height="8" fill="#000" fill-opacity=".35"/>
</svg>`,
  pinAnchor: 'center',
};

/**
 * Uma entrada por skin. Todas começam iguais ao padrão; cada skin sobrescreve o que quiser
 * (ex.: `gta: { ...DEFAULT, player: '<svg ...>' }`).
 */
const SKINS: Record<string, Skin> = {
  gta: GTA, // Los Santos (GTA V)
  sa: SA, // San Andreas (GTA SA)
  rdr: RDR, // Red Dead
  mc: MC, // Minecraft
  zelda: { ...DEFAULT }, // Hyrule (Zelda BotW)
};

/** Skin pelo id (ou a padrão, se o tema não declarar skin ou o id não existir). */
export function getSkin(id: string | undefined): Skin {
  return (id && SKINS[id]) || DEFAULT;
}
