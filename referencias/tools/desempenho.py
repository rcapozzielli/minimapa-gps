"""Mede o desempenho de cada tema durante o DEMO DRIVE (?sim=1), simulando um celular.

Para cada tema: carrega o app, define um destino, toca em "Iniciar" e deixa o carro
simulado andar por DURACAO segundos com a CPU desacelerada 4x (CDP
Emulation.setCPUThrottlingRate). Mede:
  - tempo entre quadros (requestAnimationFrame): média, p95 e % de quadros acima de 50 ms;
  - requisições de rede e KB baixados no período (tiles, elevação etc.).

ATENÇÃO: o Chromium sem janela desenha o WebGL por software (SwiftShader), então os números
absolutos não valem para um celular. Servem para COMPARAR antes × depois na mesma máquina.

Uso:  python referencias/tools/desempenho.py antes      -> referencias/desempenho-antes.json
      python referencias/tools/desempenho.py depois     -> referencias/desempenho-depois.json
      (argumentos extras = só esses temas)
"""
import json
import statistics
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[1]
URL = 'https://localhost:5173/'
POS = (-23.5614, -46.6559)
DESTINO = [-46.6602, -23.5575]
DURACAO = 20  # segundos de direção simulada por tema
CPU = 4  # desaceleração da CPU (4x ~ celular intermediário)
RODADAS = 3  # medições seguidas por tema (o carro continua andando); vale a mediana

COLETA_QUADROS = """(ms) => new Promise(resolve => {
  const t = []; let ult = performance.now(); const fim = ult + ms;
  function q(agora) { t.push(agora - ult); ult = agora; if (agora < fim) requestAnimationFrame(q); else resolve(t); }
  requestAnimationFrame(q);
})"""


def p95(xs):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(0.95 * len(xs)))]


def main() -> None:
    rotulo = sys.argv[1] if len(sys.argv) > 1 else 'antes'
    so = set(sys.argv[2:])
    resultado = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True, ignore_https_errors=True, locale='pt-BR')
        page = ctx.new_page()
        page.goto(URL + '?sim=1', wait_until='networkidle')
        temas = page.evaluate("import('/src/map/themes.ts').then(m => m.THEMES.map(t => t.id))")
        cdp = ctx.new_cdp_session(page)
        # Sem cache HTTP: cada tema baixa os seus tiles, e os KB ficam comparáveis entre temas.
        cdp.send('Network.enable')
        cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})

        for tema in [t for t in temas if not so or t in so]:
            page.evaluate(f"localStorage.setItem('minimapa:theme', {json.dumps(tema)})")
            page.goto(f'{URL}?sim=1&pos={POS[0]},{POS[1]}', wait_until='networkidle')
            page.wait_for_function('() => window.minimapa && minimapa.map.isStyleLoaded()', timeout=30000)
            page.evaluate(
                """async (dest) => {
                  const { setState, getState } = minimapa;
                  setState({ destination: { lngLat: dest, label: 'Consolação' } });
                  for (let i = 0; i < 40 && !getState().route; i++) await new Promise(r => setTimeout(r, 250));
                }""",
                DESTINO,
            )
            page.locator('.rp-start').click()
            page.wait_for_timeout(1500)

            rodadas = []
            for _ in range(RODADAS):
                # Rede: os tiles são baixados pelo web worker do MapLibre, que o CDP da página
                # não enxerga; o Playwright enxerga. Guardamos as requisições e só lemos os
                # tamanhos depois (ler dentro do ouvinte falha na API síncrona).
                reqs = []

                def guardar(req, reqs=reqs):
                    reqs.append(req)

                page.on('requestfinished', guardar)
                cdp.send('Emulation.setCPUThrottlingRate', {'rate': CPU})
                quadros = page.evaluate(COLETA_QUADROS, DURACAO * 1000)[1:]  # 1º intervalo inclui a chamada
                cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
                page.wait_for_timeout(300)
                page.remove_listener('requestfinished', guardar)
                total = 0
                for r in reqs:
                    try:
                        s = r.sizes()
                        total += s['responseBodySize'] + s['responseHeadersSize']
                    except Exception:
                        pass
                rodadas.append({
                    'media_ms': statistics.mean(quadros),
                    'p95_ms': p95(quadros),
                    'acima_50ms_pct': 100 * sum(q > 50 for q in quadros) / len(quadros),
                    'requisicoes': len(reqs),
                    'kb': total / 1024,
                })
            # Mediana das rodadas: o tempo de quadro varia bastante de uma rodada para outra.
            resultado[tema] = {k: round(statistics.median(r[k] for r in rodadas), 1) for k in rodadas[0]}
            resultado[tema]['rodadas'] = RODADAS
            print(f'  {tema:14s} {resultado[tema]}')
        browser.close()

    destino = RAIZ / f'desempenho-{rotulo}.json'
    destino.write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding='utf-8')
    print('salvo em', destino.relative_to(RAIZ.parent))


if __name__ == '__main__':
    main()
