// Registra o service worker (PWA) e avisa quando há uma versão nova do app.
// A atualização só acontece quando você toca em "Atualizar", e o aviso espera
// a navegação terminar: recarregar a página no meio de uma rota seria péssimo.
import { registerSW } from 'virtual:pwa-register';
import { getState, subscribe } from '../state';

export function setupUpdatePrompt(root: HTMLElement): void {
  const bar = document.createElement('div');
  bar.className = 'update';
  bar.hidden = true;
  bar.innerHTML = `<span>Nova versão disponível</span><button>Atualizar</button>`;
  root.append(bar);

  let pending = false;
  const show = () => {
    bar.hidden = !pending || getState().navigating;
  };

  const updateSW = registerSW({
    onNeedRefresh() {
      pending = true;
      show();
    },
  });

  bar.querySelector('button')!.addEventListener('click', () => {
    bar.hidden = true;
    void updateSW(true); // ativa o service worker novo e recarrega a página
  });

  subscribe((_s, changed) => {
    if ('navigating' in changed) show();
  });
}
