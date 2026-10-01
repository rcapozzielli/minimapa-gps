// Texturas geradas em código (sem arquivos de imagem), com as cores de referencias/paletas.md.
//
// Um tema usa uma textura só pelo nome, no próprio JSON:
//   "paint": { "background-pattern": "papel-rdr" }   ou   { "fill-pattern": "agua-mc" }
// Quando o MapLibre pede uma imagem que não existe, bindThemes (themes.ts) chama
// imagemDeTextura(id) e registra o resultado. Assim a textura existe em qualquer tema e é
// recriada sozinha depois de um setStyle (que apaga as imagens).

type Rgb = [number, number, number];

interface Textura {
  width: number;
  height: number;
  data: Uint8Array;
  /** Pixels da textura por px de tela (addImage). Padrão 1. */
  pixelRatio?: number;
}

/**
 * Minecraft (mapa): o mapa é desenhado a 1/4 da resolução (themes.ts), então 1 "bloco" =
 * 1 pixel do canvas = 4 px de tela. As texturas do tema são desenhadas em blocos (ver bloco()).
 */
export const BLOCO_MC = 0.25;

/**
 * Super Mario World: desenhado a 1/3 da resolução (1 pixel do SNES = 3 px de tela). Rótulos de
 * 24 px viram 8 pixels do canvas, a altura da fonte do jogo (e da Press Start 2P).
 */
export const BLOCO_SMW = 1 / 3;

/**
 * Cores oficiais do item mapa (minecraft.wiki/w/Map_item_format): cada cor-base tem 4 tons,
 * base × {180, 220, 255, 135} / 255. Tom 0: bloco mais baixo que o vizinho ao norte; 1: mesma
 * altura; 2: mais alto; 3: não aparece no jogo normal.
 */
export const COR_MAPA_MC = {
  GRASS: [127, 178, 56],
  SAND: [247, 233, 163],
  SNOW: [255, 255, 255],
  PLANT: [0, 124, 0],
  STONE: [112, 112, 112],
  WATER: [64, 64, 255],
  WOOD: [143, 119, 72],
  QUARTZ: [255, 252, 245],
  COLOR_RED: [153, 51, 51],
  DIRT: [151, 109, 77],
  FIRE: [255, 0, 0],
  NETHER: [112, 2, 0],
} satisfies Record<string, Rgb>;
const MULT_TOM = [180, 220, 255, 135];

export function tomMc(base: keyof typeof COR_MAPA_MC, tom: 0 | 1 | 2 | 3): Rgb {
  return COR_MAPA_MC[base].map((c) => Math.floor((c * MULT_TOM[tom]) / 255)) as Rgb;
}
export const hexMc = (base: keyof typeof COR_MAPA_MC, tom: 0 | 1 | 2 | 3): string =>
  '#' + tomMc(base, tom).map((c) => c.toString(16).padStart(2, '0')).join('');

const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;

