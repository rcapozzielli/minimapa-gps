// Ponto de entrada: cria o mapa e liga cada módulo ao estado global.
// CSS: fontes, variáveis/globais e componentes. O CSS de cada skin vem de src/skins/index.ts.
import './styles/fonts.css';
import './styles/base.css';
import './styles/components.css';
import { getState, setState, subscribe } from './state';
import { createMap } from './map/map';
import { getSavedThemeId, nextThemeId, setTheme, themeLabel } from './map/themes';
import { createPlayer } from './map/player';
import { setupCamera, showRouteOverview } from './map/camera';
import { setupRouteLayer } from './map/routeLayer';
import { onLongPress } from './map/longPress';
import { startLocation } from './geo/location';
import { startRouting } from './nav/routing';
import { setupNavigator } from './nav/navigator';
import { initVoice } from './nav/voice';
import { setupWakeLock } from './nav/wakeLock';
import { isSimulation, startSimulator } from './nav/simulator';
import { createButtons, toast } from './ui/buttons';
import { createSearchBar } from './ui/searchBar';
import { createManeuverPanel } from './ui/maneuverPanel';
import { createTripInfo } from './ui/tripInfo';
import { setupUpdatePrompt } from './ui/updatePrompt';

const ui = document.getElementById('ui')!;
const map = createMap('map');

createPlayer(map);
setupCamera(map);
setupRouteLayer(map);

// Topo: barra de busca (parado) ou painel de manobra (navegando).
createSearchBar(ui, () => getState().position ?? map.getCenter().toArray());
createManeuverPanel(ui);
// Pilha de baixo: botões flutuantes acima do cartão da viagem.
const bottom = document.createElement('div');
bottom.className = 'bottom-stack';
ui.append(bottom);
const fabRow = createButtons(bottom, () => {
  const id = nextThemeId();
  setTheme(map, id).then(
    () => toast(ui, themeLabel(id), 'info', 1500),
    () => toast(ui, `Não consegui carregar o tema ${themeLabel(id)}.`),
  );
});
createTripInfo(bottom);

// A classe no <body> deixa o CSS trocar a barra de busca pelo painel de manobra.
subscribe((s, changed) => {
  if ('navigating' in changed) document.body.classList.toggle('is-navigating', s.navigating);
});

initVoice();
setupWakeLock();
setupUpdatePrompt(ui);
onLongPress(map, (lngLat) => {
  if (!getState().navigating) setState({ destination: { lngLat, label: 'Ponto marcado no mapa' } });
});
// Rotas prontas: enquadra todas as opções (a escolhida e as alternativas).
startRouting((routes) => showRouteOverview(map, routes.flatMap((r) => r.coords)));
setupNavigator(() => {
  toast(ui, 'Você chegou ao destino!', 'info');
  setState({ destination: null });
});
if (isSimulation()) {
  startSimulator(fabRow);
  // Para depurar no console do navegador (só no modo simulação): minimapa.map, minimapa.getState()
  Object.assign(window, { minimapa: { map, getState } });
}
startLocation((msg) => toast(ui, msg));

// Tema salvo da última vez (ou o padrão). Se falhar, cai no primeiro tema da lista.
setTheme(map, getSavedThemeId()).catch(() => setTheme(map, 'los-santos'));
