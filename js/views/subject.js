import { getSubject } from '../data.js';
import { el } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

export async function renderSubject(container, { subject: subjectId }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    el('h1', {}, `${subject.icon} ${subject.name}`)
  );

  // Glossary link
  const glossaryLink = el('div', { class: 'chapter-card', style: 'margin-bottom: 20px', onClick: () => navigate(`${subjectId}/glossary`) },
    el('span', { class: 'icon' }, icon('book', 20)),
    el('div', { class: 'info' },
      el('div', { class: 'name' }, 'Glossaire'),
      el('div', { class: 'meta' }, 'Toutes les définitions clés de la matière')
    )
  );

  // Chapters
  const chaptersSection = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Chapitres')
  );

  for (const chapter of subject.chapters) {
    const reviseBtn = el('button', {
      class: 'chapter-revise-btn',
      onClick: (e) => { e.stopPropagation(); navigate(`${subjectId}/${chapter.id}/flashcards`); },
      'aria-label': 'Réviser'
    }, icon('play', 16), ' Réviser');

    const card = el('div', { class: 'chapter-card', onClick: () => navigate(`${subjectId}/${chapter.id}`) },
      el('span', { class: 'icon' }, chapter.icon || '📄'),
      el('div', { class: 'info' },
        el('div', { class: 'name' }, chapter.name),
        el('div', { class: 'meta' }, `${chapter.cardCount} cartes`)
      ),
      reviseBtn
    );
    chaptersSection.appendChild(card);
  }

  const view = el('div', { class: 'view' });
  view.append(topbar, glossaryLink, chaptersSection);
  container.appendChild(view);
}
