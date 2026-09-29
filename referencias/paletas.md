# Paletas medidas das referências

Cores **medidas** das imagens em `referencias/`. Os temas do app devem usar só estas cores.
Quando um elemento não aparece na referência, a cor está marcada como **derivada**, com a
regra usada.

## Como foi medido
- **Área (%)**: `tools/paletas.py`. Recorta só a área do mapa (sem a interface do jogo),
  agrupa as cores (quantização octree, 12–24 grupos) e gera `paletas/<jogo>-legenda.png`,
  com uma miniatura por grupo mostrando onde ele aparece. O elemento de cada cor foi
  atribuído olhando essas miniaturas.
- **Detalhe**: `tools/medir.py`. Mediana dos pixels de uma janela pequena que passam num
  filtro de cor (ignora serrilhado e reflexos). Serve para os elementos pequenos que a
  quantização não isola: setas, caixas de texto, anéis, brilhos.
- "% área" é a fração do recorte coberta pelo grupo. Grupos abaixo de 0,15% foram
  descartados como ruído.

---

## GTA V: mapa de pausa (`gtav-mapa.png`, recorte 0,0–1600,1010)

| Elemento | Cor | % área | Medida |
|---|---|---|---|
| Fundo (chão entre prédios e ruas) | `#181818` | 34,8 | área |
| Prédios (um pouco mais claros que o fundo) | `#363636` | 18,6 | área |
| Ruas (todas as classes, cinza claro) | `#979797` | 18,2 | área |
| Ruas: borda/antisserrilhado, vielas | `#5d5d5b` | 14,1 | área |
| Água (cinza-esverdeado escuro) | `#292b26` | 10,4 | área |
| Parques (oliva escuro translúcido) | `#4c4e36` | 0,9 | área |
| Parques (tom mais escuro) | `#3c422e` | 0,4 | área |
| Caixa BAIRRO / RUA: fundo | `#0c0c0a` | — | detalhe |
| Caixa BAIRRO / RUA: texto | `#ffffff` | — | detalhe |
| Barra de escala | `#c6c6c4` | — | detalhe |
| Caixas da legenda (balão do POI): fundo | `#292929` | — | detalhe |
| Verde do HUD (Franklin): jogador padrão, casa/hotel | `#a2dca2` | — | detalhe (4 elementos: `#a0d09c`–`#a8d3a8`) |
| Azul (Michael): jogador | `#a2c4dc` | — | **derivada** de `#a2dca2`: mesma L (0,749) e S (0,453), matiz 205° |
| Laranja (Trevor): jogador | `#dcbfa2` | — | **derivada** de `#a2dca2`: mesma L e S, matiz 30° |

> O azul e o laranja não aparecem na referência (a captura só mostra o verde). Se você tiver
> uma imagem com o Michael ou o Trevor selecionado, dá para medir a cor de verdade.

## GTA San Andreas: mapa completo (`sa-mapa.png`, 1024×1024 inteira)

| Elemento | Cor | % área | Medida |
|---|---|---|---|
| Água (azul-acinzentado) | `#7389ac` | 19,7 | área |
| Terra / mata (verde, predominante) | `#386727` | 14,0 | área |
| Ruas (pretas, grossas) | `#0e110b` | 12,4 | área |
| Áreas urbanas / concreto (cinza claro) | `#9f9f9e` | 12,0 | área |
| Áreas áridas (marrom-claro) | `#9a8970` | 10,5 | área |
| Campos abertos (verde-oliva claro) | `#7c8a38` | 9,4 | área |
| Terra batida / transição árida | `#6a6654` | 7,8 | área |
| Prédios (branco) | `#f2f2f1` | 7,5 | área |
| Verde intermediário (borda de mata) | `#516530` | 2,4 | área |
| Areia de praia (amarelo) | `#e7c163` | 1,1 | área |
| Árido escuro (morros) | `#887765` | 1,0 | área |
| Ferrovias (linhas finas vinho) | `#4d2416` | 0,5 | área |

## Red Dead Redemption 2: minimapa (`rdr2-minimapa.png`, recorte 270,295–1060,1085, dentro do anel)

