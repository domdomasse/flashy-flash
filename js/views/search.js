import { getCatalog } from '../data.js';
import { el, onCleanup } from '../render.js';
import { navigate } from '../router.js';

export async function renderSearch(container, { q }) {
  const catalog = await getCatalog();

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, '←'),
    el('h1', {}, '🔍 Recherche')
  );

  const input = el('input', {
    type: 'text',
    class: 'search-input',
    placeholder: 'Rechercher un terme, une notion...',
  });
  input.value = q || '';

  const resultsEl = el('div', { class: 'search-results' });
  const wrapper = el('div', { class: 'search-bar-full' }, input);

  const view = el('div', { class: 'view' });
  view.append(topbar, wrapper, resultsEl);
  container.appendChild(view);

  // Load all cards
  const allResults = [];
  for (const subject of catalog.subjects) {
    for (const chapter of subject.chapters) {
      try {
        const res = await fetch(`data/${subject.id}/${chapter.id}/cards.json`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const card of data.cards) {
          allResults.push({
            type: 'flashcard',
            subject, chapter, card,
            searchText: (card.q + ' ' + card.a.replace(/<[^>]+>/g, '')).toLowerCase()
          });
        }
      } catch { /* skip */ }
    }
  }

  function doSearch() {
    const query = input.value.trim().toLowerCase();
    resultsEl.innerHTML = '';

    if (query.length < 2) {
      resultsEl.appendChild(el('div', { class: 'placeholder', style: 'padding:40px 20px' },
        el('p', {}, query.length === 0 ? 'Tape un terme pour chercher dans tous les chapitres.' : 'Continue à taper...')
      ));
      return;
    }

    const terms = query.split(/\s+/);
    const matches = allResults.filter(r => terms.every(t => r.searchText.includes(t)));

    if (matches.length === 0) {
      resultsEl.appendChild(el('div', { class: 'placeholder', style: 'padding:40px 20px' },
        el('p', {}, `Aucun résultat pour « ${query} ».`)
      ));
      return;
    }

    resultsEl.appendChild(el('div', { class: 'section-title' }, `${matches.length} résultat${matches.length > 1 ? 's' : ''}`));

    for (const match of matches.slice(0, 50)) {
      const card = el('div', { class: 'search-result-card', onClick: () => {
        navigate(`${match.subject.id}/${match.chapter.id}/flashcards`);
      }},
        el('div', { class: 'search-result-q' }, match.card.q),
        el('div', { class: 'search-result-meta' }, `${match.subject.icon} ${match.chapter.name}`)
      );
      resultsEl.appendChild(card);
    }
  }

  // Debounced search
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(doSearch, 200);
  });

  onCleanup(() => clearTimeout(timer));

  // Initial search if query provided
  if (q) doSearch();
  input.focus();
}
