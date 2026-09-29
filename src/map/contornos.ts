// Curvas de nível geradas no navegador (maplibre-contour), para o tema Hyrule, como no mapa
// do Zelda: Tears of the Kingdom. Segue o exemplo da skill maplibre-terrain-rendering.
//
// Elevação: tiles gratuitos do Mapterhorn (terrarium, webp, até o zoom 12; acima disso são
// ampliados). A biblioteca baixa esses tiles, calcula as isolinhas num Web Worker (fora da
// thread que desenha a tela) e entrega como uma fonte vetorial comum.
//
// Respeito ao serviço público: os tiles de elevação NÃO entram no cache do service worker
// (o vite.config.ts só guarda os arquivos do app), e só são pedidos no tema que usa curvas.
import * as maplibregl from 'maplibre-gl';
import mlcontour from 'maplibre-contour';

const FONTE = 'curvas-de-nivel';
const CAMADA_FONTE = 'curvas';
const ATRIBUICAO = "<a href='https://mapterhorn.com/attribution'>© Mapterhorn</a>";

let dem: InstanceType<typeof mlcontour.DemSource> | null = null;

/** Cria a fonte de elevação uma vez só e registra o protocolo dela no MapLibre. */
function fonteDeElevacao() {
  if (!dem) {
    dem = new mlcontour.DemSource({
      url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
      encoding: 'terrarium',
      maxzoom: 12,
      worker: true,
    });
    dem.setupMaplibre(maplibregl);
  }
  return dem;
}

/**
 * Insere no estilo a fonte e a camada de curvas de nível, logo abaixo das ruas (`antesDe`).
 * `cor`: cor das linhas; as mestras (a cada 5) ficam mais fortes.
 */
export function adicionarCurvasDeNivel(
  style: maplibregl.StyleSpecification,
  { cor, antesDe }: { cor: string; antesDe: string },
): void {
  style.sources[FONTE] = {
    type: 'vector',
    tiles: [
      fonteDeElevacao().contourProtocolUrl({
        // zoom -> [intervalo das curvas, intervalo das mestras], em metros. São Paulo é
        // suave: na cidade, curvas a cada 10 m (mestras a cada 50 m).
        thresholds: { 11: [50, 250], 13: [20, 100], 15: [10, 50] },
        elevationKey: 'ele',
        levelKey: 'nivel',
        contourLayer: CAMADA_FONTE,
      }),
    ],
    maxzoom: 15,
    attribution: ATRIBUICAO,
  };
  const camada: maplibregl.LayerSpecification = {
    id: 'curvas-de-nivel',
    type: 'line',
    source: FONTE,
    'source-layer': CAMADA_FONTE,
    minzoom: 11,
    paint: {
      'line-color': cor,
      'line-opacity': ['match', ['get', 'nivel'], 1, 0.55, 0.3],
      'line-width': ['match', ['get', 'nivel'], 1, 1.2, 0.7],
    },
  };
  const i = style.layers.findIndex((l) => l.id === antesDe);
  style.layers.splice(i >= 0 ? i : style.layers.length, 0, camada);
}
