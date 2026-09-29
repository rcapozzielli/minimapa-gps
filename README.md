# Minimapa GPS

Navegação GPS no celular com visual de minimapa de jogo de mundo aberto ("GTA na vida real").
É um PWA feito com Vite + TypeScript + MapLibre GL JS, gratuito e sem chave de API.

**No ar:** https://rcapozzielli.github.io/minimapa-gps/ (instale na tela inicial do celular)

## O que ele faz

- Mapa em tela cheia seguindo você, com a câmera inclinada em 3D e girando na direção do movimento.
- Busca de destino com autocomplete e **destinos recentes** (toque na busca vazia), ou
  **toque e segure** no mapa para marcar um ponto.
- Prévia da rota numa folha embaixo, estilo Google Maps: tempo, distância, chegada e
  **rotas alternativas** (em cinza no mapa; toque numa delas, no mapa ou na folha, para escolher).
- Rota com linha grossa no estilo de GPS de jogo; o trecho já percorrido some.
- Navegação passo a passo em português: painel com a próxima manobra (e a seguinte, em
  "Depois"), **voz**, velocímetro e barra com horário de chegada e "Encerrar".
- Botão **Camadas** (à direita) para escolher o mapa; bússola para voltar o norte para cima.
- Recalcula a rota sozinho se você sair mais de ~50 m do trajeto.
- Seis temas, com as cores medidas em capturas dos jogos (`referencias/paletas.md`):
  **Los Santos** (GTA V), **San Andreas** (GTA SA), **Red Dead** (RDR2), **Hyrule**
  (Zelda: Tears of the Kingdom), **Minecraft (mapa)** e **Minecraft 3D**. Cada tema tem a
  sua fonte, os seus painéis, a sua seta de jogador e o seu HUD (caixa de bairro e rua,
  bússola, nome da região, coordenadas).
- Ícones de **pontos de interesse** (restaurantes, postos, farmácias, hotéis...) no estilo de
  cada jogo, a partir do zoom 15; tocar mostra o nome. Um botão liga e desliga.
- Instalável na tela inicial; a tela fica ligada durante a navegação.

## Rodar localmente

Requer Node 20.19+ (testado com Node 24).

```bash
npm install
npm run dev
```

Abra `https://localhost:5173`. O terminal também mostra um endereço **Network**
(ex.: `https://192.168.0.10:5173`) para abrir no celular, no mesmo Wi-Fi.

**Aviso de certificado:** geolocalização só funciona em HTTPS, então o servidor de
desenvolvimento usa um certificado autoassinado (`@vitejs/plugin-basic-ssl`). O
navegador vai dizer que a conexão "não é privada". A conexão é criptografada, só não é
certificada por uma autoridade. Para seguir: **Avançado → Continuar** (Android) ou
**Mostrar detalhes → visitar este site** (iPhone). Se o celular não abrir, libere o Node
no Firewall do Windows (rede privada).

### Testar sem sair de casa

- `?sim=1`: **modo simulação**. Depois de tocar em "Iniciar", um carro falso percorre a
  rota a ~50 km/h. O botão "Desviar (sim)" joga o carro 80 m para fora da rota, para testar
  o recálculo. No console do navegador, `minimapa.map`, `minimapa.getState()` e
  `minimapa.setState()` ajudam a depurar (os scripts de teste usam os mesmos).
- `?pos=lat,lng`: fixa uma posição falsa (ex.: `?pos=-23.5614,-46.6559`).
- No PC, dá para simular o GPS pelo DevTools: F12 → ⋮ → More tools → **Sensors**.

### Testar o PWA (instalação)

O service worker só existe no build:

```bash
npm run build
npm run preview    # também aparece na rede local, porta 4173
```

- **Android (Chrome):** menu ⋮ → "Instalar app".
- **iPhone (Safari):** Compartilhar → "Adicionar à Tela de Início".

## Publicar (deploy)

O app é publicado no **GitHub Pages** pelo workflow `.github/workflows/deploy.yml`:
a cada `git push` na branch `main`, o GitHub gera o build e publica em
`https://<usuario>.github.io/<repositorio>/`. O acompanhamento fica na aba **Actions**.

