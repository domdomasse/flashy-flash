import { getCatalog } from '../data.js';
import { el } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

export async function renderHome(container) {
  const catalog = await getCatalog();

  const topbar = el('div', { class: 'topbar' },
    el('h1', {}, '⚡ Flashmob'),
    el('button', { class: 'btn-icon', onClick: () => navigate('settings'), 'aria-label': 'Réglages' }, icon('settings', 22))
  );

  // Search bar
  const searchBar = el('div', { class: 'search-bar', onClick: () => navigate('search') },
    el('span', { class: 'search-bar-icon' }, icon('search', 18)),
    el('span', { class: 'search-bar-placeholder' }, 'Rechercher un chapitre, un terme...')
  );

  // Subjects grid
  const grid = el('div', { class: 'subject-grid' });
  for (const subject of catalog.subjects) {
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
  view.append(topbar, searchBar, subjects);
  container.appendChild(view);
}
