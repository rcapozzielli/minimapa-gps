# Minimapa GPS

Navegação GPS no celular com visual de minimapa de jogo de mundo aberto. É um PWA
feito com Vite + TypeScript + MapLibre GL JS, gratuito e sem chave de API.

> Este README será completado na fase de deploy (como rodar no celular, como criar
> um tema, limitações conhecidas).

## Rodar localmente

```bash
npm install
npm run dev        # https://localhost:5173 (certificado autoassinado)
```

- `?sim=1`: modo simulação. Um carro falso percorre a rota; tem o botão "Desviar" para testar o recálculo.
- `?pos=lat,lng`: fixa uma posição falsa (ex.: `?pos=-23.5614,-46.6559`).

## Temas

O botão de paleta (canto inferior) alterna entre os temas:

| Tema | Origem |
|---|---|
| Los Santos | `public/styles/los-santos.json` (estilo próprio, minimapa do GTA V) |
| Red Dead | `public/styles/red-dead.json` (estilo próprio, mapa de pergaminho do RDR2) |
| Minecraft | gerado pela biblioteca [sickmaps](https://github.com/Cincinnatus101010/sickmaps), com ajustes nossos (grama no lugar do fundo preto, pedra nas áreas urbanas, prédios por material) |

Os temas são registrados em `src/map/themes.ts`.

## Créditos e atribuições

- **Dados do mapa:** © colaboradores do [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
  A atribuição fica sempre visível no canto do mapa.
- **Tiles vetoriais:** [OpenFreeMap](https://openfreemap.org), no esquema [OpenMapTiles](https://openmaptiles.org).
- **Rotas:** [OSRM](https://project-osrm.org) (servidor público de demonstração).
- **Busca de endereços:** [Photon](https://photon.komoot.io), da Komoot.
- **Renderização:** [MapLibre GL JS](https://maplibre.org) (BSD-3-Clause).
- **Tema Red Dead:** paleta (terra `#DEC29B`, tinta `#40423D`, água `#9E9985`, manchas `#C8B28D`)
  inspirada no estudo de Lee Martin, ["How I Designed a Red Dead Redemption 2 Inspired Map"](https://dev.to/leemartin/how-i-designed-a-red-dead-redemption-2-inspired-map-in-mapbox-studio-4gkh).
  Projeto de fã, sem relação com a Rockstar Games.
- **Cores do Minecraft:** a cor de grama vem da tabela de cores do item "mapa" do jogo
  ([Minecraft Wiki](https://minecraft.wiki/w/Map_item_format)).
- **Tema Minecraft:** [sickmaps](https://github.com/Cincinnatus101010/sickmaps)
  (`@iantroisi/sickmaps`), licença MIT, Copyright (c) 2026 Cincinnatus101010.
  Usamos os estilos, as texturas de bloco, a grade de chunks e o CSS de HUD da biblioteca.
  No app, adaptamos a altura dos prédios 3D para não esconderem a rota.
  O texto da licença é publicado junto com o app em `public/licenses/sickmaps-LICENSE.txt`.
