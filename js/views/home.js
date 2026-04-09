import { getCatalog } from '../data.js';
import { getChapterProgress, getWeakCardsCount } from '../store.js';
import { el } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

export async function renderHome(container) {
  const catalog = await getCatalog();

  const topbar = el('div', { class: 'topbar' },
    el('h1', {}, '⚡ Flashy Flash'),
    el('button', { class: 'btn-icon', onClick: () => navigate('settings'), 'aria-label': 'Réglages' }, icon('settings', 22))
  );

  // Search bar
  const searchBar = el('div', { class: 'search-bar', onClick: () => navigate('search') },
    el('span', { class: 'search-bar-icon' }, icon('search', 18)),
    el('span', { class: 'search-bar-placeholder' }, 'Rechercher un chapitre, un terme...')
  );

  // Dashboard
  let totalMastered = 0, totalCards = 0, totalWeak = 0;
  const subjectStats = [];

  for (const subject of catalog.subjects) {
    let subMastered = 0, subTotal = 0, subWeak = 0;
    for (const chapter of subject.chapters) {
      const progress = getChapterProgress(subject.id, chapter.id, chapter.cardCount);
      subMastered += progress.mastered;
      subTotal += progress.total;
      subWeak += getWeakCardsCount(subject.id, chapter.id);
    }
    totalMastered += subMastered;
    totalCards += subTotal;
    totalWeak += subWeak;
    subjectStats.push({ subject, mastered: subMastered, total: subTotal, weak: subWeak });
  }

  const dashboard = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Progression')
  );

  if (totalCards > 0) {
    const statsRow = el('div', { class: 'dashboard-stats-row' });
    statsRow.appendChild(el('div', {
      class: 'dashboard-stat clickable',
      onClick: () => navigate('allcards?filter=mastered')
    },
      el('div', { class: 'dashboard-stat-value' }, String(totalMastered)),
      el('div', { class: 'dashboard-stat-label' }, 'Maîtrisées')
    ));
    statsRow.appendChild(el('div', {
      class: 'dashboard-stat clickable',
      onClick: () => navigate('allcards?filter=weak')
    },
      el('div', { class: 'dashboard-stat-value' }, String(totalWeak)),
      el('div', { class: 'dashboard-stat-label' }, 'À revoir')
    ));
    statsRow.appendChild(el('div', {
      class: 'dashboard-stat clickable',
      onClick: () => navigate('allcards?filter=all')
    },
      el('div', { class: 'dashboard-stat-value' }, String(totalCards)),
      el('div', { class: 'dashboard-stat-label' }, 'Total')
    ));
    dashboard.appendChild(statsRow);
  } else {
    dashboard.appendChild(el('div', { class: 'placeholder', style: 'padding:24px' },
      el('p', {}, 'Pas encore commencé')
    ));
  }

  // Subjects grid
  const grid = el('div', { class: 'subject-grid' });
  for (const { subject, mastered, total } of subjectStats) {
    const count = subject.chapters.length;
    const meta = `${count} chapitre${count > 1 ? 's' : ''}`;

    grid.appendChild(
      el('div', { class: 'subject-card', onClick: () => navigate(subject.id) },
        el('span', { class: 'icon' }, subject.icon),
        el('span', { class: 'name' }, subject.name),
        el('span', { class: 'meta' }, meta)
      )
    );
  }

  const subjects = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Matières'),
    grid
  );

  const view = el('div', { class: 'view' });
  view.append(topbar, searchBar, dashboard, subjects);
  container.appendChild(view);
}
