// Navegação passo a passo. A cada leitura do GPS:
//  1. "encaixa" sua posição na rota (projeção no ponto mais próximo da linha);
//  2. descobre qual é a próxima manobra e quanto falta até ela;
//  3. fala os avisos na hora certa (longe, perto, agora);
//  4. se você saiu mais de ~50 m do trajeto, pede uma nova rota;
//  5. detecta a chegada.
import { getState, setState, subscribe } from '../state';
import type { Route } from '../services/osrm';
import { cumulativeDistances, distance, projectOnLine } from '../geo/math';
import { buildInstruction, capitalize, spokenDistance } from './instructions';
import { speak } from './voice';
import { reroute } from './routing';

const OFF_ROUTE_M = 50;
/** Leituras seguidas fora da rota antes de recalcular (evita recalcular por um "pulo" do GPS). */
const OFF_ROUTE_READINGS = 2;
/** Intervalo mínimo entre recálculos, para não bombardear o OSRM. */
const REROUTE_MIN_INTERVAL_MS = 10_000;
const ARRIVE_M = 25;
/**
 * Passos que não viram aviso: "saia da rotatória" (já foi dito "pegue a 2ª saída")
 * e a simples troca de nome da rua seguindo reto (GPS de verdade não fala isso).
 */
export function isSilent(step: Route['steps'][number]): boolean {
  const { type, modifier } = step.maneuver;
  if (type === 'exit roundabout' || type === 'exit rotary') return true;
  return type === 'new name' && (!modifier || modifier === 'straight' || modifier.startsWith('slight'));
}

interface RouteIndex {
  route: Route;
  /** Distância acumulada até cada vértice da linha. */
  cum: number[];
  /** Distância (ao longo da rota) em que cada manobra acontece. */
  stepStart: number[];
  total: number;
}

let idx: RouteIndex | null = null;
let lastSeg = 0;
let offCount = 0;
let lastRerouteAt = 0;
let announced = { step: -1, far: false, near: false, now: false };
let onArrive: () => void = () => {};

function indexRoute(route: Route): RouteIndex {
  const cum = cumulativeDistances(route.coords);
  const total = cum[cum.length - 1];
  // Cada manobra fica num vértice da linha; procuramos em ordem, a partir da anterior,
  // para não confundir com outro trecho da rota que passe pelo mesmo lugar.
  let seg = 0;
  const stepStart = route.steps.map((step, i) => {
    if (i === 0) return 0;
    if (step.maneuver.type === 'arrive') return total;
    const p = projectOnLine(step.maneuver.location, route.coords, cum, seg);
    seg = p.seg;
    return p.along;
  });
  return { route, cum, stepStart, total };
}

export function setupNavigator(arrived: () => void): void {
  onArrive = arrived;
  subscribe((s, changed) => {
    if ('route' in changed) {
      idx = s.route ? indexRoute(s.route) : null;
      lastSeg = 0;
      offCount = 0;
      announced = { step: -1, far: false, near: false, now: false };
      if (s.navigating && s.route) update();
    }
    if ('destination' in changed && !s.destination && s.navigating) stopNavigation();
    if (changed.position && s.navigating) update();
  });
}

/** Chamado pelo botão "Iniciar" (um toque do usuário, o que também libera o áudio no iPhone). */
export function startNavigation(): void {
  const { route } = getState();
  if (!route) return;
  setState({ navigating: true, following: true });
  speak(`${capitalize(buildInstruction(route.steps[0]).spoken)}.`, true);
  update();
}

export function stopNavigation(): void {
  setState({ navigating: false, nav: null, rerouting: false });
}

function update(): void {
  const s = getState();
  if (!idx || !s.position || !s.navigating) return;
  const { route, cum, stepStart, total } = idx;

  // Procura primeiro perto de onde você estava; só se não achar, procura na rota toda.
  let proj = projectOnLine(s.position, route.coords, cum, lastSeg - 2, lastSeg + 80);
  if (proj.dist > OFF_ROUTE_M) proj = projectOnLine(s.position, route.coords, cum);
  lastSeg = proj.seg;

  // --- Chegada ---
  const end = route.coords[route.coords.length - 1];
  if (total - proj.along < ARRIVE_M || distance(s.position, end) < ARRIVE_M) {
    speak('Você chegou ao seu destino.', true);
    stopNavigation();
    onArrive();
    return;
  }

  // --- Fora da rota? --- (com GPS impreciso, a tolerância cresce junto, até 100 m)
  const tolerance = Math.max(OFF_ROUTE_M, Math.min(s.accuracy ?? 0, 100));
  if (proj.dist > tolerance) {
    offCount++;
    if (offCount >= OFF_ROUTE_READINGS && !s.rerouting && Date.now() - lastRerouteAt > REROUTE_MIN_INTERVAL_MS) {
      lastRerouteAt = Date.now();
      speak('Recalculando a rota.', true);
      void reroute();
    }
  } else {
    offCount = 0;
  }

  // --- Próxima manobra --- (pula os passos silenciosos)
  let next = stepStart.findIndex((d, i) => i > 0 && d > proj.along + 3 && !isSilent(route.steps[i]));
  if (next === -1) next = route.steps.length - 1;
  const distToManeuver = Math.max(0, stepStart[next] - proj.along);

  // Tempo restante: soma a parte ainda não percorrida de cada trecho.
  let remainingDuration = 0;
  route.steps.forEach((step, i) => {
    const from = stepStart[i];
    const to = stepStart[i + 1] ?? total;
    if (to <= proj.along) return;
    remainingDuration += step.duration * ((to - Math.max(from, proj.along)) / (to - from || 1));
  });

  setState({
    nav: {
      stepIndex: next,
      distToManeuver,
      remainingDistance: total - proj.along,
      remainingDuration,
      snapped: proj.point,
      segIndex: proj.seg,
    },
  });

  if (offCount === 0) announce(next, distToManeuver, s.speed);
}

/** Decide se é hora de falar. Os limites crescem com a velocidade (na estrada, avisa mais cedo). */
function announce(stepIndex: number, dist: number, speed: number): void {
  if (!idx) return;
  const step = idx.route.steps[stepIndex];

  if (announced.step !== stepIndex) {
    const afterManeuver = announced.step !== -1;
    announced = { step: stepIndex, far: false, near: false, now: false };
    // Logo depois de uma manobra, se a próxima está longe, dá uma noção do trecho.
    if (afterManeuver && dist > 2000) speak(`Siga por ${spokenDistance(dist)}.`);
  }

  const v = Math.max(speed, 8); // ~30 km/h mínimo, para os limites não ficarem curtos demais
  const farDist = Math.max(500, v * 30);
  const nearDist = Math.max(150, v * 10);
  const nowDist = Math.max(30, v * 3);
  const ins = buildInstruction(step);
  const isArrive = step.maneuver.type === 'arrive';

  if (dist <= nowDist) {
    // Na chegada quem fala é a detecção de chegada, não este aviso.
    if (!announced.now && !isArrive) speak(`${capitalize(ins.spoken)}.`, true);
    announced = { ...announced, far: true, near: true, now: true };
  } else if (dist <= nearDist) {
    if (!announced.near) speak(`Em ${spokenDistance(dist)}, ${ins.spoken}.`);
    announced = { ...announced, far: true, near: true };
  } else if (dist <= farDist && dist > nearDist + 100) {
    if (!announced.far) speak(`Em ${spokenDistance(dist)}, ${ins.spoken}.`);
    announced = { ...announced, far: true };
  }
}
