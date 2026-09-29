// Barra de busca no topo com autocomplete do Photon.
// Debounce: só busca depois de 350 ms sem digitar e com pelo menos 3 letras.
import { setState, subscribe, type LngLat } from '../state';
import { searchPlaces, type Place } from '../services/photon';

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

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

  const render = () => {
    list.replaceChildren(
      ...results.map((p, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = `<strong></strong><span></span>`;
        // textContent (e não innerHTML) para os dados externos: evita injeção de HTML.
        li.querySelector('strong')!.textContent = p.title;
        li.querySelector('span')!.textContent = p.subtitle;
        li.addEventListener('click', () => choose(i));
        return li;
      }),
    );
    list.hidden = results.length === 0;
    if (results.length === 0) showMessage('Nada encontrado.');
  };

  const choose = (i: number) => {
    const place = results[i];
    if (!place) return;
    input.blur(); // fecha o teclado do celular
    setState({ destination: { lngLat: place.lngLat, label: place.title } });
  };

  const runSearch = async () => {
    const q = input.value.trim();
    if (q.length < MIN_CHARS) return;
    try {
      results = await searchPlaces(q, getBias());
      render();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showMessage('Sem conexão com a busca.');
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    clear.hidden = input.value === '';
    if (input.value.trim().length < MIN_CHARS) {
      list.hidden = true;
      return;
    }
    timer = window.setTimeout(runSearch, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && results.length) choose(0);
  });

  input.addEventListener('focus', () => {
    if (results.length && input.value.trim().length >= MIN_CHARS) list.hidden = false;
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
