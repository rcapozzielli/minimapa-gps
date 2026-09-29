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
  gta: { ...DEFAULT }, // Los Santos (GTA V)
  sa: SA, // San Andreas (GTA SA)
  rdr: { ...DEFAULT }, // Red Dead
  mc: { ...DEFAULT }, // Minecraft
  zelda: { ...DEFAULT }, // Hyrule (Zelda BotW)
};

/** Skin pelo id (ou a padrão, se o tema não declarar skin ou o id não existir). */
export function getSkin(id: string | undefined): Skin {
  return (id && SKINS[id]) || DEFAULT;
}
