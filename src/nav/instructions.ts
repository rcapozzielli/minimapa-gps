// Transforma as manobras estruturadas do OSRM (type + modifier) em texto pt-BR.
// Não usamos o texto em inglês do OSRM: montamos nossas próprias frases.
// Referência dos tipos: https://project-osrm.org/docs/v5.24.0/api/#stepmaneuver-object
import type { OsrmStep } from '../services/osrm';

export interface Instruction {
  /** Texto curto para o painel, ex.: "Vire à direita". */
  action: string;
  /** Rua de destino (ou "" se não houver nome). */
  street: string;
  /** Frase para falar, começando em minúscula, ex.: "vire à direita na Rua Tutóia". */
  spoken: string;
  /** Ícone a desenhar (ver icons.ts). */
  icon: IconKind;
}

export type IconKind =
  | { kind: 'arrow'; angle: number } // 0 = em frente, 90 = direita, -90 = esquerda
  | { kind: 'uturn' }
  | { kind: 'roundabout'; exit?: number }
  | { kind: 'arrive' };

const DIRECTION: Record<string, string> = {
  right: 'à direita',
  left: 'à esquerda',
  'slight right': 'levemente à direita',
  'slight left': 'levemente à esquerda',
  'sharp right': 'acentuadamente à direita',
  'sharp left': 'acentuadamente à esquerda',
  straight: 'em frente',
};

const ANGLE: Record<string, number> = {
  straight: 0,
  'slight right': 45,
  right: 90,
  'sharp right': 135,
  'slight left': -45,
  left: -90,
  'sharp left': -135,
};

const ORDINAL = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta', 'sétima', 'oitava', 'nona', 'décima'];

// Tipos de via masculinos; o resto (Rua, Avenida, Alameda, Estrada, Rodovia...) é feminino.
const MASCULINE = /^(viaduto|largo|túnel|tunel|elevado|complexo|anel|acesso|caminho|beco|parque|passeio|boulevard|trevo|rodoanel|minianel|contorno|eixo)\b/i;
const FEMININE = /^(rua|avenida|av\.|alameda|travessa|estrada|rodovia|praça|ladeira|marginal|via|ponte|passagem|vila|servidão|vielas?)\b/i;

/** "na Rua X" / "no Viaduto Y" / "em SP-070". */
function em(name: string): string {
  if (FEMININE.test(name)) return `na ${name}`;
  if (MASCULINE.test(name)) return `no ${name}`;
  return `em ${name}`;
}

/** "pela Rua X" / "pelo Viaduto Y" / "por SP-070". */
function por(name: string): string {
  if (FEMININE.test(name)) return `pela ${name}`;
  if (MASCULINE.test(name)) return `pelo ${name}`;
  return `por ${name}`;
}

function streetOf(step: OsrmStep): string {
  if (step.name && step.ref) return `${step.name} (${step.ref})`;
  return step.name || step.ref || '';
}

function iconFor(step: OsrmStep): IconKind {
  const { type, modifier, exit } = step.maneuver;
  if (type === 'arrive') return { kind: 'arrive' };
  if (type.includes('roundabout') || type.includes('rotary')) return { kind: 'roundabout', exit };
  if (modifier === 'uturn') return { kind: 'uturn' };
  return { kind: 'arrow', angle: ANGLE[modifier ?? 'straight'] ?? 0 };
}

