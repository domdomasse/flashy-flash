import { getCatalog, getAllCards } from '../data.js';
import { getCardProgress } from '../store.js';
import { el, onCleanup } from '../render.js';
import { buildBackToTop } from '../services/toc.js';
import { navigate } from '../router.js';
import { icon, refreshIcons } from '../icons.js';

const SORT_OPTIONS = [
  { id: 'alpha', label: 'A → Z' },
  { id: 'alpha-desc', label: 'Z → A' },
  { id: 'score-asc', label: 'Score ↑' },
  { id: 'score-desc', label: 'Score ↓' },
  { id: 'category', label: 'Catégorie' },
];

export async function renderAllCards(container, { filter, subject: subjectFilter }) {
  const catalog = await getCatalog();

  const subjects = subjectFilter
    ? catalog.subjects.filter(s => s.id === subjectFilter)
    : catalog.subjects;

  const backRoute = subjectFilter || '';
  const subjectName = subjectFilter ? subjects[0]?.name : '';
  const titlePrefix = subjectName ? `${subjectName} — ` : '';
  const title = filter === 'mastered' ? `${titlePrefix}Maîtrisées` : filter === 'weak' ? `${titlePrefix}À revoir` : `${titlePrefix}Toutes les cartes`;

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(backRoute), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    el('h1', {}, title)
  );

  // Load cards via centralized cache
  const rawItems = await getAllCards(subjects);
  const allItems = rawItems.map(item => ({
    ...item,
    progress: getCardProgress(item.cardId)
  }));

  // Apply filter
  let items;
  if (filter === 'mastered') {
    items = allItems.filter(i => i.progress && i.progress.score >= 2);
  } else if (filter === 'weak') {
    items = allItems.filter(i => i.progress && i.progress.score <= 0);
  } else {
    items = [...allItems];
  }

  // Sort controls
  let currentSort = 'alpha';
  const sortBar = el('div', { class: 'fc-filters' });
  const sortBtns = [];

  for (const opt of SORT_OPTIONS) {
    const btn = el('button', {
      class: 'fc-filter-btn' + (opt.id === 'alpha' ? ' active' : ''),
      onClick: () => {
        currentSort = opt.id;
        sortBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList();
      }
    }, opt.label);
    sortBar.appendChild(btn);
    sortBtns.push(btn);
  }

  const sortScrollHint = el('div', { class: 'fc-filters-scroll-hint' }, icon('chevron-right', 14));
  const sortWrap = el('div', { class: 'fc-filters-wrap' }, sortBar, sortScrollHint);

  function checkSortOverflow() {
    if (!sortBar.clientWidth) return;
    const hasOverflow = sortBar.scrollWidth > sortBar.clientWidth + 4;
    const atEnd = sortBar.scrollLeft + sortBar.clientWidth >= sortBar.scrollWidth - 4;
    sortScrollHint.classList.toggle('hidden', !hasOverflow || atEnd);
  }
  sortBar.addEventListener('scroll', checkSortOverflow, { passive: true });
  window.addEventListener('resize', checkSortOverflow, { passive: true });
  setTimeout(checkSortOverflow, 100);
  onCleanup(() => window.removeEventListener('resize', checkSortOverflow));

  const countEl = el('p', { class: 'cardlist-info' }, `${items.length} cartes`);
  const listEl = el('div', { class: 'allcards-list' });

  const view = el('div', { class: 'view' });
  view.append(topbar, sortWrap, countEl, listEl);
  container.appendChild(view);

  function sortItems() {
    switch (currentSort) {
      case 'alpha': items.sort((a, b) => a.card.q.localeCompare(b.card.q, 'fr')); break;
      case 'alpha-desc': items.sort((a, b) => b.card.q.localeCompare(a.card.q, 'fr')); break;
      case 'score-asc': items.sort((a, b) => (a.progress?.score || 0) - (b.progress?.score || 0)); break;
      case 'score-desc': items.sort((a, b) => (b.progress?.score || 0) - (a.progress?.score || 0)); break;
      case 'category': items.sort((a, b) => a.catLabel.localeCompare(b.catLabel, 'fr')); break;
    }
  }

  function renderList() {
    sortItems();
    listEl.innerHTML = '';
    for (const item of items) {
      const score = item.progress ? item.progress.score : 0;
      const scoreClass = score >= 2 ? 'good' : score <= 0 ? 'bad' : '';

      const answerDiv = el('div', { class: 'cardlist-a hidden' });
      answerDiv.innerHTML = item.card.a;

      const cardRow = el('div', {
        class: 'cardlist-card',
        onClick: () => answerDiv.classList.toggle('hidden')
      },
        el('div', { class: 'cardlist-body' },
          el('div', { class: 'cardlist-header' },
            el('div', { class: 'cardlist-left' },
              el('div', { class: 'cardlist-cat-row' },
                el('span', { class: 'cardlist-cat' }, item.catLabel),
                el('span', { class: 'cardlist-score-inline ' + scoreClass }, String(score))
              ),
              el('div', { class: 'cardlist-q' }, item.card.q))
          ),
          answerDiv
        )
      );
      listEl.appendChild(cardRow);
    }
  }

  renderList();
  container.appendChild(buildBackToTop());
  refreshIcons();
}
