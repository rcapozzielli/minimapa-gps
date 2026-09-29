// Folha de baixo reutilizável (estilo Google Maps): sobe da borda inferior, tem uma alça
// para arrastar e, se puder ser dispensada, fecha ao arrastar para baixo.
//
// Quem manda é o estado: a folha fica aberta enquanto `state.sheet === id`. Para abrir,
// setState({ sheet: 'themes' }); para fechar, setState({ sheet: null }). Só uma folha
// fica aberta por vez (abrir outra fecha a atual automaticamente).
//
// Uso:
//   const sheet = createSheet(ui, 'themes', { title: 'Mapas' });
//   sheet.body.append(...);      // conteúdo
//   sheet.onOpen(() => ...);     // opcional: atualizar o conteúdo ao abrir
import { getState, setState, subscribe, type SheetId } from '../state';

/** Arrastar mais que isso para baixo fecha a folha. */
const CLOSE_DRAG_PX = 80;

export interface SheetOptions {
  /** Título no topo da folha (opcional). */
  title?: string;
  /** Pode ser fechada arrastando para baixo ou com Esc? (padrão: sim) */
  dismissible?: boolean;
}

export interface Sheet {
  el: HTMLElement;
  titleEl: HTMLElement;
  body: HTMLElement;
  /** Chamado toda vez que a folha abre. */
  onOpen: (fn: () => void) => void;
}

export function createSheet(root: HTMLElement, id: SheetId, opts: SheetOptions = {}): Sheet {
  const dismissible = opts.dismissible ?? true;
  const el = document.createElement('section');
  el.className = `sheet sheet-${id} is-closed`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="sheet-handle" aria-hidden="true"></div>
    <h2 class="sheet-title"></h2>
    <div class="sheet-body"></div>`;
  root.append(el);

  const handle = el.querySelector<HTMLElement>('.sheet-handle')!;
  const titleEl = el.querySelector<HTMLElement>('.sheet-title')!;
  const body = el.querySelector<HTMLElement>('.sheet-body')!;
  titleEl.textContent = opts.title ?? '';
  titleEl.hidden = !opts.title;
  if (opts.title) el.setAttribute('aria-label', opts.title);

  const openListeners: Array<() => void> = [];
  let isOpen = false;

  const render = (open: boolean) => {
    if (open === isOpen) return;
    isOpen = open;
    el.classList.toggle('is-closed', !open);
    el.setAttribute('aria-hidden', String(!open));
    el.inert = !open; // fechada, não recebe foco nem toques
    if (open) for (const fn of openListeners) fn();
  };
  el.inert = true;

  subscribe((s, changed) => {
    if ('sheet' in changed) render(s.sheet === id);
  });

  // ---- Arrastar para fechar (pela alça ou pelo título) ----
  let startY: number | null = null;
  let dy = 0;
  const onDown = (e: PointerEvent) => {
    if (!dismissible) return;
    startY = e.clientY;
    dy = 0;
    el.style.transition = 'none';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (startY === null) return;
    dy = Math.max(0, e.clientY - startY); // só para baixo
    el.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    if (startY === null) return;
    startY = null;
    el.style.transition = '';
    el.style.transform = '';
    if (dy > CLOSE_DRAG_PX && getState().sheet === id) setState({ sheet: null });
  };
  for (const target of [handle, titleEl]) {
    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dismissible && getState().sheet === id) setState({ sheet: null });
  });

  return { el, titleEl, body, onOpen: (fn) => openListeners.push(fn) };
}
