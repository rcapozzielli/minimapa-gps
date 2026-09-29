"""Gera a página de comparação (referência × antes × depois) para publicar (Parte 3).

Lê referencias/comparacao/<tema>-topo.png (de comparar.py) e referencias/depois/*-navegando.png,
embute as imagens em JPEG reduzido e escreve a página em HTML no caminho dado.

Uso:  python referencias/tools/pagina.py <saida.html>
"""
import base64
import io
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]

# (id, nome, referência, aderência antes, depois, cores principais, nota)
TEMAS = [
    ('los-santos', 'Los Santos', 'GTA V · mapa de pausa', '80%', '83%',
     [('#181818', 'fundo'), ('#363636', 'prédios'), ('#979797', 'ruas'), ('#4c4e36', 'parques')],
     'Fundo quase preto no lugar do cinza-azulado; ruas largas e parecidas; nomes em Oswald. '
     'Caixa BAIRRO / RUA com escala no canto. Seta na cor do protagonista.'),
    ('san-andreas', 'San Andreas', 'GTA San Andreas · mapa completo', '33%', '83%',
     [('#f2f2f1', 'prédios'), ('#9f9f9e', 'urbano'), ('#0e110b', 'ruas'), ('#386727', 'terra')],
     'Refeito do zero: a lógica estava invertida. Ruas pretas grossas, prédios brancos sobre cinza. '
     'Terra verde ao afastar o zoom. Nomes com contorno preto.'),
    ('red-dead', 'Red Dead', 'Red Dead Redemption 2 · minimapa', '14%', '76%',
     [('#dcc19c', 'papel'), ('#cfb793', 'prédios'), ('#41423d', 'ruas'), ('#444339', 'contornos')],
     'Papel com granulado leve, sem as bordas queimadas. Ruas carvão finas e uniformes, prédios com '
     'contorno, parques tracejados. Bússola e jogador em gota.'),
    ('hyrule', 'Hyrule', 'Zelda: Tears of the Kingdom · mapa', '1%', '84%',
     [('#584d20', 'quadras'), ('#252729', 'fundo'), ('#493a09', 'parques'), ('#3b9aac', 'bordas')],
     'Do bege claro do Breath of the Wild para o mapa escuro do Tears of the Kingdom. Grade azul nos '
     'vãos, bordas ciano, curvas de nível (Mapterhorn). Nome da região em Cinzel.'),
    ('minecraft-mapa', 'Minecraft (mapa)', 'Minecraft · item mapa', '7%', '77%',
     [('#6f904e', 'grama'), ('#782828', 'tijolo'), ('#6f5c37', 'madeira'), ('#c1ac88', 'moldura')],
     'Tema novo: 2D, pixelado, cores planas por bloco, água pontilhada, moldura serrilhada e caixa de '
     'posição. O "antes" é o Minecraft 3D, que continua disponível.'),
]
NAVEGANDO = ['los-santos', 'san-andreas', 'red-dead', 'hyrule', 'minecraft-mapa', 'minecraft']

CSS = """
/* Layout: relatório em coluna única; cada tema é uma seção com números, cores e a comparação. */
:root {
  --bg: #f3f3f1; --fg: #1d1f21; --muted: #5d6166; --line: #d9dad6; --panel: #ffffff; --accent: #2f6f5e;
  --display: 'Oswald', 'Arial Narrow', system-ui, sans-serif;
  --body: 'Source Sans 3', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #16181a; --fg: #eceeef; --muted: #a2a7ac; --line: #2c3033; --panel: #1f2225; --accent: #6fc2a8; color-scheme: dark }
}
:root[data-theme="dark"] { --bg: #16181a; --fg: #eceeef; --muted: #a2a7ac; --line: #2c3033; --panel: #1f2225; --accent: #6fc2a8; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 16px/1.55 var(--body); padding-inline: 16px; padding-block: 28px 56px }
main { max-width: 1100px; margin: 0 auto; display: grid; gap: 40px }
a { color: var(--accent) }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
h1, h2 { font-family: var(--display); font-weight: 600; letter-spacing: .01em; text-wrap: balance; margin: 0 }
h1 { font-size: clamp(28px, 5vw, 40px); text-transform: uppercase }
.intro p { max-width: 65ch; color: var(--muted); margin: 8px 0 0 }
.tabela { overflow-x: auto }
table { border-collapse: collapse; font-variant-numeric: tabular-nums; min-width: 440px; width: 100% }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line) }
th { font: 600 12px var(--body); text-transform: uppercase; letter-spacing: .06em; color: var(--muted) }
.n { text-align: right; font-family: var(--mono) }
.tema { display: grid; gap: 14px; padding-top: 24px; border-top: 1px solid var(--line) }
.tema header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px }
h2 { font-size: 28px; text-transform: uppercase }
.ref { margin: 0; color: var(--muted) }
.nums { display: flex; flex-wrap: wrap; gap: 28px }
.nums div { display: grid }
.rot { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted) }
.val { font: 600 30px var(--display); color: var(--accent); font-variant-numeric: tabular-nums }
.val.antes { color: var(--muted) }
.nota { margin: 0; max-width: 65ch }
.cores { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 14px }
.cores li { display: flex; align-items: center; gap: 6px }
.sw { width: 18px; height: 18px; border-radius: 3px; box-shadow: inset 0 0 0 1px var(--line) }
code { font-family: var(--mono); font-size: 13px }
figure { margin: 0; display: grid; gap: 6px }
.rolar { overflow-x: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 6px }
.rolar img { display: block; width: 100%; min-width: 640px; max-width: none }
figcaption { font-size: 13px; color: var(--muted) }
.obs { display: grid; gap: 8px; max-width: 70ch }
.obs ul { margin: 0; padding-left: 20px }
"""