O app vive numa subpasta (`/minimapa-gps/`), por isso o workflow define `BASE_PATH`
e o `vite.config.ts` usa essa variável como `base`. Localmente, a base é `/`.

## Estrutura

```
public/styles/        temas em JSON (estilos MapLibre)
src/main.ts           ponto de entrada: liga todos os módulos
src/state.ts          estado global + eventos (os módulos só conversam por aqui)
src/map/              mapa, temas, câmera, marcador do jogador, rota, toque longo
src/geo/              GPS e contas geográficas (distância, projeção na rota)
src/services/         Photon (busca) e OSRM (rotas)
src/nav/              navegador, instruções em pt-BR, voz, recálculo, simulador, tela ligada
src/ui/               busca (+ recentes), painel de manobra, folhas de baixo (rota, mapas,
                      chegada), barra da navegação, botões, velocímetro, HUD dos temas
src/skins/<skin>/     a cara de jogo de cada tema: skin.css, player.svg, pin.svg, poi/*.svg
src/styles/           fontes, variáveis e componentes da interface
referencias/          paletas medidas dos jogos, prints antes/depois e os scripts de teste
                      (as capturas dos jogos em si ficam fora do git)
scripts/              gerador dos ícones de pontos de interesse
```

## Criar um tema novo

Um tema é **um arquivo de estilo** (`public/styles/<tema>.json`) + **uma pasta de skin**
(`src/skins/<skin>/`).

1. **Estilo.** Copie `public/styles/los-santos.json` para `public/styles/meu-tema.json` e
   troque as cores. As camadas estão na ordem em que são desenhadas: fundo → áreas → água →
   prédios → ruas → rótulos. Texturas geradas pelo app podem ser usadas pelo nome em
   `background-pattern`/`fill-pattern` (`papel-rdr`, `grade-hyrule`, `agua-mc`; ver
   `src/map/patterns.ts`).
2. **Fontes dos nomes.** Os temas não têm `glyphs`: o MapLibre desenha os nomes com as fontes
   da página (`src/styles/fonts.css`). Em `text-font`, use só o nome exato da família CSS
   (`["Oswald"]`, `["Rye"]`...), sem "Bold" etc.
3. **Bloco `metadata.minimapa`:**

   ```json
   "metadata": {
     "minimapa": {
       "label": "Meu Tema",
       "skin": "meu-tema",
       "hud": ["local", "escala"],
       "route": { "color": "#ff0", "casing": "#330", "glow": "#ff8" },
       "ui": { "bg": "rgba(0,0,0,.9)", "fg": "#fff", "accent": "#ff0",
               "player-fill": "#fff", "player-stroke": "#000", "font": "system-ui" }
     }
   }
   ```

   `hud` (opcional): `local` (caixa BAIRRO / RUA), `escala`, `regiao` (nome grande do bairro),
   `posicao` (coordenadas), `bussola`. `containerClass` (opcional): classe CSS no mapa
   enquanto o tema estiver ativo (ex.: a moldura do Minecraft (mapa)).
4. **Pasta da skin** `src/skins/meu-tema/`: `skin.css` (variáveis em `:root.skin-meu-tema`),
   `player.svg`, `pin.svg` e `poi/<categoria>.svg` (restaurante, fast-food, bar, cafe, loja,
   posto, farmacia, hotel). O que faltar vem de `src/skins/padrao/`. Não precisa registrar
   nada: o app encontra a pasta sozinho.
5. **Registre** o estilo em `src/map/themes.ts`, na lista `THEMES`:

   ```ts
   jsonTheme('meu-tema', 'Meu Tema', 'meu-tema.json', { land: '#222', road: '#999', route: '#ff0', accent: '#ff0' }),
   ```

6. Confira se o estilo é válido:

   ```bash
   npx -p @maplibre/maplibre-gl-style-spec gl-style-validate public/styles/meu-tema.json
   ```

