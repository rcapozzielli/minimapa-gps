"""Confere NUMERICAMENTE se um tema usa as cores medidas da referência.

Agrupa as cores do print "topo" do tema (referencias/<pasta>/<tema>-topo.png) e, para cada
cor dominante, mostra a cor mais próxima na paleta do jogo (referencias/paletas.md) e a
distância perceptual ΔE (CIE76, no espaço Lab):
   ΔE < 5   praticamente a mesma cor
   ΔE < 15  mesma família, diferença visível
   ΔE >= 15 outra cor
No fim, a % da tela coberta por cores a menos de ΔE 10 da paleta ("aderência").

Uso:  python referencias/tools/conferir.py <tema> [antes|depois]
      ex.: python referencias/tools/conferir.py los-santos depois
"""
import re
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
# tema do app -> título da seção em paletas.md
SECAO = {
    'los-santos': 'GTA V',
    'gta-sa': 'GTA San Andreas',
    'san-andreas': 'GTA San Andreas',
    'red-dead': 'Red Dead',
    'hyrule': 'Zelda',
    'minecraft': 'Minecraft',
    'minecraft-mapa': 'Minecraft',
}


def paleta(secao: str) -> list[tuple[str, str]]:
    """[(elemento, hex)] da tabela da seção em paletas.md (a 1ª cor de cada linha)."""
    texto = (RAIZ / 'paletas.md').read_text(encoding='utf-8')
    partes = re.split(r'^## ', texto, flags=re.M)
    bloco = next(p for p in partes if p.startswith(secao))
    cores = []
    for linha in bloco.splitlines():
        m = re.match(r'\|\s*([^|]+?)\s*\|\s*`(#[0-9a-f]{6})`', linha)
        if m:
            cores.append((m.group(1), m.group(2)))
    return cores


def lab(hexa: str) -> tuple[float, float, float]:
    rgb = [int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    x = (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.95047
    y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    z = (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.08883
    f = [t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116 for t in (x, y, z)]
    return 116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])


def delta_e(a: str, b: str) -> float:
    la, lb = lab(a), lab(b)
    return sum((p - q) ** 2 for p, q in zip(la, lb)) ** 0.5


def main() -> None:
    tema = sys.argv[1]
    pasta = sys.argv[2] if len(sys.argv) > 2 else 'depois'
    cores_ref = paleta(SECAO[tema])
    img = Image.open(RAIZ / pasta / f'{tema}-topo.png').convert('RGB')
    # Contagem EXATA de cores (sem quantizar: a quantização faz média de cores vizinhas e
    # inventa cores que não existem). Redução por vizinho mais próximo, que não mistura pixels.
    img = img.resize((img.width // 2, img.height // 2), Image.Resampling.NEAREST)
    total = img.width * img.height
    contagem = sorted(img.getcolors(maxcolors=total), reverse=True)
    aderente = 0.0
    print(f'{tema} ({pasta}) × paleta "{SECAO[tema]}"')
    print(f'  {"cor no print":12s} {"% tela":>6s}  {"mais próxima na paleta":38s} {"ΔE":>5s}')
    for qtd, rgb in contagem[:12]:
        pct = 100 * qtd / total
        if pct < 0.5:
            continue
        hexa = '#%02x%02x%02x' % rgb
        elem, ref = min(cores_ref, key=lambda c: delta_e(hexa, c[1]))
        de = delta_e(hexa, ref)
        if de < 10:
            aderente += pct
        marca = '' if de < 5 else ' ~' if de < 15 else ' !!'
        print(f'  {hexa:12s} {pct:6.1f}  {ref} {elem[:30]:30s} {de:5.1f}{marca}')
    print(f'  aderência: {aderente:.0f}% da tela a menos de ΔE 10 da paleta')


if __name__ == '__main__':
    main()
