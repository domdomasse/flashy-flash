import { getCatalog } from '../data.js';
import { el, onCleanup } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

const DEF_PATTERNS = [
  /^d[ée]finir\s/i,
  /^que?\s+(signifie|sont?|est-ce qu[e'])/i,
  /^qu['']est-ce qu[e']/i,
];

export async function renderSearch(container, { q }) {
  const catalog = await getCatalog();

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    el('h1', {}, 'Recherche')
  );

  const input = el('input', {
    type: 'text',
    class: 'search-input',
    placeholder: 'Rechercher un chapitre, un terme...',
  });
  input.value = q || '';

  const resultsEl = el('div', { class: 'search-results' });
  const wrapper = el('div', { class: 'search-bar-full' }, input);

  const view = el('div', { class: 'view' });
  view.append(topbar, wrapper, resultsEl);
  container.appendChild(view);

  // Build searchable index: chapters + glossary terms
  const searchItems = [];

  for (const subject of catalog.subjects) {
    for (const chapter of subject.chapters) {
      // Add chapter
      searchItems.push({
        type: 'chapter',
        subject, chapter,
        label: chapter.name,
        sublabel: `${subject.icon} ${subject.name}`,
        searchText: (chapter.name + ' ' + subject.name).toLowerCase(),
        route: `${subject.id}/${chapter.id}/cours`
      });

      // Add glossary terms from cards
      try {
        const res = await fetch(`data/${subject.id}/${chapter.id}/cards.json`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const card of data.cards) {
          const isDef = DEF_PATTERNS.some(p => p.test(card.q));
          if (!isDef) continue;
          let term = card.q
            .replace(/^(D[ée]finir|Que signifie|Qu['']est-ce que?|Qu['']est-ce qu[''])\s*/i, '')
            .replace(/[?.!]+$/, '')
            .replace(/^(un[e]?|l[ea]s?|l['']|d['']|des)\s*/i, '')
            .trim();
          term = term.charAt(0).toUpperCase() + term.slice(1);

          searchItems.push({
            type: 'glossary',
            subject, chapter,
            label: term,
            sublabel: card.a.replace(/<[^>]+>/g, '').slice(0, 80) + '…',
            searchText: (term + ' ' + card.a.replace(/<[^>]+>/g, '')).toLowerCase(),
            route: `${subject.id}/glossary`
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
        el('p', {}, query.length === 0 ? 'Tape un terme pour chercher dans les chapitres et le glossaire.' : 'Continue à taper...')
      ));
      return;
    }

    const terms = query.split(/\s+/);
    const matches = searchItems.filter(r => terms.every(t => r.searchText.includes(t)));

    if (matches.length === 0) {
      resultsEl.appendChild(el('div', { class: 'placeholder', style: 'padding:40px 20px' },
        el('p', {}, `Aucun résultat pour « ${query} ».`)
      ));
      return;
    }

    // Group by type
    const chapters = matches.filter(m => m.type === 'chapter');
    const glossary = matches.filter(m => m.type === 'glossary');

    if (chapters.length > 0) {
      resultsEl.appendChild(el('div', { class: 'section-title' }, `📖 Chapitres (${chapters.length})`));
      for (const match of chapters) {
        resultsEl.appendChild(el('div', { class: 'search-result-card', onClick: () => navigate(match.route) },
          el('div', { class: 'search-result-q' }, match.label),
          el('div', { class: 'search-result-meta' }, match.sublabel)
        ));
      }
    }

    if (glossary.length > 0) {
      resultsEl.appendChild(el('div', { class: 'section-title', style: chapters.length > 0 ? 'margin-top:16px' : '' }, `📖 Glossaire (${glossary.length})`));
      for (const match of glossary.slice(0, 30)) {
        resultsEl.appendChild(el('div', { class: 'search-result-card', onClick: () => navigate(match.route) },
          el('div', { class: 'search-result-q' }, match.label),
          el('div', { class: 'search-result-meta' }, match.sublabel)
        ));
      }
    }
  }

  // Debounced search
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(doSearch, 200);
  });

  onCleanup(() => clearTimeout(timer));

  if (q) doSearch();
  input.focus();
}
