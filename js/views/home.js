import { getCatalog } from '../data.js';
import { el } from '../render.js';
import { buildBackToTop } from '../services/toc.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

export async function renderHome(container) {
  const catalog = await getCatalog();

  const topbar = el('div', { class: 'topbar' },
    el('h1', { class: 'app-title' }, icon('bolt', 24), 'Flashmob'),
    el('button', { class: 'btn-icon', onClick: () => navigate('settings'), 'aria-label': 'Réglages' }, icon('settings', 22))
  );

  // Search bar (same style as glossary/search page)
  const fakeInput = el('input', {
    class: 'glossary-search-input',
    type: 'text',
    placeholder: 'Rechercher un chapitre, un terme...',
    readOnly: true
  });
  const searchBar = el('div', { class: 'glossary-search', onClick: () => navigate('search') },
    el('span', { class: 'glossary-search-icon' }, icon('search', 16)),
    fakeInput
  );

  // Subjects grid
  const grid = el('div', { class: 'subject-grid' });
  for (const subject of catalog.subjects) {
    const count = subject.chapters.length;
    const meta = `${count} chapitre${count > 1 ? 's' : ''}`;

    grid.appendChild(
      el('div', { class: 'subject-card', onClick: () => navigate(subject.id) },
        el('span', { class: 'icon' }, icon(subject.icon, 28)),
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
  buildBackToTop();
}
