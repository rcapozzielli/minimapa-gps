"""Gera os desenhos da skin "smw" (Mario World): src/skins/smw/player.svg, pin.svg e poi/*.svg.

Pixel art PRÓPRIA (nada copiado do jogo), desenhada aqui como texto: cada caractere é um pixel
do SNES. Só cores medidas no mapa-múndi (referencias/paletas.md, seção Super Mario World).
  - Jogador: seta vermelha com contorno preto (as cores vêm de --ui-player-fill/-stroke).
  - Destino: ponto de fase vermelho (o das fases com saída secreta), centrado no local.
  - Pontos de interesse: plaquinha branca de contorno preto, como as placas numeradas das
    fases no mapa, com o glifo da categoria. Ícones "em blocos" (iconesEmBlocos no tema): 1 pixel
    do desenho = 1 pixel do canvas (o mapa é desenhado a 1/3), ou seja, 3 px de tela.

Uso:  python scripts/gerar-icones-smw.py
"""
from pathlib import Path

PASTA = Path(__file__).resolve().parents[1] / 'src' / 'skins' / 'smw'

CORES = {
    'K': '#000000',  # contorno
    'W': '#f0f0f0',  # branco das placas
    'R': '#f80000',  # vermelho do ponto de fase
    'Y': '#f8d000',  # amarelo do ponto de fase
    'B': '#785030',  # madeira (escadas, pontes)
    'O': '#d89860',  # penhasco
    'G': '#40d020',  # grama
    # Jogador: cores do tema (metadata.minimapa.ui).
    'f': 'var(--ui-player-fill)',
    's': 'var(--ui-player-stroke)',
}

# Glifos de 10×10 ('.' = fundo da placa).
GLIFOS = {
    'restaurante': [  # garfo e faca
        '.K.K.K..K.', '.K.K.K.KK.', '.K.K.K.KK.', '.KKKKK.KK.', '..KKK..KK.',
        '...K...KK.', '...K....K.', '...K....K.', '...K....K.', '...K....K.',
    ],
    'fast-food': [  # hambúrguer
        '..OOOOOO..', '.OOWOOWOO.', 'OOOOOOOOOO', 'GGGGGGGGGG', 'BBBBBBBBBB',
        'BBBBBBBBBB', 'YYYYYYYYYY', 'OOOOOOOOOO', '.OOOOOOOO.', '..........',
    ],
    'bar': [  # taça
        'KKKKKKKKKK', '.KYYYYYYK.', '..KYYYYK..', '...KYYK...', '....KK....',
        '....KK....', '....KK....', '....KK....', '...KKKK...', '..KKKKKK..',
    ],
    'cafe': [  # xícara com vapor
        '..K..K....', '...K..K...', '..K..K....', '..........', 'KKKKKKKK..',
        'KBBBBBBKKK', 'KBBBBBBK.K', 'KBBBBBBKKK', '.KBBBBK...', '..KKKK....',
    ],
    'loja': [  # sacola
        '...KKKK...', '..K....K..', '..K....K..', 'KKKKKKKKKK', 'KYYYYYYYYK',
        'KYYYYYYYYK', 'KYYYYYYYYK', 'KYYYYYYYYK', 'KYYYYYYYYK', 'KKKKKKKKKK',
    ],
    'posto': [  # bomba de combustível
        '.KKKKK....', '.KWWWK....', '.KWWWK.K..', '.KKKKK..K.', '.KRRRK..K.',
        '.KRRRK..K.', '.KRRRK.KK.', '.KRRRKK...', '.KRRRK....', 'KKKKKKK...',
    ],
    'farmacia': [  # cruz
        '...RRRR...', '...RRRR...', '...RRRR...', 'RRRRRRRRRR', 'RRRRRRRRRR',
        'RRRRRRRRRR', 'RRRRRRRRRR', '...RRRR...', '...RRRR...', '...RRRR...',
    ],
    'hotel': [  # cama
        '..........', 'K.........', 'K.........', 'K.KK......', 'KKKKRRRRRR',
        'KKKKRRRRRR', 'KKKKKKKKKK', 'K........K', 'K........K', '..........',
    ],
    'aeroporto': [  # avião
        '....KK....', '....KK....', '...KKKK...', '.KKKKKKKK.', 'KKKKKKKKKK',
        '....KK....', '....KK....', '...KKKK...', '..KKKKKK..', '..........',
    ],
}

# Seta do jogador, apontando para o norte (centro do desenho = sua posição).
JOGADOR = [
    '.....s.....', '....sfs....', '....sfs....', '...sfWfs...', '...sfffs...', '..sfffffs..',
    '..sfffffs..', '.sfffffffs.', '.sfffsfffs.', 'sfffs.sfffs', 'sffs...sffs', 'sss.....sss',
]

# Ponto de fase vermelho.
PONTO = ['..KKKKKK..', '.KRRRRRRK.', 'KRRRRRRRRK', 'KRRRRRRRRK', 'KRRRRRRRRK', 'KRRRRRRRRK', '.KRRRRRRK.', '..KKKKKK..']


def placa(glifo: list[str]) -> list[str]:
    """Plaquinha 14×14: contorno preto (cantos cortados), fundo branco, glifo no meio."""
    linhas = []
    for y in range(14):
        linha = ''
        for x in range(14):
            borda = x in (0, 13) or y in (0, 13)
            canto = (x in (0, 13)) and (y in (0, 13))
            if canto:
                linha += '.'
            elif borda:
                linha += 'K'
            elif 2 <= x < 12 and 2 <= y < 12 and glifo[y - 2][x - 2] != '.':
                linha += glifo[y - 2][x - 2]
            else:
                linha += 'W'
        linhas.append(linha)
    return linhas


def svg(desenho: list[str], escala: int, extra: str = '') -> str:
    """Um <rect> por trecho horizontal de mesma cor. `escala`: px de tela por pixel do desenho."""
    w, h = len(desenho[0]), len(desenho)
    rects = []
    for y, linha in enumerate(desenho):
        x = 0
        while x < w:
            c = linha[x]
            fim = x
            while fim < w and linha[fim] == c:
                fim += 1
            if c != '.':
                rects.append(f'<rect x="{x}" y="{y}" width="{fim - x}" height="1" fill="{CORES[c]}"/>')
            x = fim
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg"{extra} viewBox="0 0 {w} {h}" width="{w * escala}" '
        f'height="{h * escala}" shape-rendering="crispEdges" aria-hidden="true">{"".join(rects)}</svg>\n'
    )


def main() -> None:
    (PASTA / 'poi').mkdir(parents=True, exist_ok=True)
    for nome, glifo in GLIFOS.items():
        assert len(glifo) == 10 and all(len(l) == 10 for l in glifo), nome
        (PASTA / 'poi' / f'{nome}.svg').write_text(svg(placa(glifo), 3), encoding='utf-8')
    (PASTA / 'player.svg').write_text(svg(JOGADOR, 4), encoding='utf-8')
    (PASTA / 'pin.svg').write_text(svg(PONTO, 4, ' data-anchor="center"'), encoding='utf-8')
    print('ok:', len(GLIFOS), 'ícones, player.svg e pin.svg em', PASTA)


if __name__ == '__main__':
    main()
