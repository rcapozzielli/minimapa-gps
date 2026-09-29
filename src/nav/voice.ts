// Voz em pt-BR com a Web Speech API (speechSynthesis), que já vem no navegador.
// A qualidade da voz depende do sistema: no Android costuma ser a do Google,
// no iPhone a "Luciana". As vozes carregam de forma assíncrona, por isso o
// evento 'voiceschanged'.
import { getState, setState } from '../state';

const MUTE_KEY = 'minimapa:muted';
let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): void {
  const voices = speechSynthesis.getVoices();
  const br = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === 'pt-br');
  voice =
    br.find((v) => /google|luciana|francisca|natural|neural/i.test(v.name)) ??
    br[0] ??
    voices.find((v) => v.lang.toLowerCase().startsWith('pt')) ??
    null;
}

export function initVoice(): void {
  if (!('speechSynthesis' in window)) return;
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
  try {
    setState({ muted: localStorage.getItem(MUTE_KEY) === '1' });
  } catch {
    /* sem armazenamento (aba anônima etc.): segue com o padrão */
  }
}

/**
 * Fala um texto. `interrupt` corta o que estiver sendo falado (para avisos
 * urgentes como "vire à direita" na hora da manobra).
 */
export function speak(text: string, interrupt = false): void {
  if (!('speechSynthesis' in window) || getState().muted) return;
  if (interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  if (voice) u.voice = voice;
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

export function setMuted(muted: boolean): void {
  if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  setState({ muted });
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignora */
  }
}
