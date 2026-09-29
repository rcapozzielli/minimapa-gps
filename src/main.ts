// Ponto de entrada: cria o mapa e liga cada módulo ao estado global.
// CSS: fontes, variáveis/globais e componentes. O CSS de cada skin vem de src/skins/index.ts.
import './styles/fonts.css';
import './styles/base.css';
import './styles/components.css';
import { getState, setState, subscribe } from './state';
import { createMap } from './map/map';
import { getSavedThemeId, setTheme } from './map/themes';
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
import { addRecent } from './ui/recents';
import { createManeuverPanel } from './ui/maneuverPanel';
import { createMapControls } from './ui/mapControls';
import { createSpeedometer } from './ui/speedometer';
import { createRoutePreview } from './ui/routePreview';
import { createNavBar } from './ui/navBar';
import { createThemePicker } from './ui/themePicker';
import { createHud } from './ui/hud';
import { createArrivedSheet } from './ui/arrivedSheet';
import { setupUpdatePrompt } from './ui/updatePrompt';

const ui = document.getElementById('ui')!;
const map = createMap('map');

createPlayer(map);
setupCamera(map);
setupRouteLayer(map);

// Pilha do topo: barra de busca (parado) ou painel de manobra (navegando) e, abaixo,
// a coluna de botões do mapa à direita (Camadas, bússola, voz).
const top = document.createElement('div');
top.className = 'top-stack';
ui.append(top);
createSearchBar(top, () => getState().position ?? map.getCenter().toArray());
createManeuverPanel(top);
setupUpdatePrompt(top); // aviso de versão nova do app, logo abaixo da busca
createMapControls(top, map);

// Pilha de baixo (sobe junto com a folha aberta): velocímetro, "Recentralizar" e,
// durante a navegação, a barra com chegada e "Encerrar".
const bottom = document.createElement('div');
bottom.className = 'bottom-stack';
ui.append(bottom);
const fabRow = createButtons(bottom);
createSpeedometer(fabRow.left);
createNavBar(bottom);
// HUD do tema (escala, BAIRRO / RUA, nome da região, coordenadas): cada tema liga as suas peças.
createHud(ui, bottom, map);

// Folhas de baixo: prévia da rota (abre sozinha quando há destino), seletor de mapas e chegada.
const routeSheet = createRoutePreview(ui);
createThemePicker(ui, map);
createArrivedSheet(ui);

subscribe((s, changed) => {
  // A classe no <body> deixa o CSS trocar a barra de busca pelo painel de manobra.
  if ('navigating' in changed) document.body.classList.toggle('is-navigating', s.navigating);
  // Qual folha está aberta: o CSS esconde os botões de baixo atrás de folhas altas.
  if ('sheet' in changed) document.body.dataset.sheet = s.sheet ?? '';
});

initVoice();
setupWakeLock();
onLongPress(map, (lngLat) => {
  if (getState().navigating) return;
  const label = 'Ponto marcado no mapa';
  // Guarda nos recentes com as coordenadas como subtítulo (para distinguir os pontos).
  const subtitle = `${lngLat[1].toFixed(5)}, ${lngLat[0].toFixed(5)}`;
  addRecent({ lngLat, label, subtitle });
  setState({ destination: { lngLat, label } });
});
// Rotas prontas: enquadra todas as opções (a escolhida e as alternativas) acima da folha.
startRouting((routes) =>
  showRouteOverview(map, routes.flatMap((r) => r.coords), routeSheet.el.offsetHeight),
);
setupNavigator(() => {
  // Chegou: esquece o destino e mostra a folha "Você chegou".
  setState({ destination: null });
  setState({ sheet: 'arrived' });
});
if (isSimulation()) {
  // O botão "Desviar (sim)" fica no centro da linha de baixo, ao lado de "Recentralizar".
  startSimulator(fabRow.center);
  // Para depurar no console do navegador e para os scripts de teste (só no modo simulação):
  // minimapa.map, minimapa.getState(), minimapa.setState(). Use estes, e não import('/src/state.ts'):
  // depois de uma edição com o servidor rodando, o Vite serve os módulos com ?t=..., e um import
  // sem esse sufixo carrega OUTRA cópia do estado, separada do app.
  Object.assign(window, { minimapa: { map, getState, setState } });
}
startLocation((msg) => toast(ui, msg));

// Tema salvo da última vez (ou o padrão). Se falhar, cai no primeiro tema da lista.
setTheme(map, getSavedThemeId()).catch(() => setTheme(map, 'los-santos'));
