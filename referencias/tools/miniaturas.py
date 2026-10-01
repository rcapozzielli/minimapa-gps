"""Gera as miniaturas do seletor de mapas: public/miniaturas/<tema>.webp.

Uma captura real de cada tema, desenhada pelo próprio MapLibre, todas no mesmo lugar e zoom,
com o marcador do jogador, o pino e a rota no estilo de cada tema. A
interface e a atribuição ficam escondidas (a atribuição aparece no mapa de verdade, ao fundo).

Rode de novo ao criar ou mudar um tema. Precisa do servidor de dev rodando
(https://localhost:5173), como os outros scripts desta pasta:
  python referencias/tools/miniaturas.py            (todos os temas)
  python referencias/tools/miniaturas.py hyrule     (só alguns)
"""
import io
import json
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / 'public' / 'miniaturas'
URL = 'https://localhost:5173/'
# Rota de um endereço a outro (coordenadas do Photon, o mesmo serviço de busca do app).
# Na mão da rua: o OSRM faz 294 m direto pela Peixoto Gomide (no sentido contrário, ou para
# outras ruas daqui, as mãos únicas obrigam a dar a volta no quarteirão e a rota não cabe).
#   jogador: Rua Peixoto Gomide, 707 (CEP 01409-001)
#   destino: Rua Peixoto Gomide, 996 (CEP 01409-000)
POS = (-23.56014, -46.656134)  # (lat, lng)
DESTINO = [-46.658386, -23.561835]  # [lng, lat]
# Igual para todos os temas (o Minecraft (mapa) limita a inclinação a 0 sozinho). O centro é o
# meio do traçado da rota, calculado depois que ela chega do OSRM.
CAMERA = {'zoom': 16, 'pitch': 45, 'bearing': 0, 'padding': {'top': 0, 'bottom': 0, 'left': 0, 'right': 0}}
CENTRALIZAR = """(c) => {
  const pts = minimapa.getState().route?.coords ?? [];
  const lngs = pts.map(p => p[0]), lats = pts.map(p => p[1]);
  const center = pts.length
    ? [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]
    : minimapa.getState().position;
  minimapa.map.jumpTo({ ...c, center });
}"""
# 300×200 com escala 1,5 = imagem de 450×300 (cartão de ~150 px em tela de densidade 3).
TELA = {'width': 300, 'height': 200}
ESCALA = 1.5

ESPERA_TILES = """() => {
  const m = window.minimapa && window.minimapa.map;
  return !!m && m.isStyleLoaded() && m.areTilesLoaded() && !m.isMoving();
}"""


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    so = set(sys.argv[1:])
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = browser.new_context(viewport=TELA, device_scale_factor=ESCALA, ignore_https_errors=True, locale='pt-BR')
        page = ctx.new_page()
        page.goto(URL + '?sim=1', wait_until='networkidle')
        page.wait_for_timeout(2000)  # o Vite pode recarregar a página uma vez logo depois de mudanças
        temas = page.evaluate("[...document.querySelectorAll('.theme-card')].map(e => e.dataset.theme)")
        for tema in [t for t in temas if not so or t in so]:
            page.evaluate(f"localStorage.setItem('minimapa:theme', {json.dumps(tema)})")
            page.goto(f'{URL}?sim=1&pos={POS[0]},{POS[1]}', wait_until='networkidle')
            page.wait_for_function(ESPERA_TILES, timeout=30000, polling=250)
            page.evaluate(
                """async (dest) => {
                  const { setState, getState } = minimapa;
                  setState({ destination: { lngLat: dest, label: 'Destino' } });
                  for (let i = 0; i < 40 && !getState().route; i++) await new Promise(r => setTimeout(r, 250));
                  setState({ sheet: null, following: false });
                }""",
                DESTINO,
            )
            page.add_style_tag(content='#ui, .maplibregl-ctrl-bottom-right, .maplibregl-popup { display: none !important; }')
            page.evaluate(CENTRALIZAR, CAMERA)
            page.wait_for_timeout(500)
            page.wait_for_function(ESPERA_TILES, timeout=30000, polling=250)
            page.wait_for_timeout(1500)  # rótulos e ícones terminam de aparecer
            png = page.screenshot()
            destino = SAIDA / f'{tema}.webp'
            Image.open(io.BytesIO(png)).convert('RGB').save(destino, 'WEBP', quality=80, method=6)
            print(f'  {tema:16s} {destino.stat().st_size // 1024} KB')
        browser.close()


if __name__ == '__main__':
    main()
