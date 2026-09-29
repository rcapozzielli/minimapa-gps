// Formatação de distância, duração e horário no padrão brasileiro.

export function formatDistance(m: number): string {
  if (m < 1000) {
    // Arredonda de 10 em 10 m (de 50 em 50 acima de 300 m): números "limpos" como num GPS.
    const step = m < 300 ? 10 : 50;
    return `${Math.max(step, Math.round(m / step) * step)} m`;
  }
  const km = m / 1000;
  return `${km.toLocaleString('pt-BR', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

export function formatDuration(s: number): string {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, '0')} min`;
}

export function formatArrival(secondsFromNow: number): string {
  const t = new Date(Date.now() + secondsFromNow * 1000);
  return t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
