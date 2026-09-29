// Ponto de entrada: cria o mapa e liga cada módulo ao estado global.
import './styles.css';
import { getState, setState } from './state';
import { createMap } from './map/map';
import { createPlayer } from './map/player';
import { setupCamera, showRouteOverview } from './map/camera';
import { setupRouteLayer } from './map/routeLayer';
import { onLongPress } from './map/longPress';
import { startLocation } from './geo/location';
import { startRouting } from './nav/routing';
import { createButtons, toast } from './ui/buttons';
import { createSearchBar } from './ui/searchBar';
import { createTripInfo } from './ui/tripInfo';

const ui = document.getElementById('ui')!;
const map = createMap('map', 'los-santos');

createPlayer(map);
setupCamera(map);
setupRouteLayer(map);

createSearchBar(ui, () => getState().position ?? map.getCenter().toArray());
// Pilha de baixo: botões flutuantes acima do cartão da viagem.
const bottom = document.createElement('div');
bottom.className = 'bottom-stack';
ui.append(bottom);
createButtons(bottom);
createTripInfo(bottom);

onLongPress(map, (lngLat) => setState({ destination: { lngLat, label: 'Ponto marcado no mapa' } }));
startRouting((route) => showRouteOverview(map, route.coords));
startLocation((msg) => toast(ui, msg));
