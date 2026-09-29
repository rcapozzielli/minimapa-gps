"""Valida a navegação no DEMO DRIVE (?sim=1) em cada tema (Parte 3).

Para cada tema: rota até um destino -> "Iniciar" -> o carro simulado anda -> "Desviar (sim)"
-> confere que a rota foi RECALCULADA -> troca de tema no meio da navegação (pelo seletor
de mapas de verdade) -> confere que a navegação continua e a rota foi redesenhada. Conta os
erros de console.

Uso:  python referencias/tools/validar.py [temas...]
"""
import json
import sys

from playwright.sync_api import sync_playwright

URL = 'https://localhost:5173/'
POS = (-23.5614, -46.6559)
DESTINO = [-46.6602, -23.5575]

FLUXO = """async ([destino, proximo]) => {
  const { map, setState, getState } = minimapa;
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  const r = {};
  setState({ destination: { lngLat: destino, label: 'Teste' } });
  for (let i = 0; i < 60 && !getState().route; i++) await espera(250);
  r.rota = !!getState().route;
  await espera(1500);
  document.querySelector('.rp-start').click();
  await espera(6000);
  r.navegando = getState().navigating;
  r.andou = !!getState().nav && getState().nav.remainingDistance < getState().route.distance;
  // Desvio: o simulador joga a posição 80 m para o lado; o app deve recalcular.
  const rotaAntes = getState().route;
  document.querySelector('.fab-sim').click();
  for (let i = 0; i < 80 && getState().route === rotaAntes; i++) await espera(250);
  r.recalculou = getState().route !== rotaAntes;
  await espera(2000);
  // Troca de tema no meio da navegação, pelo seletor de verdade.
  setState({ sheet: 'themes' }); await espera(300);
  document.querySelector(`.theme-card[data-theme="${proximo}"]`).click();
  for (let i = 0; i < 60 && !(map.isStyleLoaded() && map.getLayer('route-line')); i++) await espera(250);
  await espera(2500);
  r.trocouPara = document.documentElement.className;
  r.rotaNoNovoTema = !!map.getLayer('route-line');
  r.continuaNavegando = getState().navigating && !!getState().nav;
  return r;
}"""


def main() -> None:
    so = set(sys.argv[1:])
    falhas = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, ignore_https_errors=True, locale='pt-BR')
        page = ctx.new_page()
        atual = {'tema': ''}
        erros: dict[str, list[str]] = {}
        page.on('pageerror', lambda e: erros.setdefault(atual['tema'], []).append(f'EXCEÇÃO {e}'[:160]))
        page.on('console', lambda m: m.type == 'error' and 'Failed to fetch' not in m.text
                and 'Failed to load resource' not in m.text
                and erros.setdefault(atual['tema'], []).append(m.text[:160]))
        # Respostas com erro (4xx/5xx), com a URL: o console só diz "Failed to load resource".
        page.on('response', lambda r: r.status >= 400
                and erros.setdefault(atual['tema'], []).append(f'HTTP {r.status} {r.url[:140]}'))
        page.goto(URL + '?sim=1', wait_until='networkidle')
        page.wait_for_timeout(2500)
        page.goto(URL + '?sim=1', wait_until='networkidle')
        temas = page.evaluate("import('/src/map/themes.ts').then(m => m.THEMES.map(t => t.id))")
        for i, tema in enumerate(temas):
            if so and tema not in so:
                continue
            atual['tema'] = tema
            proximo = temas[(i + 1) % len(temas)]
            page.evaluate(f"localStorage.setItem('minimapa:theme', {json.dumps(tema)})")
            page.goto(f'{URL}?sim=1&pos={POS[0]},{POS[1]}', wait_until='networkidle')
            page.wait_for_function('() => window.minimapa && minimapa.map.isStyleLoaded()', timeout=30000)
            r = page.evaluate(FLUXO, [DESTINO, proximo])
            ok = all(r[k] for k in ('rota', 'navegando', 'andou', 'recalculou', 'rotaNoNovoTema', 'continuaNavegando'))
            n_erros = len(erros.get(tema, []))
            falhas += (not ok) + (n_erros > 0)
            print(f'{"OK  " if ok and not n_erros else "FALHA"} {tema:15s} -> {proximo:15s} {r}  erros: {n_erros}')
        browser.close()
    for tema, lista in erros.items():
        for e in lista[:3]:
            print(f'   [{tema}] {e}')
    print('tudo certo' if not falhas else f'{falhas} falha(s)')


if __name__ == '__main__':
    main()
