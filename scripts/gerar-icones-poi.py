"""Gera os ícones de pontos de interesse (POI) de cada skin: src/skins/<skin>/poi/<categoria>.svg.

Os ícones são desenhos PRÓPRIOS (nada copiado dos jogos): o mesmo glifo simples por categoria,
com a "moldura" de cada jogo. Cores de referencias/paletas.md. Os SVGs gerados ficam no
repositório; para um tema novo, basta uma pasta poi/ com os 8 SVGs (à mão ou por aqui).

Uso:  python scripts/gerar-icones-poi.py
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SKINS = RAIZ / 'src' / 'skins'

# Glifos em 24×24, feitos de traços (stroke) e preenchimentos simples. {c} = cor do glifo.
GLIFOS = {
    # garfo e faca
    'restaurante': '<path d="M8 3v7a2 2 0 0 0 2 2v9M6 3v6M10 3v6M16 3c-2 2-2 6 0 8v10" fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round"/>',
    # hambúrguer
    'fast-food': '<path d="M5 10a7 5 0 0 1 14 0z" fill="{c}"/><rect x="4" y="12" width="16" height="2.4" rx="1.2" fill="{c}"/><path d="M5 16.5h14a0 0 0 0 1 0 0 3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="{c}"/>',
    # caneca de cerveja
    'bar': '<path d="M6 7h9v12a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 6 19z" fill="{c}"/><path d="M15 10h2.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H15" fill="none" stroke="{c}" stroke-width="2"/><path d="M6 6a3 2 0 0 1 9 0" fill="{c}"/>',
    # xícara com vapor
    'cafe': '<path d="M5 11h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="{c}"/><path d="M16 12h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="{c}" stroke-width="2"/><path d="M8 4c-1 1.5 1 2.5 0 4M12 4c-1 1.5 1 2.5 0 4" fill="none" stroke="{c}" stroke-width="1.6" stroke-linecap="round"/>',
    # sacola de compras
    'loja': '<path d="M5 8h14l-1 13H6z" fill="{c}"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="{c}" stroke-width="2"/>',
    # bomba de combustível
    'posto': '<rect x="5" y="4" width="9" height="17" rx="1.5" fill="{c}"/><path d="M14 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3" fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    # cruz de farmácia/hospital
    'farmacia': '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z" fill="{c}"/>',
    # cama (hotel)
    'hotel': '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="11" r="2" fill="{c}"/>',
}
# GTA V: o hotel é uma casa (o "safehouse" do jogo), em verde.
CASA = '<path d="M12 3 3 11h2.5v9h13v-9H21z" fill="{c}"/><rect x="10" y="14" width="4" height="6" fill="#0c0c0a"/>'


def svg(tamanho: int, corpo: str, vb: str = '0 0 32 32') -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{tamanho}" height="{tamanho}">{corpo}</svg>\n'


def glifo(cat: str, cor: str, escala: float = 1, x: float = 4, y: float = 4) -> str:
    return f'<g transform="translate({x} {y}) scale({escala})">{GLIFOS[cat].format(c=cor)}</g>'


# ---------- GTA V: glifo branco sem fundo, com sombra leve; hotel = casa verde ----------
def gta(cat: str) -> str:
    sombra = ('<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%">'
              '<feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000" flood-opacity=".85"/></filter></defs>')
    corpo = CASA.format(c='#a2dca2') if cat == 'hotel' else GLIFOS[cat].format(c='#ffffff')
    return svg(30, f'{sombra}<g filter="url(#s)" transform="translate(4 4)">{corpo}</g>')


# ---------- San Andreas: quadrado colorido pequeno com contorno preto ----------
# Cores da paleta medida do SA (paletas.md); glifo claro ou escuro conforme o fundo.
SA_CORES = {
    'restaurante': ('#e7c163', '#0e110b'),
    'fast-food': ('#4d2416', '#f2f2f1'),
    'bar': ('#7389ac', '#f2f2f1'),
    'cafe': ('#887765', '#f2f2f1'),
    'loja': ('#7c8a38', '#f2f2f1'),
    'posto': ('#0e110b', '#f2f2f1'),
    'farmacia': ('#f2f2f1', '#d81e1e'),
    'hotel': ('#386727', '#f2f2f1'),
}


def sa(cat: str) -> str:
    fundo, cor = SA_CORES[cat]
    return svg(26, f'<rect x="2" y="2" width="28" height="28" fill="{fundo}" stroke="#000" stroke-width="3"/>'
                   f'{glifo(cat, cor, 0.85, 5.8, 5.8)}')


# ---------- Red Dead: glifo branco dentro de círculo preto (como na referência) ----------
def rdr(cat: str) -> str:
    return svg(28, f'<circle cx="16" cy="16" r="15" fill="#000000"/>{glifo(cat, "#f6f6f6", 0.78, 6.6, 6.6)}')


# ---------- Hyrule: glifo ciano com brilho; farmácia e hotel como "carimbos" coloridos ----------
CARIMBOS = {'farmacia': '#d6060a', 'hotel': '#e8a33c'}


def zelda(cat: str) -> str:
    if cat in CARIMBOS:
        cor = CARIMBOS[cat]
        return svg(26, f'<rect x="4" y="4" width="24" height="24" rx="3" fill="{cor}" stroke="#0b2230" stroke-width="2"/>'
                       f'{glifo(cat, "#ffffff", 0.66, 8.1, 8.1)}')
    brilho = ('<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%">'
              '<feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
              '</filter></defs>')
    return svg(28, f'{brilho}<circle cx="16" cy="16" r="13" fill="#0b2230" fill-opacity=".85" stroke="#206d8f" stroke-width="1.4"/>'
                   f'<g filter="url(#g)">{glifo(cat, "#3b9aac", 0.72, 7.4, 7.4)}</g>')


# ---------- Minecraft: um item do jogo por categoria, dentro de um slot de inventário ----------
# Desenhos próprios em pixel art 16×16 (inspirados nos itens, sem copiar as texturas do jogo).
# Cores: as que existem em paletas.md (mapa item) vêm de lá; as outras são DERIVADAS (marcadas).
MC_CORES = {
    'K': '#1e1b18',  # contorno do item (derivado)
    'W': '#a58a52',  # madeira clara (derivado, = MC_MAP.planks em themes.ts)
    'w': '#6f5c37',  # madeira (paletas.md)
    'Q': '#cccccb',  # branco / quartzo (paletas.md)
    'T': '#782828',  # tijolo / vermelho escuro (paletas.md)
    'G': '#c8dde4',  # vidro (derivado)
}
SLOT = {'fundo': '#8b8b8b', 'escuro': '#373737', 'claro': '#ffffff'}  # slot de inventário (derivado)

# '.' = transparente (aparece o fundo do slot). Cada desenho é centralizado no slot.
MC_ITENS = {
    # tigela de ensopado: S = ensopado, s = brilho, T = pedaço de cogumelo
    'restaurante': ({'S': '#9a6532', 's': '#c8955a'}, [
        '.KKKKKKKKKKKK.',
        'KSSsSSSSTSsSSK',
        'KSTSSsSSSSSTSK',
        'KWWWWWWWWWWWWK',
        '.KwWWWWWWWWwK.',
        '.KwwWWWWWWwwK.',
        '..KwwWWWWwwK..',
        '...KKwwwwKK...',
        '.....KKKK.....',
    ]),
    # coxa de frango assada: C = carne, c = brilho, d = sombra, Q = osso
    'fast-food': ({'C': '#b5713a', 'c': '#dba468', 'd': '#7e4a22'}, [
        '..KKKK.......',
        '.KCCCCK......',
        'KCcCCCCK.....',
        'KCcCCCCK.....',
        'KCCCCCCK.....',
        'KCCCCCdK.....',
        '.KCCCddK.....',
        '..KdddKK.....',
        '...KKKQK.....',
        '......KQK....',
        '.......KQK.K.',
        '........KQKQK',
        '.......KQQQK.',
        '........KQK..',
        '.........K...',
    ]),
    # garrafa de mel: H = mel, h = brilho, w = rolha
    'bar': ({'H': '#e3961c', 'h': '#f7d06a'}, [
        '..KKK..',
        '..KwK..',
        '..KGK..',
        '..KGK..',
        '.KKGKK.',
        'KGHHHHK',
        'KhHHHHK',
        'KhHHHHK',
        'KhHHHHK',
        'KHHHHHK',
        'KHHHHHK',
        'KHHHHHK',
        'KKKKKKK',
    ]),
    # cookie: d = massa, D = massa tostada, c = gota de chocolate
    'cafe': ({'d': '#d39550', 'D': '#a8682e', 'c': '#4a2a14'}, [
        '....KKKK....',
        '..KKddddKK..',
        '.KdDddddcdK.',
        '.KddcdddddK.',
        'KddddddDdddK',
        'KdddDddddcdK',
        'KdcddddddddK',
        'KddddcdDdddK',
        '.KdddddddcK.',
        '.KdDddcdddK.',
        '..KKddddKK..',
        '....KKKK....',
    ]),
    # esmeralda: l, L, E, e = do mais claro ao mais escuro
    'loja': ({'l': '#c8fadc', 'L': '#6be89a', 'E': '#17c454', 'e': '#0b7a34'}, [
        '.....KK.....',
        '....KlLK....',
        '...KlLLEK...',
        '..KlLLEEeK..',
        '..KLLEEEeK..',
        '.KLLEEEEeeK.',
        '.KLEEEEEeeK.',
        '..KEEEEeeK..',
        '..KEEEeeeK..',
        '...KEEeeK...',
        '....KeeK....',
        '.....KK.....',
    ]),
    # balde de lava: O = lava, o = lava clara, I = ferro, i = ferro escuro
    'posto': ({'O': '#e0570e', 'o': '#ffb030', 'I': '#d8d8d8', 'i': '#8e8e8e'}, [
        'KKKKKKKKKKKK',
        'KIOoOOOoOOIK',
        'KIOOOoOOOoIK',
        '.KIIIIIIIIK.',
        '.KiIIIIIIiK.',
        '.KiIIIIIIiK.',
        '..KiIIIIiK..',
        '..KiIIIIiK..',
        '..KiiiiiiK..',
        '...KKKKKK...',
    ]),
    # poção de cura: R = líquido, r = brilho
    'farmacia': ({'R': '#e0303a', 'r': '#ff9a9a'}, [
        '....KKKK....',
        '....KGGK....',
        '....KGGK....',
        '...KKGGKK...',
        '..KGRRRRGK..',
        '.KGRrRRRRGK.',
        '.KRrRRRRRRK.',
        '.KRRRRRRRRK.',
        '.KRRRRRRRRK.',
        '..KRRRRRRK..',
        '...KKKKKK...',
    ]),
    # cama vermelha: Q = travesseiro, V = coberta, v = dobra da coberta
    'hotel': ({'V': '#b0302a', 'v': '#d8524a'}, [
        'KKKKKKKKKKKKKK',
        'KQQQQKvVVVVVVK',
        'KQQQQKvVVVVVVK',
        'KKKKKKKKKKKKKK',
        'KWWWWWWWWWWWWK',
        'KwwwwwwwwwwwwK',
        'KKKKKKKKKKKKKK',
        'KwK........KwK',
        'KKK........KKK',
    ]),
}


def mc(cat: str) -> str:
    extras, desenho = MC_ITENS[cat]
    cores = {**MC_CORES, **extras}
    larg = max(len(l) for l in desenho)
    x0 = 2 + (16 - larg) // 2  # slot: contorno (1) + bisel (1) + 16 de área útil
    y0 = 2 + (16 - len(desenho)) // 2
    rects = [
        '<rect x="0" y="0" width="20" height="20" fill="#000"/>',
        f'<rect x="1" y="1" width="18" height="18" fill="{SLOT["claro"]}"/>',
        f'<rect x="1" y="1" width="17" height="17" fill="{SLOT["escuro"]}"/>',
        f'<rect x="2" y="2" width="16" height="16" fill="{SLOT["fundo"]}"/>',
    ]
    for y, linha in enumerate(desenho):
        for x, ch in enumerate(linha):
            if ch != '.':
                rects.append(f'<rect x="{x0 + x}" y="{y0 + y}" width="1" height="1" fill="{cores[ch]}"/>')
    # 20 "pixels" desenhados em 30 px: com a escala 2 do poiLayer.ts, cada pixel vira 3×3 exatos.
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="30" height="30" '
            f'shape-rendering="crispEdges">{"".join(rects)}</svg>\n')


GERADORES = {'gta': gta, 'sa': sa, 'rdr': rdr, 'zelda': zelda, 'mc': mc}

if __name__ == '__main__':
    for skin, gerar in GERADORES.items():
        pasta = SKINS / skin / 'poi'
        pasta.mkdir(exist_ok=True)
        for cat in GLIFOS:
            (pasta / f'{cat}.svg').write_text(gerar(cat), encoding='utf-8', newline='\n')
        print(f'{skin}: {len(GLIFOS)} ícones em {pasta.relative_to(RAIZ)}')
