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
}

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

  // Minecraft (mapa item): água com pontilhado (dithering) de dois tons medidos:
  // #053096 (principal) e #0137ce (claro), em xadrez de 2×2.
  'agua-mc': () => {
    const a = hex('#053096');
    const b = hex('#0137ce');
    return preencher(4, 4, (x, y) => ((x >> 1) + (y >> 1)) % 2 ? b : a);
  },

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