/** Aleatório com semente (a textura sai igual toda vez, sem "piscar" ao trocar de tema). */
function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function preencher(w: number, h: number, cor: (x: number, y: number) => Rgb): Textura {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = cor(x, y);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

const TEXTURAS: Record<string, () => Textura> = {
  // Red Dead: papel com granulado leve. Papel #dcc19c; pontos #b3a68d (2,9% da área medida)
  // e #978c74 (1,9%).
  'papel-rdr': () => {
    const rnd = aleatorio(7);
    const papel = hex('#dcc19c');
    const ponto = hex('#b3a68d');
    const pontoEscuro = hex('#978c74');
    return preencher(128, 128, () => {
      const r = rnd();
      return r < 0.019 ? pontoEscuro : r < 0.048 ? ponto : papel;
    });
  },

  // Hyrule (Tears of the Kingdom): fundo carvão #252729 com grade quadrada fina.
  // Linha #1f3547 (tom dominante da grade medida) com o centro #42677b (pico da linha).
  'grade-hyrule': () => {
    const fundo = hex('#252729');
    const linha = hex('#1f3547');
    const pico = hex('#42677b');
    const lado = 48; // tamanho do quadrado da grade, em pixels de tela
    return preencher(lado, lado, (x, y) => (x === 0 || y === 0 ? pico : x === 1 || y === 1 ? linha : fundo));
  },

  // ---------- Minecraft (mapa): 1 pixel = 1 bloco, tons oficiais (COR_MAPA_MC) ----------
  // Ruído com semente: a textura é sempre igual e fica presa à coordenada do mundo (não pisca).
  // Água: xadrez de dois tons, como o pontilhado de profundidade do jogo.
  'agua-mc': () => bloco(2, 2, (x, y) => ((x + y) % 2 ? tomMc('WATER', 1) : tomMc('WATER', 0))),
  'grama-mc': () => ruidoMc(31, 'GRASS', 32),
  'campo-mc': () => ruidoMc(32, 'GRASS', 32, [0.15, 0.25, 0.6]),
  'areia-mc': () => ruidoMc(33, 'SAND', 16),
  'neve-mc': () => ruidoMc(34, 'SNOW', 16, [0.1, 0.8, 0.1]),
  'pedra-predio-mc': () => ruidoMc(35, 'STONE', 16),
  'tijolo-mc': () => ruidoMc(36, 'COLOR_RED', 16),
  'madeira-mc': () => ruidoMc(37, 'WOOD', 16),
  'quartzo-mc': () => ruidoMc(38, 'QUARTZ', 16, [0.05, 0.75, 0.2]),
  // Parques: grama com copas de árvore espalhadas; matas: copas encostadas umas nas outras.
  'parque-mc': () => copasMc(39, 32, 7, false),
  'folhas-mc': () => copasMc(40, 32, 4, true),
  // Rota: pó de redstone aceso (FIRE) e apagado (NETHER), 2 blocos de largura.
  'redstone-mc': () => redstoneMc('FIRE'),
  'redstone-apagada-mc': () => redstoneMc('NETHER'),

  // ---------- Super Mario World: 1 pixel do SNES = 1 bloco a BLOCO_SMW, cores exatas (paletas.md) ----------
  'agua-smw': () => desenhoSmw(AGUA_SMW, { '.': SMW.agua, '#': SMW.onda }),
  'grama-smw': () => desenhoSmw(GRAMA_SMW, { '.': SMW.grama, '+': SMW.verdeMedio }),
  'pedra-smw': () => desenhoSmw(PEDRA_SMW, { '.': SMW.pedra, '+': SMW.pedraSombra, ':': SMW.pedraPonto }),
  'penhasco-smw': () => desenhoSmw(PENHASCO_SMW, { '.': SMW.penhasco, '#': SMW.contorno }),
  'arvores-smw': () => arvoresSmw(41, 28, 7, true),
  'parque-smw': () => arvoresSmw(42, 32, 16, false),
  'rota-smw': () => rotaSmw(SMW.pontoAmarelo),
  'rota-alt-smw': () => rotaSmw(SMW.pedraSombra),

  // Minecraft 3D: blocos nas paredes e telhados (fill-extrusion-pattern), 16×16 como os do jogo.
  // Desenhos próprios. Bases: as cores lisas que os prédios tinham antes (tábuas #a58a52, tijolo
  // #96503f, tijolo de pedra #7a7a7a, quartzo #e9e4d8); terracota e folhas de paletas.md
  // (#98655d; árvores #2c4e19 / #273816). Os outros tons (argamassa, juntas, vidro) são DERIVADOS.
  'mc3d-tabuas': () => blocoTabuas('#a58a52', '#8a7040', '#6f5c37'),
  'mc3d-tijolo': () => blocoTijolo('#96503f', '#7d3f31', '#b4ab9f'),
  'mc3d-pedra': () => blocoPedra('#7a7a7a', '#5e5e5e', '#9a9a9a'),
  'mc3d-pedregulho': () => blocoRuido(11, ['#8a8a8a', '#6e6e6e', '#5a5a5a', '#a2a2a2'], [0.45, 0.3, 0.15, 0.1]),
  'mc3d-terracota': () => blocoRuido(12, ['#98655d', '#8c5c54', '#a36e66'], [0.7, 0.15, 0.15]),
  'mc3d-quartzo': () => blocoQuartzo('#e9e4d8', '#d2ccbd', '#f6f3ec'),
  'mc3d-vidro': () => blocoVidro('#cfd2d4', '#a9cfe0', '#e6f4fa', '#8db8cc'),
  'mc3d-folhas': () => blocoRuido(13, ['#2c4e19', '#273816', '#3f6b22', '#1d2a10'], [0.45, 0.25, 0.2, 0.1]),
};

// ---------- Blocos do Minecraft 3D (16×16) ----------

/** Ruído de vários tons (pedregulho, terracota, folhas): `pesos` somam 1. */
function blocoRuido(semente: number, cores: string[], pesos: number[]): Textura {
  const rnd = aleatorio(semente);
  const rgb = cores.map(hex);
  return preencher(16, 16, () => {
    let r = rnd();
    for (let i = 0; i < pesos.length; i++) if ((r -= pesos[i]) < 0) return rgb[i];
    return rgb[0];
  });
}

/** Tábuas: 4 tábuas horizontais de 4 px, com junta escura embaixo e emendas desencontradas. */
function blocoTabuas(base: string, veio: string, junta: string): Textura {
  const rnd = aleatorio(21);
  const [b, v, j] = [base, veio, junta].map(hex);
  const emendas = [3, 11, 6, 14]; // coluna da emenda vertical de cada tábua
  return preencher(16, 16, (x, y) => {
    if (y % 4 === 3 || x === emendas[y >> 2]) return j;
    return rnd() < 0.18 ? v : b;
  });
}

/** Tijolos: fileiras de 4 px (3 de tijolo + 1 de argamassa), tijolos de 8 px desencontrados. */
function blocoTijolo(tijolo: string, sombra: string, argamassa: string): Textura {
  const rnd = aleatorio(22);
  const [t, s, a] = [tijolo, sombra, argamassa].map(hex);
  return preencher(16, 16, (x, y) => {
    const fileira = y >> 2;
    if (y % 4 === 3 || (x + (fileira % 2) * 4) % 8 === 0) return a;
    return y % 4 === 2 || rnd() < 0.12 ? s : t;
  });
}

/** Tijolos de pedra: dois blocos de 8 px de altura, desencontrados, com luz em cima e sombra embaixo. */
function blocoPedra(pedra: string, sombra: string, luz: string): Textura {
  const rnd = aleatorio(23);
  const [p, s, l] = [pedra, sombra, luz].map(hex);
  return preencher(16, 16, (x, y) => {
    const xx = (x + (y >> 3) * 8) % 16;
    if (y % 8 === 7 || xx === 15) return s;
    if (y % 8 === 0 || xx === 0) return l;
    return rnd() < 0.15 ? s : p;
  });
}

/** Quartzo: liso, com borda do bloco (o que dá a "grade" nas fachadas brancas). */
function blocoQuartzo(base: string, borda: string, brilho: string): Textura {
  const [b, d, l] = [base, borda, brilho].map(hex);
  return preencher(16, 16, (x, y) => (x === 15 || y === 15 ? d : x === 0 || y === 0 ? l : b));
}

/** Prédio alto: moldura de concreto com uma janela de vidro e um reflexo diagonal. */
function blocoVidro(concreto: string, vidro: string, reflexo: string, caixilho: string): Textura {
  const [c, v, r, k] = [concreto, vidro, reflexo, caixilho].map(hex);
  return preencher(16, 16, (x, y) => {
    if (x < 2 || y < 2 || x > 13 || y > 13) return c;
    if (x === 2 || y === 2 || x === 13 || y === 13) return k;
    return x + y === 12 || x + y === 13 || x + y === 20 ? r : v;
  });
}

/** A textura com esse nome, ou null se o nome não for de uma textura nossa. */
export function imagemDeTextura(id: string): Textura | null {
  return TEXTURAS[id]?.() ?? null;
}

// ---------- Minecraft (mapa) ----------

/**
 * Textura do Minecraft (mapa) desenhada em blocos (`cor` é chamada uma vez por bloco, em ordem).
 * A imagem sai ampliada: cada bloco vira 4×4 pixels (1/BLOCO_MC), com pixelRatio 1. Com 1 pixel
 * por bloco, o filtro linear do MapLibre misturava blocos vizinhos (a grade da textura não
 * coincide com a do canvas) e tudo ficava borrado; ampliada, quase toda amostra cai no meio
 * de um bloco.
 */
function bloco(w: number, h: number, cor: (x: number, y: number) => Rgb, fator = BLOCO_MC): Textura {
  const cores: Rgb[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cores.push(cor(x, y));
  const k = Math.round(1 / fator);
  return preencher(w * k, h * k, (x, y) => cores[Math.floor(y / k) * w + Math.floor(x / k)]);
}

/** Ruído de 3 tons de uma cor oficial; `pesos` = fração dos tons 0, 1 e 2. */
function ruidoMc(semente: number, base: keyof typeof COR_MAPA_MC, lado: number, pesos = [0.15, 0.7, 0.15]): Textura {
  const rnd = aleatorio(semente);
  const tons = [tomMc(base, 0), tomMc(base, 1), tomMc(base, 2)];
  return bloco(lado, lado, () => {
    const r = rnd();
    return r < pesos[0] ? tons[0] : r < pesos[0] + pesos[1] ? tons[1] : tons[2];
  });
}

/**
 * Copas de árvore de 3×3 blocos com o sombreamento do jogo: a fileira de cima (norte) clara,
 * a do meio no tom normal e a de baixo (sul) escura. Uma copa a cada `passo` blocos, com um
 * deslocamento aleatório. `denso`: fundo de folhas (mata); senão, grama (parque).
 */
function copasMc(semente: number, lado: number, passo: number, denso: boolean): Textura {
  const rnd = aleatorio(semente);
  const fundo = denso ? null : ruidoMc(semente + 100, 'GRASS', lado);
  const px: Rgb[] = Array.from({ length: lado * lado }, (_, i) =>
    fundo ? (Array.from(fundo.data.slice(i * 4, i * 4 + 3)) as Rgb) : tomMc('PLANT', 0),
  );
  for (let gy = 0; gy < lado; gy += passo) {
    for (let gx = 0; gx < lado; gx += passo) {
      const cx = gx + Math.floor(rnd() * (passo - 2));
      const cy = gy + Math.floor(rnd() * (passo - 2));
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          if (!denso && (dx !== 1 && dy !== 1)) continue; // parque: copa redonda (sem os cantos)
          const x = (cx + dx) % lado; // "dá a volta": a textura se repete sem emenda
          const y = (cy + dy) % lado;
          px[y * lado + x] = tomMc('PLANT', dy === 0 ? 2 : dy === 1 ? 1 : 0);
        }
      }
    }
  }
  return bloco(lado, lado, (x, y) => px[y * lado + x]);
}

