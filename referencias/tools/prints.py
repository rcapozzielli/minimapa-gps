"""Prints de cada tema na Avenida Paulista, sempre na mesma cena (Partes 1 e 3).

Usa Playwright (skill webapp-testing): Chromium sem janela, tela de celular, e o
requestAnimationFrame roda normalmente (no Chrome controlado ele pausava).

Precisa do servidor de dev rodando (https://localhost:5173). Pela skill:
  python <skill>/scripts/with_server.py --server "npm run dev" --port 5173 -- \
      python referencias/tools/prints.py antes

Salva em referencias/<saida>/, por tema:
  <tema>-nav.png        zoom de navegação (17), inclinado, com uma rota curta
  <tema>-topo.png       mesma área vista de cima (pitch 0), para comparar com as referências
  <tema>-navegando.png  depois de tocar em "Iniciar" (interface de navegação)
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[1]
URL = 'https://localhost:5173/'
# Avenida Paulista, perto do MASP (lat, lng); destino: umas quadras à frente.
POS = (-23.5614, -46.6559)
DESTINO = [-46.6602, -23.5575]  # [lng, lat]
CAMERA = {'zoom': 17, 'pitch': 60, 'bearing': 305}  # olhando ao longo da avenida

ESPERA_TILES = """() => {
  const m = window.minimapa && window.minimapa.map;
  return !!m && m.isStyleLoaded() && m.areTilesLoaded() && !m.isMoving();
}"""


def esperar_mapa(page, extra_ms=800):
    page.wait_for_function(ESPERA_TILES, timeout=30000, polling=250)
    page.wait_for_timeout(extra_ms)  # um quadro a mais com tudo desenhado


# Navegando, a câmera segue o carro simulado sem parar: "parado" nunca acontece.
# Espera só os tiles; se demorarem, segue mesmo assim (melhor um print do que nenhum).
ESPERA_TILES_EM_MOVIMENTO = """() => {
  const m = window.minimapa && window.minimapa.map;
  return !!m && m.isStyleLoaded() && m.areTilesLoaded();
}"""


def esperar_mapa_em_movimento(page, extra_ms=400):
    try:
        page.wait_for_function(ESPERA_TILES_EM_MOVIMENTO, timeout=10000, polling=250)
    except Exception:
        print('    (tiles ainda carregando; print tirado assim mesmo)')
    page.wait_for_timeout(extra_ms)


def temas(page) -> list[str]:
    return page.evaluate("import('/src/map/themes.ts').then(m => m.THEMES.map(t => t.id))")


def main() -> None:
    saida = RAIZ / (sys.argv[1] if len(sys.argv) > 1 else 'antes')
    saida.mkdir(exist_ok=True)
    so = set(sys.argv[2:])  # opcional: só alguns temas
    erros: dict[str, list[str]] = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            ignore_https_errors=True,  # certificado autoassinado do Vite
            locale='pt-BR',
            timezone_id='America/Sao_Paulo',
        )
        page = ctx.new_page()
        atual = {'tema': '(inicial)'}
        page.on('console', lambda msg: msg.type == 'error' and erros.setdefault(atual['tema'], []).append(msg.text))
        page.on('pageerror', lambda exc: erros.setdefault(atual['tema'], []).append(f'EXCEÇÃO: {exc}'))
        page.goto(URL + '?sim=1', wait_until='networkidle')
        # Logo depois de mudanças no código, o Vite reotimiza e recarrega a página sozinho
        # uma vez: espera assentar e recarrega antes de começar.
        page.wait_for_timeout(3000)
        page.goto(URL + '?sim=1', wait_until='networkidle')
        lista = [t for t in temas(page) if not so or t in so]
        print('temas:', lista)

        for tema in lista:
            atual['tema'] = tema
            erros.setdefault(tema, [])
            # Tema escolhido ANTES de carregar (o app lê do localStorage ao iniciar).
            page.evaluate(f"localStorage.setItem('minimapa:theme', {json.dumps(tema)})")
            page.goto(f'{URL}?sim=1&pos={POS[0]},{POS[1]}', wait_until='networkidle')
            esperar_mapa(page)

            # Rota curta (1 requisição ao OSRM por tema; o app já respeita o intervalo de 2 s).
            page.evaluate(
                """async (dest) => {
                  const { setState, getState } = minimapa;
                  setState({ destination: { lngLat: dest, label: 'Consolação' } });
                  for (let i = 0; i < 40 && !getState().route && !getState().routeError; i++)
                    await new Promise(r => setTimeout(r, 250));
                  setState({ sheet: null }); // cena limpa: sem a folha de prévia
                }""",
                DESTINO,
            )
            # Prints "nav" e "topo" são do MAPA: a interface fica escondida (a folha de prévia
            # reabre sozinha e cobriria metade da tela). O marcador do jogador e o pino ficam
            # (são do mapa, não da #ui). A atribuição do OSM também fica.
            page.add_style_tag(content='#ui { visibility: hidden !important; }')
            cam = {**CAMERA, 'center': [POS[1], POS[0]]}
            page.evaluate("c => { minimapa.map.jumpTo(c); }", cam)
            esperar_mapa(page)
            page.screenshot(path=str(saida / f'{tema}-nav.png'))

            page.evaluate("c => minimapa.map.jumpTo({ ...c, pitch: 0, bearing: 0, zoom: 16 })", cam)
            esperar_mapa(page)
            page.screenshot(path=str(saida / f'{tema}-topo.png'))

            page.evaluate("() => document.querySelectorAll('style').forEach(s => s.textContent.includes('#ui { visibility: hidden') && s.remove())")
            page.evaluate("() => minimapa.setState({ sheet: 'route' })")
            page.wait_for_timeout(400)
            iniciar = page.locator('.rp-start')
            if iniciar.is_visible():
                iniciar.click()
                page.wait_for_timeout(2500)
                esperar_mapa_em_movimento(page)
                page.screenshot(path=str(saida / f'{tema}-navegando.png'))
            print(f'  {tema}: ok' + (f'  ({len(erros[tema])} erro(s) no console)' if erros[tema] else ''))

        browser.close()

    for tema, lista_erros in erros.items():
        for e in lista_erros[:5]:
            print(f'  [erro {tema}] {e[:200]}')


if __name__ == '__main__':
    main()
