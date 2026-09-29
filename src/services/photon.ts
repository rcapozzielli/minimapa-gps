// Busca de endereços no Photon (photon.komoot.io), servidor público e gratuito.
// Política de uso: nada de rajadas. Quem chama (searchBar.ts) faz o debounce;
// aqui cancelamos a requisição anterior quando chega uma nova.
import type { LngLat } from '../state';

export interface Place {
  lngLat: LngLat;
  title: string;
  subtitle: string;
}

interface PhotonProps {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  city?: string;
  state?: string;
}

interface PhotonFeature {
  geometry: { coordinates: LngLat };
  properties: PhotonProps;
}

const URL_BASE = 'https://photon.komoot.io/api/';
let inflight: AbortController | null = null;

/** Busca lugares; resultados próximos de `near` aparecem primeiro. */
export async function searchPlaces(query: string, near: LngLat): Promise<Place[]> {
  inflight?.abort();
  const ctrl = new AbortController();
  inflight = ctrl;

  const params = new URLSearchParams({
    q: query,
    limit: '6',
    lon: near[0].toFixed(4),
    lat: near[1].toFixed(4),
  });

  const res = await fetch(`${URL_BASE}?${params}`, { signal: ctrl.signal });
  if (!res.ok) throw new Error(`Busca falhou (${res.status})`);
  const data: { features: PhotonFeature[] } = await res.json();
  return data.features.map(toPlace);
}

function toPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const address = [p.street, p.housenumber].filter(Boolean).join(', ');
  const title = p.name ?? (address || p.city || 'Local sem nome');
  const parts = [p.name ? address : null, p.district ?? p.locality, p.city, p.state];
  // Remove vazios e repetidos (ex.: city e state iguais a "São Paulo").
  const subtitle = [...new Set(parts.filter((x): x is string => !!x && x !== title))].join(' · ');
  return { lngLat: f.geometry.coordinates, title, subtitle };
}