/** Pó de redstone: 2 blocos de largura, fundo escuro com pontos acesos. */
function redstoneMc(base: 'FIRE' | 'NETHER'): Textura {
  const desenho = ['31302312', '21330132']; // tom de cada bloco (2 = aceso, 0 = médio, 3 = escuro)
  return bloco(8, 2, (x, y) => tomMc(base, Number(desenho[y][x]) as 0 | 1 | 2 | 3));
}

// ---------- Super Mario World ----------

/** Cores exatas do mapa-múndi (referencias/paletas.md: pixel art de paleta fechada). */
export const SMW = {
  agua: hex('#4088f8'),
  onda: hex('#d8c8a8'), // as ondinhas do mar têm a cor do planalto
  grama: hex('#40d020'),
  verdeMedio: hex('#40a820'),
  verdeEscuro: hex('#408820'),
  penhasco: hex('#d89860'),
  pedra: hex('#d8c8a8'),
  pedraSombra: hex('#908060'),
  pedraPonto: hex('#a89878'),
  caminho: hex('#f8e8b0'),
  contorno: hex('#000000'),
  pontoAmarelo: hex('#f8d000'),
} satisfies Record<string, Rgb>;

// Desenhos em texto: cada caractere é 1 pixel do SNES (1 bloco); a legenda diz a cor.
// Mar: o ladrilho de 8×8 medido na referência (arcos de 4 pixels desencontrados).
const AGUA_SMW = ['........', '...##...', '..#..#..', '........', '........', '##......', '..#....#', '........'];
// Grama: tufos em "+" espalhados (desenho próprio, com o verde médio dos tufos da referência).
const GRAMA_SMW = [
  '................', '................', '...+............', '..+++...........', '...+............', '................',
  '................', '................', '................', '................', '...........+....', '..........+++...',
  '...........+....', '................', '................', '................',
];
// Planalto rochoso: "+" na sombra da pedra e pontos soltos.
const PEDRA_SMW = [
  '................', '..+.........:...', '.+++............', '..+.............', '................', '.......:........',
  '................', '................', '................', '..........+.....', '...:.....+++....', '..........+.....',
  '................', '................', '.............:..', '................',
];
// Penhasco: paredão laranja-terra com rachaduras pretas verticais de tamanhos diferentes.
const PENHASCO_SMW = [
  '....#...........', '....#...........', '....#.......#...', '....#.......#...', '....#.......#...', '....#.......#...',
  '............#...', '............#...', '............#...', '..#.........#...', '..#.............', '..#.............',
  '..#.......#.....', '..#.......#.....', '..........#.....', '..........#.....',
];
// Árvore redonda de 8×8 com contorno preto, luz no alto à esquerda ('.' = deixa o fundo).
const ARVORE_SMW = ['..####..', '.#mmmd#.', '#mmmddd#', '#mmdddd#', '#mddddd#', '#dddddd#', '.#dddd#.', '..####..'];
// Ponto de fase de 8×6 com contorno preto.
const PONTO_SMW = ['..####..', '.#yyyy#.', '#yyyyyy#', '#yyyyyy#', '.#yyyy#.', '..####..'];

