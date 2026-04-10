import { getCatalog, getChapterData } from '../data.js';
import { el, onCleanup } from '../render.js';
import { navigate } from '../router.js';
import { icon, refreshIcons } from '../icons.js';

export async function renderSearch(container, { q }) {
  const catalog = await getCatalog();

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    el('h1', { class: 'app-title' }, icon('bolt', 24), 'Flashmob'),
    el('button', { class: 'btn-icon', onClick: () => navigate('settings'), 'aria-label': 'Réglages' }, icon('settings', 22))
  );

  // Search bar (same style as glossary)
  const input = el('input', {
    class: 'glossary-search-input',
    type: 'text',
    placeholder: 'Rechercher un chapitre, un terme...',
  });
  input.value = q || '';

  const clearBtn = el('button', { class: 'glossary-search-clear' + (q ? '' : ' hidden'), onClick: () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    doSearch();
    input.focus();
  }}, icon('x', 14));

  const searchBar = el('div', { class: 'glossary-search' },
    el('span', { class: 'glossary-search-icon' }, icon('search', 16)),
    input,
    clearBtn
  );

  const resultsEl = el('div', { class: 'search-results' });

  const view = el('div', { class: 'view' });
  view.append(topbar, searchBar, resultsEl);
  container.appendChild(view);

  // Build searchable index: chapters + glossary terms
  const searchItems = [];

  for (const subject of catalog.subjects) {
    for (const chapter of subject.chapters) {
      searchItems.push({
        type: 'chapter',
        label: chapter.name,
        sublabel: `${subject.name}`,
        searchText: (chapter.name + ' ' + subject.name).toLowerCase(),
        route: `${subject.id}/${chapter.id}/cours`
      });

      const glossary = await getChapterData(subject.id, chapter.id, 'glossary');
      if (glossary?.terms) {
        for (const entry of glossary.terms) {
          searchItems.push({
            type: 'glossary',
            label: entry.term,
            sublabel: entry.def,
            searchText: (entry.term + ' ' + entry.def).toLowerCase(),
            route: `${subject.id}/${chapter.id}/glossary`
          });
        }
      }
    }
  }

  function doSearch() {
    const query = input.value.trim().toLowerCase();
    resultsEl.innerHTML = '';

    clearBtn.classList.toggle('hidden', !query);

    if (query.length < 2) {
      resultsEl.appendChild(el('div', { class: 'placeholder', style: 'padding:40px 20px' },
        el('p', {}, query.length === 0 ? 'Tape un terme pour chercher dans les chapitres et le glossaire.' : 'Continue à taper...')
      ));
      return;
    }

    const queryNorm = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const terms = queryNorm.split(/\s+/);
    const matches = searchItems.filter(r => {
      const norm = r.searchText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return terms.every(t => norm.includes(t));
    });

    if (matches.length === 0) {
      resultsEl.appendChild(el('div', { class: 'placeholder', style: 'padding:40px 20px' },
        el('p', {}, `Aucun résultat pour « ${query} ».`)
      ));
      return;
    }

    function highlight(text) {
      const textNorm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      let result = text;
      // Highlight first match found
      for (const t of terms) {
        const idx = textNorm.indexOf(t);
        if (idx !== -1) {
          result = text.slice(0, idx) + '<mark>' + text.slice(idx, idx + t.length) + '</mark>' + text.slice(idx + t.length);
          break;
        }
      }
      return result;
    }

    const chapters = matches.filter(m => m.type === 'chapter');
    const glossary = matches.filter(m => m.type === 'glossary');

    if (chapters.length > 0) {
      resultsEl.appendChild(el('div', { class: 'search-section-badge chapter' },
        icon('book-open', 14), `Chapitres (${chapters.length})`
      ));
      for (const match of chapters) {
        resultsEl.appendChild(el('div', { class: 'search-result-card', onClick: () => navigate(match.route) },
          el('div', { class: 'search-result-body' },
            el('div', { class: 'search-result-q', html: highlight(match.label) }),
            el('div', { class: 'search-result-meta' }, match.sublabel)
          )
        ));
      }
    }

    if (glossary.length > 0) {
      resultsEl.appendChild(el('div', { class: 'search-section-badge glossary', style: chapters.length > 0 ? 'margin-top:16px' : '' },
        icon('bookmark', 14), `Glossaire (${glossary.length})`
      ));
      for (const match of glossary.slice(0, 30)) {
        resultsEl.appendChild(el('div', { class: 'search-result-card glossary-result', onClick: () => navigate(match.route) },
          el('div', { class: 'search-result-body' },
            el('div', { class: 'search-result-q', html: highlight(match.label) }),
            el('div', { class: 'search-result-meta' }, match.sublabel)
          )
        ));
      }
    }

    refreshIcons();
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
