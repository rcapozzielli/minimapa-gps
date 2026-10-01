"""Mede elementos pequenos das referências que a quantização (paletas.py) não isola:
setas dos jogadores, caixas de texto, anel da bússola, brilhos.

Cada medida é a MEDIANA (por luminância) dos pixels de uma janela que passam num filtro
de cor. Isso ignora o serrilhado e os reflexos. As janelas foram escolhidas olhando as
folhas de legenda em referencias/paletas/.

Uso:  python referencias/tools/medir.py
"""
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def todos(p):
    return True


def verde(p):
    return p[1] > p[0] + 40 and p[1] > p[2] + 25


def amarelo(p):
    return p[0] > 150 and p[1] > 150 and p[2] < p[1] - 50


def escuro(p):
    return lum(p) < 110


def claro(p):
    return lum(p) > 150


def ciano(p):
    return max(p) - min(p) > 60 and p[2] > p[0]


def saturado(p):
    return max(p) - min(p) > 40


def preto(p):
    return max(p) < 90


# (rótulo, arquivo, janela (x0, y0, x1, y1) em pixels da imagem original, filtro)
MEDIDAS = [
    ('GTA V: verde do HUD ("M" do Michael)', 'gtav-mapa.png', (1855, 545, 1892, 580), verde),
    ('GTA V: verde do HUD ("?" Strangers)', 'gtav-mapa.png', (1855, 705, 1892, 745), verde),
    ('GTA V: verde do HUD (safehouse no mapa)', 'gtav-mapa.png', (1410, 715, 1460, 785), verde),
    ('GTA V: fundo da caixa BAIRRO / RUA', 'gtav-mapa.png', (30, 992, 300, 1000), todos),
    ('GTA V: texto da caixa', 'gtav-mapa.png', (38, 995, 295, 1015), claro),
    ('GTA V: barra de escala', 'gtav-mapa.png', (30, 925, 240, 945), claro),
    ('GTA V: fundo das caixas da legenda', 'gtav-mapa.png', (1730, 66, 1760, 86), todos),
    ('RDR: anel e letras da bússola', 'rdr2-minimapa.png', (40, 600, 90, 780), escuro),
    ('RDR: ruas carvão (avenida vertical)', 'rdr2-minimapa.png', (640, 380, 665, 520), escuro),
    ('RDR: tracejado do parque', 'rdr2-minimapa.png', (700, 280, 900, 335), escuro),
    ('RDR: jogador (gota branca)', 'rdr2-minimapa.png', (648, 665, 685, 705), claro),
    ('RDR: jogador (anel central)', 'rdr2-minimapa.png', (655, 678, 675, 695), escuro),
    ('RDR: círculo dos ícones', 'rdr2-minimapa.png', (605, 530, 650, 580), escuro),
    ('Hyrule: jogador (triângulo sólido)', 'hyrule-totk-mapa.png', (110, 585, 135, 612), amarelo),
    ('Hyrule: jogador (com brilho, no mapa)', 'hyrule-totk-mapa.png', (862, 795, 896, 826), amarelo),
    ('Hyrule: texto do nome da região', 'hyrule-totk-mapa.png', (835, 680, 1015, 708), claro),
    ('Hyrule: borda ciano da área explorada', 'hyrule-totk-mapa.png', (560, 760, 600, 800), ciano),
    ('Minecraft: fundo da caixa Position', 'minecraft-mapa-item.png', (20, 420, 860, 490), todos),
    ('Minecraft: madeira (vila)', 'minecraft-mapa-item.png', (1440, 590, 1500, 620), todos),
    ('Minecraft: tijolo / telhado vermelho', 'minecraft-mapa-item.png', (2010, 1010, 2050, 1060), todos),
    # Super Mario World: pixel art de paleta fechada; a mediana devolve a cor exata do jogo.
    ('SMW: ponto de fase vermelho', 'smw-mapa.png', (596, 227, 606, 235), lambda p: p[0] > 200 and p[1] < 60),
    ('SMW: ponto de fase amarelo', 'smw-mapa.png', (514, 0, 1025, 512), lambda p: p[0] > 200 and 180 < p[1] < 230 and p[2] < 40),
    ('SMW: ondinha do mar', 'smw-mapa.png', (944, 400, 1014, 440), lambda p: p[2] < 200),
    # Monopoly: o meio de cada faixa de cor e de cada ícone (cantos de 1 casa de folga).
    ('Monopoly: marrom (Whitechapel)', 'monopoly-tabuleiro.jpg', (1845, 2559, 2035, 2615), todos),
    ('Monopoly: azul-claro (Pentonville)', 'monopoly-tabuleiro.jpg', (410, 2559, 600, 2615), todos),
    ('Monopoly: rosa (Pall Mall)', 'monopoly-tabuleiro.jpg', (305, 2328, 363, 2518), todos),
    ('Monopoly: laranja (Vine St)', 'monopoly-tabuleiro.jpg', (305, 410, 363, 600), todos),
    ('Monopoly: vermelho (Strand)', 'monopoly-tabuleiro.jpg', (410, 310, 600, 363), todos),
    ('Monopoly: amarelo (Leicester Sq)', 'monopoly-tabuleiro.jpg', (1596, 310, 1792, 363), todos),
    ('Monopoly: verde (Regent St)', 'monopoly-tabuleiro.jpg', (2553, 410, 2612, 600), todos),
    ('Monopoly: azul-escuro (Park Lane)', 'monopoly-tabuleiro.jpg', (2553, 1845, 2612, 2035), todos),
    ('Monopoly: fundo do tabuleiro', 'monopoly-tabuleiro.jpg', (732, 586, 1025, 761), todos),
    ('Monopoly: linha divisória', 'monopoly-tabuleiro.jpg', (1083, 2635, 1107, 2899), preto),
    ('Monopoly: "?" laranja da Sorte', 'monopoly-tabuleiro.jpg', (2621, 1640, 2840, 1786), saturado),
    ('Monopoly: azul do Cofre', 'monopoly-tabuleiro.jpg', (2694, 878, 2840, 1054), saturado),
]


def mediana(arquivo, janela, filtro):
    img = Image.open(RAIZ / arquivo).convert('RGB').crop(janela)
    px = sorted((p for p in img.get_flattened_data() if filtro(p)), key=lum)
    if not px:
        return None, 0
    return '#%02x%02x%02x' % px[len(px) // 2], len(px)


if __name__ == '__main__':
    for rotulo, arquivo, janela, filtro in MEDIDAS:
        cor, n = mediana(arquivo, janela, filtro)
        print(f'{rotulo:44s} {cor or "(nenhum pixel)"}  ({n} px)')