function desenhoSmw(desenho: string[], cores: Record<string, Rgb>): Textura {
  return bloco(desenho[0].length, desenho.length, (x, y) => cores[desenho[y][x]], BLOCO_SMW);
}

/**
 * Árvores redondas: uma a cada `passo` pixels, com as fileiras alternadas (meio passo) e um
 * pequeno deslocamento aleatório. `denso` (matas): as copas se encostam, com verde-escuro nos
 * vãos; senão (parques), ficam soltas sobre a grama com tufos.
 */
function arvoresSmw(semente: number, lado: number, passo: number, denso: boolean): Textura {
  const rnd = aleatorio(semente);
  const px: Rgb[] = Array.from({ length: lado * lado }, (_, i) =>
    denso ? SMW.verdeEscuro : GRAMA_SMW[Math.floor(i / lado) % 16][(i % lado) % 16] === '+' ? SMW.verdeMedio : SMW.grama,
  );
  const cores: Record<string, Rgb> = { '#': SMW.contorno, m: SMW.verdeMedio, d: SMW.verdeEscuro };
  const folga = Math.max(1, passo - ARVORE_SMW.length); // quanto cada árvore pode "sair do lugar"
  for (let gy = 0, fileira = 0; gy < lado; gy += passo, fileira++) {
    for (let gx = 0; gx < lado; gx += passo) {
      const cx = gx + (fileira % 2) * Math.floor(passo / 2) + Math.floor(rnd() * folga);
      const cy = gy + Math.floor(rnd() * folga);
      ARVORE_SMW.forEach((linha, dy) =>
        [...linha].forEach((c, dx) => {
          if (c === '.') return;
          px[((cy + dy) % lado) * lado + ((cx + dx) % lado)] = cores[c]; // "dá a volta": sem emenda
        }),
      );
    }
  }
  return bloco(lado, lado, (x, y) => px[y * lado + x], BLOCO_SMW);
}

/**
 * Rota do SMW: caminho creme com bordas pretas e uma fileira de pontos de fase (a rota é
 * "o caminho até a próxima fase"). 8 pixels de largura; um ponto a cada 12 pixels.
 */
function rotaSmw(corPonto: Rgb): Textura {
  return bloco(12, 8, (x, y) => {
    if (y === 0 || y === 7) return SMW.contorno;
    const c = PONTO_SMW[y - 1][x - 2] ?? '.';
    return c === '#' ? SMW.contorno : c === 'y' ? corPonto : SMW.caminho;
  }, BLOCO_SMW);
}
