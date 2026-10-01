// Registro de skins: a "cara de jogo" da interface e dos marcadores de cada tema.
//
// UMA SKIN = UMA PASTA em src/skins/<id>/ (nada para registrar em código):
//   skin.css     variáveis de forma dentro de `:root.skin-<id>` (ver src/styles/base.css)
//   player.svg   seta do jogador, apontando para CIMA (norte); o centro é a sua posição
//   pin.svg      marcador do destino; `data-anchor="center"` no <svg> se o centro fica sobre o
//                local (blip), senão a base fica (pino)
//   poi/*.svg    ícones de pontos de interesse, um por categoria (restaurante, fast-food, bar,
//                cafe, loja, posto, farmacia, hotel); ver src/map/poiLayer.ts
//                (scripts/gerar-icones-poi.py gera os das skins atuais; os da mc,
//                scripts/importar-icones-mc.py)
// Qualquer arquivo que faltar vem da pasta `padrao/`. Um tema escolhe a skin em
// metadata.minimapa.skin; themes.ts põe a classe `skin-<id>` no <html>.
//
// Regras para os SVGs:
//  - Desenho próprio, no estilo do jogo (nada copiado dos jogos). Cores de referencias/paletas.md.
//  - viewBox com folga, para o contorno não ser cortado na borda.
//  - Ids internos (gradientes, filtros) prefixados pela skin, para não colidirem.
//  - Pode usar var(--ui-player-fill), var(--ui-player-stroke) e var(--ui-accent).

// CSS de todas as skins (cada um só vale sob a sua classe skin-<id>).
import.meta.glob('./*/skin.css', { eager: true });

const players = import.meta.glob<string>('./*/player.svg', { query: '?raw', import: 'default', eager: true });
const pins = import.meta.glob<string>('./*/pin.svg', { query: '?raw', import: 'default', eager: true });
// Ícones de pontos de interesse: src/skins/<id>/poi/<categoria>.svg (ver src/map/poiLayer.ts).
const pois = import.meta.glob<string>('./*/poi/*.svg', { query: '?raw', import: 'default', eager: true });

export interface Skin {
  /** Seta do jogador. Aponta para CIMA (norte); o app gira conforme a direção. Centro = sua posição. */
  player: string;
  /** Marcador do destino. */
  pin: string;
  /** Qual ponto do SVG do destino fica sobre o local: 'bottom' (pino) ou 'center' (blip). */
  pinAnchor: 'bottom' | 'center';
}

/** './gta/player.svg' -> 'gta' */
const idDaPasta = (caminho: string) => caminho.split('/')[1];

function porPasta(arquivos: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(arquivos).map(([caminho, svg]) => [idDaPasta(caminho), svg]));
}

const PLAYERS = porPasta(players);
const PINS = porPasta(pins);

function montar(id: string): Skin {
  const pin = PINS[id] ?? PINS.padrao;
  return {
    player: PLAYERS[id] ?? PLAYERS.padrao,
    pin,
    pinAnchor: /data-anchor="center"/.test(pin) ? 'center' : 'bottom',
  };
}

/** skin -> categoria -> SVG ('./gta/poi/bar.svg' -> POIS.gta.bar). */
const POIS: Record<string, Record<string, string>> = {};
for (const [caminho, svg] of Object.entries(pois)) {
  const [, skin, , arquivo] = caminho.split('/');
  (POIS[skin] ??= {})[arquivo.replace(/\.svg$/, '')] = svg;
}

/** Ícones de POI da skin (categoria -> SVG), ou null se a skin não tiver a pasta poi/. */
export function getPoiIcons(id: string | undefined): Record<string, string> | null {
  return (id && POIS[id]) || null;
}

const cache = new Map<string, Skin>();

/** Skin pelo id (ou a padrão, se o tema não declarar skin ou a pasta não existir). */
export function getSkin(id: string | undefined): Skin {
  const chave = id && (PLAYERS[id] || PINS[id]) ? id : 'padrao';
  let skin = cache.get(chave);
  if (!skin) {
    skin = montar(chave);
    cache.set(chave, skin);
  }
  return skin;
}
