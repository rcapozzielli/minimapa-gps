"""Extrai as cores dominantes de cada referência de jogo (Parte 0 do redesenho dos temas).

Para cada imagem em referencias/:
  1. recorta só a área do MAPA (sem a interface do jogo, que contaminaria a paleta);
  2. agrupa as cores (quantização octree, que preserva cores pequenas e saturadas);
  3. salva referencias/paletas/<jogo>-legenda.png: para cada grupo de cor, uma miniatura
     mostrando ONDE ele aparece no recorte (branco = pixels do grupo), com o hex e a % da área.
     É olhando essas miniaturas que se decide o que cada cor é (rua, prédio, água...).
  4. imprime a lista (hex, %) para montar o referencias/paletas.md.

Uso:  python referencias/tools/paletas.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[1]  # referencias/
SAIDA = RAIZ / 'paletas'

# Recortes (x0, y0, x1, y1) em pixels da imagem original: só a área do mapa.
REFERENCIAS = {
    # GTA V (1920x1080): sem a legenda da direita (x > 1600) e sem a barra de botões de baixo.
    'gtav': ('gtav-mapa.png', (0, 0, 1600, 1010), 20),
    # San Andreas (1024x1024): o mapa ocupa a imagem toda.
    'sa': ('sa-mapa.png', (0, 0, 1024, 1024), 20),
    # Red Dead (1330x1356): quadrado inscrito no círculo do minimapa (sem o anel da bússola).
    'rdr': ('rdr2-minimapa.png', (270, 295, 1060, 1085), 12),
    # Hyrule (1920x1080): dentro da moldura de pedra, sem as abas de cima e a barra de baixo.
    'hyrule': ('hyrule-totk-mapa.png', (250, 95, 1830, 1000), 24),
    # Minecraft (3840x2160): só o quadro do mapa (sem a moldura e o mundo 3D em volta).
    'minecraft': ('minecraft-mapa-item.png', (1104, 182, 2736, 1814), 24),
}
# Minecraft: a moldura de pergaminho é medida à parte (faixa entre o mundo e o mapa).
MOLDURA_MC = ('minecraft-mapa-item.png', (1030, 110, 2830, 182), 6)

MIN_PCT = 0.15  # grupos menores que isso são ruído de compressão/antisserrilhado


def fonte(tam: int) -> ImageFont.ImageFont:
    for nome in ('consola.ttf', 'arial.ttf'):
        try:
            return ImageFont.truetype(nome, tam)
        except OSError:
            continue
    return ImageFont.load_default()


def paleta(arquivo: str, caixa: tuple, n: int):
    """Devolve (recorte quantizado em modo P, [(hex, pct, indice)], rgb do recorte)."""
    img = Image.open(RAIZ / arquivo).convert('RGB').crop(caixa)
    # Reduz para ~600 px no lado maior: acelera e não muda as proporções das cores.
    img.thumbnail((600, 600), Image.Resampling.BOX)
    q = img.quantize(colors=n, method=Image.Quantize.FASTOCTREE)
    pal = q.getpalette()
    total = img.width * img.height
    grupos = []
    for qtd, idx in sorted(q.getcolors(), reverse=True):
        pct = 100 * qtd / total
        if pct < MIN_PCT:
            continue
        r, g, b = pal[idx * 3: idx * 3 + 3]
        grupos.append((f'#{r:02x}{g:02x}{b:02x}', pct, idx))
    return q, grupos, img


def legenda(nome: str, q: Image.Image, grupos, rgb: Image.Image) -> Path:
    """Folha com o recorte original + uma miniatura-máscara por grupo de cor."""
    mini = 180
    esc = mini / max(q.width, q.height)
    mw, mh = round(q.width * esc), round(q.height * esc)
    colunas = 5
    linhas = -(-len(grupos) // colunas)
    topo = round(rgb.height * (colunas * (mini + 16) / rgb.width))
    largura = colunas * (mini + 16) + 16
    folha = Image.new('RGB', (largura, topo + 16 + linhas * (mh + 56)), '#202020')
    folha.paste(rgb.resize((largura - 32, topo - 16)), (16, 16))
    d = ImageDraw.Draw(folha)
    f = fonte(15)
    for i, (hexa, pct, idx) in enumerate(grupos):
        # Máscara: branco onde o pixel pertence ao grupo, preto no resto.
        mascara = q.point(lambda v, alvo=idx: 255 if v == alvo else 0, mode='L')
        mascara = mascara.resize((mw, mh), Image.Resampling.NEAREST)
        x = 16 + (i % colunas) * (mini + 16)
        y = topo + 16 + (i // colunas) * (mh + 56)
        folha.paste(mascara.convert('RGB'), (x, y))
        d.rectangle((x, y + mh + 4, x + 22, y + mh + 26), fill=hexa, outline='#ffffff')
        d.text((x + 28, y + mh + 6), f'{i + 1}. {hexa}  {pct:.1f}%', fill='#ffffff', font=f)
    destino = SAIDA / f'{nome}-legenda.png'
    folha.save(destino)
    return destino


def main() -> None:
    SAIDA.mkdir(exist_ok=True)
    for nome, (arquivo, caixa, n) in REFERENCIAS.items():
        q, grupos, rgb = paleta(arquivo, caixa, n)
        destino = legenda(nome, q, grupos, rgb)
        print(f'\n== {nome} ({arquivo}, recorte {caixa}) -> {destino.name}')
        for i, (hexa, pct, _) in enumerate(grupos):
            print(f'  {i + 1:2d}. {hexa}  {pct:5.1f}%')
    _, grupos, _ = paleta(*MOLDURA_MC)
    print('\n== minecraft: moldura de pergaminho')
    for i, (hexa, pct, _) in enumerate(grupos):
        print(f'  {i + 1:2d}. {hexa}  {pct:5.1f}%')


if __name__ == '__main__':
    main()
