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
- Temas: `src/map/themes.ts`. Há temas JSON (`public/styles/*.json`) e temas gerados pelo
  sickmaps (Minecraft). Cores da rota e da UI ficam em `metadata.minimapa` de cada estilo.

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
- TypeScript 7 verifica imports só de efeito colateral: CSS de pacote sem extensão `.css`
  precisa de declaração em `src/modules.d.ts`.

## Testar

- `npm run dev` → `https://localhost:5173` (certificado autoassinado; aparece também na rede local).
- `?sim=1`: modo simulação (carro falso segue a rota; botão "Desviar" força recálculo).
  No console, `minimapa.map` e `minimapa.getState()`.
- `?pos=lat,lng`: posição fixa.
- Service worker só no build: `npm run build` + `npm run preview`.
- Validar um tema JSON:
  `npx -p @maplibre/maplibre-gl-style-spec gl-style-validate public/styles/<tema>.json`.
- **Testes no Chrome via Claude in Chrome:** a aba controlada fica oculta, e o Chrome pausa o
  `requestAnimationFrame`. O MapLibre só carrega estilos novos num quadro de animação, então
  trocas de tema parecem "travar" até algo forçar renderização (um screenshot resolve).
  Medir FPS ali não funciona. As coordenadas dos screenshots às vezes não batem com a página:
  prefira acionar botões pelo DOM (`element.click()`).