| Elemento | Cor | % área | Medida |
|---|---|---|---|
| Prédios (papel um pouco mais escuro) | `#cfb793` | 44,0 | área |
| Papel (fundo) | `#dcc19c` | 24,7 | área |
| Ruas e contornos (carvão) | `#444339` | 13,4 | área |
| Ruas: avenida (mediana da linha) | `#41423d` | — | detalhe |
| Tracejado dos parques | `#434335` | — | detalhe (mesmo carvão das ruas) |
| Antisserrilhado do carvão | `#5e594c` | 4,5 | área |
| Granulado do papel (pontos escuros) | `#b3a68d` | 2,9 | área |
| Granulado do papel (pontos mais escuros) | `#978c74` | 1,9 | área |
| Círculo dos ícones | `#000000` | 1,8 (`#23231e` na área) | detalhe |
| Glifo dos ícones | `#f6f6f6` | 0,4 | área |
| Anel e letras da bússola | `#000000` | — | detalhe |
| Jogador: gota | `#ffffff` | — | detalhe |
| Jogador: anel central | `#0c0503` | — | detalhe |

## Zelda: Tears of the Kingdom: mapa (`hyrule-totk-mapa.png`, recorte 250,95–1830,1000)

| Elemento | Cor | % área | Medida |
|---|---|---|---|
| Fundo (carvão azulado, área não explorada) | `#252729` | 84,2 | área |
| Terreno mostarda (claro) | `#584d20` | 4,0 | área |
| Terreno oliva (escuro) | `#493a09` | 3,7 | área |
| Rios/linhas fora da área explorada (ciano apagado) | `#294e59` | 2,9 | área |
| Grade quadrada (tom dominante) | `#1f3547` | 2,8 | área |
| Grade quadrada (linha, pico) | `#42677b` | — | detalhe |
| Água (ardósia) | `#545953` | 1,0 | área |
| Borda da área explorada (ciano) | `#206d8f` | 0,5 | área |
| Borda: brilho | `#27849e` | 0,2 | área |
| Borda: pico do brilho | `#3b9aac` | — | detalhe |
| Curvas de nível (claras) | `#a39d7b` | — | detalhe |
| Nome da região: texto | `#b7a965` (mediana), `#cfbe7b` (pico) | — | detalhe |
| Jogador: triângulo sólido | `#f5f938` | — | detalhe (`#fff69e` com o brilho) |
| Destino: X vermelho | `#d6060a` | — | detalhe |

> A água da referência é mais **cinza-ardósia** (`#545953`) que azul. O tema segue a medida.

## Minecraft: mapa item (`minecraft-mapa-item.png`, recorte 1104,182–2736,1814, só o quadro)

| Elemento | Cor | % área | Medida |
|---|---|---|---|
| Água (tom principal) | `#053096` | 23,1 | área |
| Água (tom claro, par do pontilhado) | `#0137ce` | 5,8 | área |
| Água (tom escuro, fundo) | `#062b75` | 1,4 | área |
| Água (tom mais claro) | `#194ed6` | 0,8 | área |
| Pedra: ruas e prédios de pedra | `#575e53` | 17,0 | área (`#575757` por ponto) |
| Pedra clara | `#a7a89f` | 2,3 | área |
| Grama | `#6f904e` | 16,6 | área |
| Grama clara | `#90a45d` | 2,0 | área |
| Grama (terceiro tom) | `#608735` | 0,7 | área |
| Árvores / mata | `#2c4e19` | 7,8 | área |
| Árvores (sombra) | `#273816` | 1,1 | área |
| Madeira (prédios da vila) | `#6f5c37` | — | detalhe (`#656437` na área, misturado com grama) |
| Neve / quartzo / branco | `#cccccb` | 5,7 | área |
| Areia | `#c2b57c` | 1,9 | área |
| Areia (segundo tom) | `#c2b483` | 0,8 | área |
| Tijolo / telhado vermelho | `#782828` | — | detalhe (`#6f2221` e `#882d2c` na área) |
| Terracota | `#98655d` | 0,9 | área |
| Rosa (lã) | `#b86281` | 0,7 | área |
| Amarelo (lã) | `#c2b93c` | 0,6 | área |
| Ciano (prismarinho) | `#55a29f` | 0,3 | área |
| Moldura: pergaminho | `#c1ac88` | 46,0 da faixa | área (faixa 1030,110–2830,182) |
| Moldura: borda escura | `#8b7a62` | 37,6 da faixa | área |
| Moldura: contorno mais escuro | `#4d352b` | 1,5 da faixa | área |
| Caixa "Position": fundo | `#0b1418` | — | detalhe (preto translúcido sobre o mundo) |
| Caixa "Position": texto | `#ffffff` | — | detalhe |
| Marcador do jogador | `#eeeeee` | — | detalhe |