export function buildInstruction(step: OsrmStep): Instruction {
  const { type, modifier, exit } = step.maneuver;
  const street = streetOf(step);
  // Para falar, só o nome (a sigla entre parênteses soa estranha).
  const spokenStreet = step.name || step.ref || '';
  const dir = DIRECTION[modifier ?? ''] ?? '';
  const side = modifier?.includes('left') ? 'à esquerda' : modifier?.includes('right') ? 'à direita' : '';
  const toward = step.destinations ? ` sentido ${step.destinations.split(',')[0]}` : '';

  let action: string;
  let spoken: string;
  const withStreet = (s: string, prep: (n: string) => string = em) =>
    spokenStreet ? `${s} ${prep(spokenStreet)}` : s;

  switch (type) {
    case 'depart':
      action = 'Siga em frente';
      spoken = spokenStreet ? `siga ${por(spokenStreet)}` : 'siga em frente';
      break;

    case 'arrive':
      action = side ? `Destino ${side}` : 'Destino';
      spoken = side ? `você chegará ao destino, ${side}` : 'você chegará ao destino';
      break;

    case 'roundabout':
    case 'rotary': {
      const nth = exit && exit <= ORDINAL.length ? ORDINAL[exit - 1] : null;
      action = nth ? `Rotatória: ${exit}ª saída` : 'Entre na rotatória';
      spoken = nth ? `na rotatória, pegue a ${nth} saída` : 'entre na rotatória';
      if (spokenStreet) spoken += ` para ${spokenStreet}`;
      break;
    }

    case 'roundabout turn':
      action = `Na rotatória, vire ${dir}`;
      spoken = withStreet(`na rotatória, vire ${dir}`);
      break;

    case 'exit roundabout':
    case 'exit rotary':
      action = 'Saia da rotatória';
      spoken = withStreet('saia da rotatória', (n) => `para ${n}`);
      break;

    case 'merge':
      action = side ? `Incorpore ${side}` : 'Incorpore-se à via';
      spoken = withStreet(side ? `incorpore ${side}` : 'entre');
      break;

    case 'on ramp':
      action = side ? `Pegue o acesso ${side}` : 'Pegue o acesso';
      spoken = (side ? `pegue o acesso ${side}` : 'pegue o acesso') + (spokenStreet ? ` para ${spokenStreet}` : toward);
      break;

    case 'off ramp':
      action = side ? `Pegue a saída ${side}` : 'Pegue a saída';
      spoken = (side ? `pegue a saída ${side}` : 'pegue a saída') + (spokenStreet ? ` para ${spokenStreet}` : toward);
      break;

    case 'fork':
      action = side ? `Mantenha-se ${side}` : 'Siga na bifurcação';
      spoken = withStreet(side ? `na bifurcação, mantenha-se ${side}` : 'siga na bifurcação');
      break;

    case 'end of road':
      action = `Vire ${dir || side}`;
      spoken = withStreet(`no fim da via, vire ${dir || side}`);
      break;

    case 'new name':
    case 'continue':
    case 'notification':
    case 'use lane':
      if (modifier === 'uturn') {
        action = 'Faça o retorno';
        spoken = withStreet('faça o retorno');
      } else if (!modifier || modifier === 'straight') {
        action = 'Continue em frente';
        spoken = withStreet('continue');
      } else if (modifier.startsWith('slight')) {
        action = `Mantenha-se ${side}`;
        spoken = withStreet(`mantenha-se ${side}`);
      } else {
        action = `Vire ${dir}`;
        spoken = withStreet(`vire ${dir}`);
      }
      break;

    case 'turn':
    default:
      if (modifier === 'uturn') {
        action = 'Faça o retorno';
        spoken = withStreet('faça o retorno');
      } else if (modifier === 'straight') {
        action = 'Siga em frente';
        spoken = withStreet('siga em frente');
      } else {
        action = `Vire ${dir}`;
        spoken = withStreet(`vire ${dir}`);
      }
  }

  return { action, street, spoken, icon: iconFor(step) };
}

/** Distância falada, arredondada: "200 metros", "1 quilômetro", "2,5 quilômetros". */
export function spokenDistance(m: number): string {
  if (m < 1000) return `${Math.max(50, Math.round(m / 50) * 50)} metros`;
  const km = Math.round(m / 100) / 10;
  if (km === 1) return '1 quilômetro';
  return `${km.toLocaleString('pt-BR')} quilômetros`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