**Dicas:**
- Os dados seguem o esquema [OpenMapTiles](https://openmaptiles.org/schema/): camadas
  `transportation`, `water`, `landuse`, `park`, `building`, `place`, `poi`...
- Para medir as cores de uma referência: `referencias/tools/paletas.py` e `medir.py`;
  para conferir o tema contra a paleta: `referencias/tools/conferir.py`.
- Documentação do formato: [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/).

## Limitações conhecidas

- **Sem trânsito.** O OSRM calcula o tempo pela velocidade das vias; na hora do rush, o
  tempo real é maior.
- **Serviços públicos gratuitos.** OSRM, Photon e OpenFreeMap são servidores públicos,
  sem garantia de disponibilidade. O app os poupa: busca com espera de 350 ms e mínimo de
  3 letras, no máximo uma rota a cada 2 s e um recálculo a cada 10 s. Não é adequado para
  muitos usuários ao mesmo tempo.
- **Precisa de internet.** O app abre sem conexão, mas mapa, busca e rotas vêm da rede e
  não ficam guardados.
- **Segundo plano.** Um PWA não recebe GPS com a tela desligada ou com outro app na frente;
  a navegação pausa até você voltar. A tela fica ligada durante a navegação (Screen Wake
  Lock), onde o navegador suporta.
- **Voz.** Depende das vozes do sistema; a qualidade varia. No iPhone, o áudio só é
  liberado depois de um toque, por isso a navegação começa no botão "Iniciar".
  Confira também se o celular não está no silencioso.
- **GPS em ambiente fechado** salta bastante; a direção só é confiável em movimento.
- **Sem orientação de faixas** ("use as duas faixas da esquerda").
- **Só carro.** O perfil do OSRM público usado é o de carro.
- **Minecraft 3D** esconde os nomes das ruas (a rua aparece no painel de manobra) e
  desenha prédios em 3D, o que pesa mais em celulares antigos.
- **Hyrule** baixa dados de elevação para as curvas de nível (~200 KB para cada região de
  ~10 km).
- **Caixa BAIRRO / RUA (GTA V):** o bairro aparece depois da primeira vez em que o mapa é
  visto mais de longe (por exemplo, na prévia da rota), porque os tiles só trazem um ponto
  no meio de cada bairro.

## Créditos e atribuições

- **Dados do mapa:** © colaboradores do [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
  A atribuição fica sempre visível no canto do mapa.
- **Tiles vetoriais:** [OpenFreeMap](https://openfreemap.org), no esquema [OpenMapTiles](https://openmaptiles.org).
- **Rotas:** [OSRM](https://project-osrm.org) (servidor público de demonstração).
- **Busca de endereços:** [Photon](https://photon.komoot.io), da Komoot.
- **Renderização:** [MapLibre GL JS](https://maplibre.org) (BSD-3-Clause).
- **Cores dos temas:** medidas em capturas de tela dos jogos (`referencias/paletas.md`). As
  capturas não fazem parte do repositório; ícones e marcadores são desenhos próprios.
- **Curvas de nível (Hyrule):** elevação do [Mapterhorn](https://mapterhorn.com/attribution);
  isolinhas geradas por [maplibre-contour](https://github.com/onthegomap/maplibre-contour)
  (BSD-3-Clause).
- **Tema Minecraft 3D:** [sickmaps](https://github.com/Cincinnatus101010/sickmaps)
  (`@iantroisi/sickmaps`), licença MIT, Copyright (c) 2026 Cincinnatus101010.
  Usamos os estilos, as texturas de bloco, a grade de chunks e o CSS de HUD da biblioteca.
  No app, trocamos o fundo preto por grama, adicionamos pedra nas áreas urbanas, variamos
  o material dos prédios e reduzimos a altura deles para não esconderem a rota.
  O texto da licença é publicado junto com o app em `public/licenses/sickmaps-LICENSE.txt`.
- **Fontes da interface:** Oswald, Rye, IM Fell English, Pixelify Sans, Pirata One e Cinzel,
  via [Fontsource](https://fontsource.org), todas sob a [SIL Open Font License 1.1](https://openfontlicense.org)
  (lista em `public/licenses/fonts-OFL.txt`).
- **Tema Hyrule:** paleta medida e ícones desenhados para o app, inspirados no mapa de Zelda:
  Tears of the Kingdom; nenhuma arte do jogo é usada.

Projeto pessoal de fã, sem fins lucrativos e sem relação com a Rockstar Games, a Mojang, a
Microsoft ou a Nintendo.
