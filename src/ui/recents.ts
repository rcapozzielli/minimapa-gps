// Destinos recentes, guardados no aparelho (localStorage, chave "minimapa:recent").
// Todo acesso ao armazenamento fica em try/catch: em janela anônima, com o
// armazenamento bloqueado ou cheio, o app continua funcionando (só sem recentes).
import type { LngLat } from '../state';

export interface Recent {
  label: string;
  subtitle?: string;
  lngLat: LngLat;
}

const KEY = 'minimapa:recent';
const MAX = 8;

function isRecent(x: unknown): x is Recent {
  const r = x as Recent;
  return (
    !!r && typeof r.label === 'string' && Array.isArray(r.lngLat) && r.lngLat.length === 2 &&
    r.lngLat.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export function loadRecents(): Recent[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(data) ? data.filter(isRecent).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Mesmo lugar = mesmo nome e coordenadas a menos de ~10 m. */
function samePlace(a: Recent, b: Recent): boolean {
  return (
    a.label === b.label &&
    Math.abs(a.lngLat[0] - b.lngLat[0]) < 1e-4 &&
    Math.abs(a.lngLat[1] - b.lngLat[1]) < 1e-4
  );
}

/** Põe o destino no topo da lista (sem repetir) e guarda no máximo 8. */
export function addRecent(item: Recent): void {
  const list = [item, ...loadRecents().filter((r) => !samePlace(r, item))].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sem armazenamento: ignora */
  }
}
