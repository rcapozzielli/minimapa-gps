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
};

/** A textura com esse nome, ou null se o nome não for de uma textura nossa. */
export function imagemDeTextura(id: string): Textura | null {
  return TEXTURAS[id]?.() ?? null;
}
