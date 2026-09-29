// Barra de busca no topo com autocomplete do Photon.
// Debounce: só busca depois de 350 ms sem digitar e com pelo menos 3 letras.
// Com o campo vazio, ao focar, mostra os destinos recentes (src/ui/recents.ts).
import { setState, subscribe, type LngLat } from '../state';
import { searchPlaces, type Place } from '../services/photon';
import { addRecent, loadRecents, type Recent } from './recents';

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

const CLOCK_ICON = `
<svg class="search-recent-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
  <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/** `getBias` diz perto de onde priorizar resultados (sua posição, ou o centro do mapa). */
export function createSearchBar(root: HTMLElement, getBias: () => LngLat): void {
  const box = document.createElement('div');
  box.className = 'search';
  box.innerHTML = `
    <div class="search-field">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <input type="search" placeholder="Para onde?" enterkeyhint="search"
             autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Buscar destino" />
      <button class="search-clear" aria-label="Limpar" hidden>✕</button>
    </div>
    <ul class="search-results" role="listbox" hidden></ul>`;
  root.append(box);

  const input = box.querySelector('input')!;
  const clear = box.querySelector<HTMLButtonElement>('.search-clear')!;
  const list = box.querySelector('ul')!;
  let results: Place[] = [];
  let timer: number | undefined;

  const showMessage = (msg: string) => {
    list.innerHTML = `<li class="search-msg">${msg}</li>`;
    list.hidden = false;
  };

  /** Item da lista: título + subtítulo (+ ícone opcional). Dados externos só via textContent. */
  const item = (title: string, subtitle: string | undefined, onChoose: () => void, icon = '') => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.innerHTML = icon
      ? `${icon}<div class="search-item-text"><strong></strong><span></span></div>`
      : `<strong></strong><span></span>`;
    if (icon) li.classList.add('search-recent');
    // textContent (e não innerHTML) para os dados externos: evita injeção de HTML.
    li.querySelector('strong')!.textContent = title;
    const sub = li.querySelector('span')!;
    sub.textContent = subtitle ?? '';
    sub.hidden = !subtitle;
    li.addEventListener('click', onChoose);
    return li;
  };

  const render = () => {
    list.replaceChildren(...results.map((p, i) => item(p.title, p.subtitle, () => choose(i))));
    list.hidden = results.length === 0;
    if (results.length === 0) showMessage('Nada encontrado.');
  };

  /** Lista de recentes (se houver). */
  const showRecents = () => {
    const recents = loadRecents();
    if (!recents.length) {
      list.hidden = true;
      return;
    }
    const heading = document.createElement('li');
    heading.className = 'search-heading';
    heading.setAttribute('role', 'presentation');
    heading.textContent = 'Recentes';
    list.replaceChildren(heading, ...recents.map((r) => item(r.label, r.subtitle, () => go(r), CLOCK_ICON)));
    list.hidden = false;
  };

  /** Define o destino e o guarda nos recentes. */
  const go = (r: Recent) => {
    input.blur(); // fecha o teclado do celular
    addRecent(r);
    setState({ destination: { lngLat: r.lngLat, label: r.label } });
  };

  const choose = (i: number) => {
    const place = results[i];
    if (place) go({ lngLat: place.lngLat, label: place.title, subtitle: place.subtitle || undefined });
  };

  const runSearch = async () => {
    const q = input.value.trim();
    if (q.length < MIN_CHARS) return;
    try {
      const found = await searchPlaces(q, getBias());
      if (input.value.trim() !== q) return; // o texto mudou enquanto esperávamos
      results = found;
      render();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showMessage('Sem conexão com a busca.');
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    clear.hidden = input.value === '';
    const q = input.value.trim();
    if (q === '') {
      results = [];
      showRecents();
      return;
    }
    if (q.length < MIN_CHARS) {
      list.hidden = true;
      return;
    }
    timer = window.setTimeout(runSearch, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && results.length) choose(0);
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim();
    if (q === '') showRecents();
    else if (results.length && q.length >= MIN_CHARS) list.hidden = false;
  });

  clear.addEventListener('click', () => {
    results = [];
    input.value = '';
    clear.hidden = true;
    list.hidden = true;
    setState({ destination: null });
  });

  // Tocar fora da busca fecha a lista.
  document.addEventListener('pointerdown', (e) => {
    if (!box.contains(e.target as Node)) list.hidden = true;
  });

  // Mantém o texto da barra em sincronia com o destino (ex.: veio de um toque longo, ou foi cancelado).
  subscribe((s, changed) => {
    if (!('destination' in changed)) return;
    input.value = s.destination?.label ?? '';
    clear.hidden = !s.destination;
    list.hidden = true;
  });
}