def jpg(img: Image.Image, largura: int = 1400, q: int = 78) -> str:
    img = img.convert('RGB')
    if img.width > largura:
        img = img.resize((largura, round(img.height * largura / img.width)), Image.Resampling.LANCZOS)
    b = io.BytesIO()
    img.save(b, 'JPEG', quality=q, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def secao(tid, nome, ref, antes, depois, cores, nota) -> str:
    img = jpg(Image.open(RAIZ / 'comparacao' / f'{tid}-topo.png'))
    amostras = ''.join(
        f'<li><span class="sw" style="background:{h}"></span><code>{h}</code> {rot}</li>' for h, rot in cores)
    return f"""
<section class="tema" id="{tid}">
  <header><h2>{nome}</h2><p class="ref">{ref}</p></header>
  <div class="nums">
    <div><span class="rot">Aderência antes</span><span class="val antes">{antes}</span></div>
    <div><span class="rot">Depois</span><span class="val">{depois}</span></div>
  </div>
  <p class="nota">{nota}</p>
  <ul class="cores">{amostras}</ul>
  <figure>
    <div class="rolar"><img src="{img}" alt="{nome}: referência, antes e depois"></div>
    <figcaption>Referência · antes · depois, na Avenida Paulista (zoom 16, vista de cima)</figcaption>
  </figure>
</section>"""


def fita_navegando() -> str:
    ims = [Image.open(RAIZ / 'depois' / f'{t}-navegando.png').convert('RGB').resize((300, 650)) for t in NAVEGANDO]
    f = Image.new('RGB', (310 * len(ims) + 10, 670), (20, 20, 20))
    for i, im in enumerate(ims):
        f.paste(im, (10 + i * 310, 10))
    return jpg(f, 1600, 80)


def main() -> None:
    saida = Path(sys.argv[1])
    linhas = ''.join(
        f'<tr><td><a href="#{t[0]}">{t[1]}</a></td><td>{t[2]}</td><td class="n">{t[3]}</td><td class="n">{t[4]}</td></tr>'
        for t in TEMAS)
    html = f"""<title>Temas do Minimapa</title>
<style>{CSS}</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@600&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono&display=swap">
<main>
  <div class="intro">
    <h1>Temas do Minimapa</h1>
    <p>Cada tema foi refeito com as cores medidas nas capturas dos jogos. A aderência é a parte da tela a
    menos de ΔE 10 de alguma cor da paleta do jogo. O que falta até 100% é a rota, os nomes e o
    serrilhado, que não existem na referência.</p>
  </div>
  <div class="tabela"><table>
    <thead><tr><th>Tema</th><th>Referência</th><th class="n">Antes</th><th class="n">Depois</th></tr></thead>
    <tbody>{linhas}</tbody>
  </table></div>
  {''.join(secao(*t) for t in TEMAS)}
  <section class="tema">
    <header><h2>Navegando</h2><p class="ref">DEMO DRIVE, tela de celular</p></header>
    <p class="nota">Los Santos, San Andreas, Red Dead, Hyrule, Minecraft (mapa) e Minecraft 3D durante a
    navegação. Nos seis temas, a rota, o recálculo depois do desvio e a troca de tema no meio da
    navegação funcionaram.</p>
    <figure><div class="rolar"><img src="{fita_navegando()}" alt="Os seis temas durante a navegação"></div></figure>
  </section>
  <section class="obs">
    <h2>Pendências</h2>
    <ul>
      <li>Azul (Michael) e laranja (Trevor) do GTA V são derivados do verde medido: a captura só mostra o verde.</li>
      <li>O bairro na caixa do GTA V aparece depois da primeira visão afastada (por exemplo, a prévia da rota).</li>
      <li>Ao trocar do Red Dead para o Minecraft 3D, o MapLibre faz um pedido de fonte que volta 404. Não aparece na tela.</li>
      <li>Desempenho no celular: falta conferir no aparelho de verdade.</li>
    </ul>
  </section>
</main>
"""
    saida.write_text(html, encoding='utf-8')
    print(saida, round(saida.stat().st_size / 1024), 'KB')


if __name__ == '__main__':
    main()
