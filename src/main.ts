// Ponto de entrada: cria o mapa e liga cada módulo ao estado global.
import './styles.css';
import { createMap } from './map/map';
import { createPlayer } from './map/player';
import { setupCamera } from './map/camera';
import { startLocation } from './geo/location';
import { createButtons, toast } from './ui/buttons';

const ui = document.getElementById('ui')!;
const map = createMap('map');

createPlayer(map);
setupCamera(map);
createButtons(ui);
startLocation((msg) => toast(ui, msg));
