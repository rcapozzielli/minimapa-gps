// Mantém a tela ligada durante a navegação (Screen Wake Lock API).
// O navegador solta o "lock" sozinho quando o app vai para segundo plano,
// então pedimos de novo quando ele volta a ficar visível.
// Suporte: Chrome/Android e Safari a partir do iOS 16.4 (no app instalado na tela
// inicial do iPhone, versões mais antigas do iOS tinham falhas). Sem suporte, não faz nada.
import { getState, subscribe } from '../state';

let lock: WakeLockSentinel | null = null;

async function acquire(): Promise<void> {
  if (!('wakeLock' in navigator) || lock || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => {
      lock = null;
    });
  } catch {
    // Negado (ex.: modo economia de bateria). A navegação segue normalmente.
  }
}

function release(): void {
  void lock?.release();
  lock = null;
}

export function setupWakeLock(): void {
  subscribe((s, changed) => {
    if (!('navigating' in changed)) return;
    if (s.navigating) void acquire();
    else release();
  });
  document.addEventListener('visibilitychange', () => {
    if (getState().navigating) void acquire();
  });
}
