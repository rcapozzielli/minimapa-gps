"""Monta, para cada tema, a imagem referência × antes × depois (Parte 3).

Lê referencias/<referência>.png, referencias/antes/<tema>-topo.png e
referencias/depois/<tema>-topo.png e salva referencias/comparacao/<tema>.png.
Se "antes" ou "depois" não existir (ex.: tema novo), o quadro sai com um aviso.

Uso:  python referencias/tools/comparar.py [topo|nav|navegando]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[1]
# tema do app -> imagem de referência
REFERENCIA = {
    'los-santos': 'gtav-mapa.png',
    'gta-sa': 'sa-mapa.png',
    'san-andreas': 'sa-mapa.png',
    'red-dead': 'rdr2-minimapa.png',
    'hyrule': 'hyrule-totk-mapa.png',
    'minecraft': 'minecraft-mapa-item.png',
    'minecraft-mapa': 'minecraft-mapa-item.png',
}
# tema que mudou de id: o "antes" dele está com o nome antigo
NOME_ANTES = {'san-andreas': 'gta-sa'}
ALTURA = 900  # altura de cada painel


def fonte(tam: int):
    for nome in ('arialbd.ttf', 'arial.ttf'):
        try:
            return ImageFont.truetype(nome, tam)
        except OSError:
            continue
    return ImageFont.load_default()


def painel(caminho: Path, titulo: str, largura_ref: int | None = None) -> Image.Image:
    if caminho.exists():
        img = Image.open(caminho).convert('RGB')
        esc = ALTURA / img.height
        img = img.resize((round(img.width * esc), ALTURA), Image.Resampling.LANCZOS)
    else:
        img = Image.new('RGB', (largura_ref or 420, ALTURA), '#2a2a2a')
        ImageDraw.Draw(img).text((20, ALTURA // 2), '(não existe)', fill='#aaaaaa', font=fonte(28))
    quadro = Image.new('RGB', (img.width, ALTURA + 56), '#111111')
    quadro.paste(img, (0, 56))
    ImageDraw.Draw(quadro).text((12, 12), titulo, fill='#ffffff', font=fonte(30))
    return quadro


def main() -> None:
    vista = sys.argv[1] if len(sys.argv) > 1 else 'topo'
    destino = RAIZ / 'comparacao'
    destino.mkdir(exist_ok=True)
    temas = {p.name.rsplit('-', 1)[0] for p in (RAIZ / 'depois').glob(f'*-{vista}.png')}
    for tema in sorted(temas):
        ref = REFERENCIA.get(tema)
        paineis = [
            painel(RAIZ / ref, 'Referência') if ref else painel(Path('-'), 'Referência'),
            painel(RAIZ / 'antes' / f'{NOME_ANTES.get(tema, tema)}-{vista}.png', 'Antes', 420),
            painel(RAIZ / 'depois' / f'{tema}-{vista}.png', 'Depois', 420),
        ]
        largura = sum(p.width for p in paineis) + 16 * (len(paineis) + 1)
        folha = Image.new('RGB', (largura, ALTURA + 56 + 32), '#000000')
        x = 16
        for p in paineis:
            folha.paste(p, (x, 16))
            x += p.width + 16
        saida = destino / f'{tema}-{vista}.png'
        folha.save(saida, optimize=True)
        print('  ', saida.relative_to(RAIZ.parent))


if __name__ == '__main__':
    main()
