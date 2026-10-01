# CLAUDE.md

Contexto para o Claude Code. Visão geral, estrutura, como rodar e como criar temas estão no
`README.md`; aqui fica só o que não se descobre lendo o código.

## Como trabalhar neste projeto

- O dono do projeto está aprendendo a usar o Claude Code: responda em **português** e explique
  brevemente cada decisão importante e o que cada arquivo novo faz.
- Trabalhe em etapas pequenas que funcionam sozinhas. No fim de cada etapa: `npm run build` sem
  erros, **commit com mensagem clara em português** e instruções exatas de como testar
  (inclusive no celular).
- `git push` na `main` publica sozinho no GitHub Pages
  (https://rcapozzielli.github.io/minimapa-gps/). Só faça push quando o usuário pedir.
- Interface e textos do app em pt-BR. Instruções de navegação são geradas por nós em
  `src/nav/instructions.ts`; nunca use o texto em inglês do OSRM.
- Respeite os serviços públicos (OSRM, Photon, OpenFreeMap): mantenha debounce e throttles, não
  coloque tiles nem APIs no cache do service worker, e mantenha a atribuição do OSM visível.

## Arquitetura (o essencial)

- Vanilla TypeScript, sem framework. Os módulos não se chamam entre si: reagem ao estado global
  em `src/state.ts` (`setState` / `subscribe`). Para uma funcionalidade nova, siga esse padrão.
- Temas: `src/map/themes.ts`. Há temas JSON (`public/styles/*.json`) e um tema gerado pelo
  sickmaps (Minecraft 3D). Cores da rota e da UI ficam em `metadata.minimapa` de cada estilo.
  As cores dos mapas vêm de `referencias/paletas.md` (medidas nas capturas dos jogos): não
  chute cor; o que não aparece na referência fica marcado como derivado.
- Skins (a "cara de jogo"): `metadata.minimapa.skin` → classe `skin-<id>` no `<html>` + a pasta
  `src/skins/<id>/` (skin.css, player.svg, pin.svg, poi/*.svg), descoberta por
  `import.meta.glob`. Componentes desenham caixas só com as variáveis de forma de
  `src/styles/base.css`; uma skin as redefine em `:root.skin-<id>` (não `.skin-<id>`, que empata
  com o `:root` e depende da ordem).
- HUD por tema (`metadata.minimapa.hud` → classes `mostra-<peça>` no `<html>`; `src/ui/hud.ts`).
- Fontes de jogo (Fontsource, OFL) na interface E nos rótulos: os temas JSON não têm `glyphs`,
  e o MapLibre desenha os nomes com as fontes da página (modo de fontes locais, GL JS >= 5.11).

## Armadilhas já resolvidas (não desfaça sem entender)

- **Worker do MapLibre 6 + Vite:** o worker é importado com `?worker&url` e registrado com
  `setWorkerUrl` em `src/map/map.ts`. Sem isso: "Worker failed to load" e mapa vazio.
  O MapLibre 6 não tem export default: use `import * as maplibregl`.
- **Trocar de tema:** `map.setStyle(estilo, { diff: false })`. No modo diff (padrão) o
  `style.load` não dispara e a rota não é redesenhada.
- **Posição da rota:** acima da última camada que não é `symbol` (`routeLayer.ts`). Não use
  "antes do primeiro rótulo": o estilo dark do sickmaps tem rótulos no meio da lista.
- **sickmaps `installMinecraftEnhancements`:** se `isStyleLoaded()` for falso, ele espera o
  evento `load`, que só dispara uma vez na vida do mapa. Chamamos no `style.load` "sombreando"
  `isStyleLoaded` durante a chamada (ver `minecraftEnter`). Tudo o que um tema liga no `enter`
  precisa ser desfeito no teardown (pixelRatio, listeners, classes CSS).
- **Câmera no modo seguir:** o zoom-alvo fica em `followZoom`. Ler `map.getZoom()` congelava o
  zoom quando uma animação era interrompida pela próxima leitura do GPS.
- **Toques no mapa:** `#ui` tem `pointer-events: none` e liga os filhos com
  `:where(#ui) > *` (especificidade zero). Com `#ui > *` puro, contêineres de layout
  (`.top-stack`, `.bottom-stack`, folha fechada) não conseguem desligar e engolem toques no mapa.
- **Skins com `clip-path`** (Zelda, Minecraft) cortam `outline` e sombra externa: o foco
  visível é um `box-shadow: inset`. `--ui-panel-bg` pode ser uma pilha de gradientes: use
  sempre `background:`, nunca `background-color:`.
- **Recálculo de rota:** logo após um `reroute`, `nav` ainda é o da rota antiga (o navegador o
  recalcula no mesmo `setState`, depois). Quem lê `route.steps[nav.stepIndex]` precisa tolerar
  índice inexistente; uma exceção num ouvinte interrompe os seguintes.
- **Fontes locais nos rótulos:** em `text-font`, só o nome exato da família CSS (`"Oswald"`).
  O MapLibre usa o nome inteiro como família: `"Oswald SemiBold"` cai numa fonte genérica.
  Trocar de um tema sem `glyphs` para o Minecraft 3D (que tem) gera um 404 de fonte na
  OpenFreeMap durante a troca (tiles antigos em processamento). É inofensivo.
- **Texturas (`patterns.ts`)** são registradas no `style.load` (`registrarTexturas`): só o
  resolvedor de imagens faltantes não basta, e um `background-pattern` sem imagem não desenha
  o fundo (a página aparece por trás). Inclui `fill-extrusion-pattern` e procura os nomes
  dentro de expressões (os prédios do Minecraft 3D escolhem a textura por altura e `id`).
  Texturas em extrusões custam quadros no Chromium sem janela (SwiftShader); confira no celular.
- **Classes de HUD no `<html>` são `mostra-<peça>`**, não `hud-<peça>`: os elementos já se
  chamam `hud-<peça>`, e `querySelector('.hud-x')` acharia o `<html>`.
- **Bairro no HUD:** no zoom de navegação o ponto do bairro (`place`) quase nunca está nos tiles
  carregados, e `querySourceFeatures` não o acha. O `hud.ts` guarda os bairros vistos em zooms
  afastados (memória) e usa o mais próximo.
- **Tema 2D (Minecraft (mapa)):** `map.setMaxPitch(0)` no `enter` (a câmera pede 60°, o MapLibre
  limita); desfazer no teardown junto com o `setPixelRatio`.
- **Base path:** o `vite.config.ts` lê `BASE_PATH` (o workflow usa `/minimapa-gps/`). Caminhos
  de arquivos em `public/` no código devem usar `import.meta.env.BASE_URL`.

## Ambiente (Windows)

- **Git Bash converte argumentos que começam com `/`** em caminhos do Windows
  (`/minimapa-gps/` vira `/Program Files/Git/minimapa-gps/`). Use `MSYS_NO_PATHCONV=1` ou
  variáveis de ambiente.
- **PowerShell 5.1 estraga acentos** com `Get-Content`/`Set-Content`. Edite arquivos com as
  ferramentas de edição, não com PowerShell. Mensagens de commit com aspas: faça pelo Bash
  (`git commit -F - <<'EOF'`).
- GitHub CLI instalado em `C:\Program Files\GitHub CLI\gh.exe` (conta `rcapozzielli`).
- **Worktrees para agentes em paralelo:** o `isolation: "worktree"` automático falha aqui
  (o git vê `Desktop`, a sessão vê `desktop`). Crie à mão, FORA do repo (o Vite do `npm run dev`
  observa `.claude/worktrees/` e fica recarregando):
  `git worktree add -b agente-x ../minimapa-gps-wt/x main`, e rode `npm ci` em cada um.
- TypeScript 7 verifica imports só de efeito colateral: CSS de pacote sem extensão `.css`
  precisa de declaração em `src/modules.d.ts`.

## Testar

- `npm run dev` → `https://localhost:5173` (certificado autoassinado; aparece também na rede local).
- `?sim=1`: modo simulação ("DEMO DRIVE": carro falso segue a rota; botão "Desviar" força
  recálculo). No console, `minimapa.map`, `minimapa.getState()` e `minimapa.setState()`.
  **Em scripts, use esses, nunca `import('/src/state.ts')`:** depois de uma edição com o servidor
  rodando, o Vite serve os módulos com `?t=...`, e o import sem sufixo carrega OUTRA cópia do
  estado (e de `themes.ts`), separada do app. Troque de tema clicando no cartão do seletor
  (`.theme-card[data-theme=...]`), não chamando `setTheme` de um import.
- **Testes preferidos: Playwright** (skill webapp-testing), em `referencias/tools/`:
  `prints.py` (prints por tema), `conferir.py` (cores do print × paleta, em ΔE), `validar.py`
  (DEMO DRIVE: rota, recálculo, troca de tema; registra URLs com erro), `desempenho.py`.
  Rodam contra o `npm run dev` (ignoram o certificado). Verifique por números primeiro; imagem
  só para uma olhada rápida. O tempo de quadro no Chromium sem janela (SwiftShader) varia muito
  entre rodadas: não compare números medidos em momentos diferentes.
- `?pos=lat,lng`: posição fixa.
- Service worker só no build: `npm run build` + `npm run preview`.
- Validar um tema JSON:
  `npx -p @maplibre/maplibre-gl-style-spec gl-style-validate public/styles/<tema>.json`.
- **Testes no Chrome via Claude in Chrome** (alternativa ao Playwright): a aba controlada fica oculta, e o Chrome pausa o
  `requestAnimationFrame`. O MapLibre só carrega estilos novos num quadro de animação, então
  trocas de tema parecem "travar" até algo forçar renderização (um screenshot resolve).
  Medir FPS ali não funciona. As coordenadas dos screenshots às vezes não batem com a página:
  prefira acionar botões pelo DOM (`element.click()`).
  - O Chrome controlado bloqueia o certificado autoassinado do `:5173`. Para testes
    automatizados, suba uma cópia em HTTP (localhost dispensa HTTPS para o GPS) com um config
    que reusa o `vite.config.ts` sem o plugin `basicSsl`, na porta 5174.
  - O redimensionamento da janela é ignorado: para larguras de celular, carregue o app num
    `<iframe>` de 320–430 px e meça pelo `contentDocument`.
  - O OSRM de demonstração quase nunca devolve rotas alternativas: para testar a interface
    delas, injete uma segunda rota no estado (`setState({ routes: [r, alt] })`).
