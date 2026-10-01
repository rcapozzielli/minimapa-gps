"""Gera os ícones de POI do Minecraft (src/skins/mc/poi/<categoria>.svg) a partir das imagens
escolhidas pelo dono do projeto em referencias/icones-mc/.

As imagens vêm ampliadas e em formatos diferentes (PNG/WebP 10×, WebP com escala quebrada e
compressão, GIF com fundo, JPG com fundo branco). Para cada uma, o script lê a cor no CENTRO de
cada "pixel do jogo" (grade com período e deslocamento medidos à mão), apaga o fundo, recorta a
área vazia e escreve um SVG de quadradinhos nítidos (shape-rendering="crispEdges").

Cada pixel do jogo vira 2 px de tela; com a escala 2 do poiLayer.ts, 4×4 pixels exatos.

Uso:  python scripts/importar-icones-mc.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
ORIGEM = RAIZ / 'referencias' / 'icones-mc'
DESTINO = RAIZ / 'src' / 'skins' / 'mc' / 'poi'
PX = 2  # px de tela por pixel do jogo

# categoria: (arquivo, período da grade em px, deslocamento x, deslocamento y, cor de fundo ou None)
ICONES = {
    'restaurante': ('Steak_JE4_BE3.webp', 10, 0, 0, None),
    'fast-food': ('Frango_adesivo.jpg', 25.6, 17, 17, (248, 248, 248)),
    'bar': ('Honey_Bottle.webp', 22.5, 0, 0, None),
    'cafe': ('Cookie_JE2_BE2.webp', 10, 0, 0, None),
    'loja': ('Emerald_JE3_BE3.png', 10, 0, 0, None),
    'posto': ('Lava_Bucket_JE2_BE2.webp', 22.5, -1.1, -1.1, None),
    'farmacia': ('Splash_Potion_of_Healing_JE2.png', 10, 0, 0, None),
    'hotel': ('Cama.gif', 12.05, 2.4, 2.6, (69, 66, 66)),
    'aeroporto': ('Elytra_29_JE1_BE1.webp', 10, 0, 0, None),
}


def grade(arquivo: str, periodo: float, dx: float, dy: float, fundo) -> np.ndarray:
    """Imagem ampliada -> matriz de pixels do jogo (RGBA, alfa 0 ou 255), já recortada."""
    a = np.asarray(Image.open(ORIGEM / arquivo).convert('RGBA')).astype(int)
    h, w = a.shape[:2]
    xs = np.arange(dx + periodo / 2, w, periodo)
    ys = np.arange(dy + periodo / 2, h, periodo)
    r = max(1, int(periodo * 0.2))  # mediana de um quadradinho central: ignora as bordas borradas
    out = np.zeros((len(ys), len(xs), 4), int)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            y0, x0 = int(y), int(x)
            c = np.median(a[max(0, y0 - r):y0 + r + 1, max(0, x0 - r):x0 + r + 1].reshape(-1, 4), axis=0).astype(int)
            transparente = c[3] < 128 or (fundo is not None and np.abs(c[:3] - fundo).sum() < 40)
            out[j, i] = 0 if transparente else (*c[:3], 255)
    ys_, xs_ = np.where(out[..., 3] > 0)
    return out[ys_.min():ys_.max() + 1, xs_.min():xs_.max() + 1]


def svg(g: np.ndarray) -> str:
    h, w = g.shape[:2]
    rects = []
    for y in range(h):
        x = 0
        while x < w:  # junta pixels vizinhos da mesma cor numa linha (SVG menor)
            c = tuple(g[y, x])
            n = 1
            while x + n < w and tuple(g[y, x + n]) == c:
                n += 1
            if c[3]:
                rects.append(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="#{c[0]:02x}{c[1]:02x}{c[2]:02x}"/>')
            x += n
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * PX}" height="{h * PX}" '
            f'shape-rendering="crispEdges">{"".join(rects)}</svg>\n')


if __name__ == '__main__':
    for cat, args in ICONES.items():
        g = grade(*args)
        (DESTINO / f'{cat}.svg').write_text(svg(g), encoding='utf-8', newline='\n')
        print(f'{cat:12s} {g.shape[1]}×{g.shape[0]} pixels  <- {args[0]}')
