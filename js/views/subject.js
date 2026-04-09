import { getSubject } from '../data.js';
import { getChapterProgress, getChapterStats } from '../store.js';
import { el } from '../render.js';
import { navigate } from '../router.js';

export async function renderSubject(container, { subject: subjectId }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, '←'),
    el('h1', {}, `${subject.icon} ${subject.name}`)
  );

  // Glossary link
  const glossaryLink = el('div', { class: 'chapter-card', style: 'margin-bottom: 20px', onClick: () => navigate(`${subjectId}/glossary`) },
    el('span', { class: 'icon' }, '📖'),
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
    const progress = getChapterProgress(subjectId, chapter.id, chapter.cardCount);
    const stats = getChapterStats(subjectId, chapter.id);

    let metaParts = [`${chapter.cardCount} cartes`];
    if (progress.percent > 0) metaParts.push(`${progress.percent}% maîtrisé`);
    if (stats?.lastVisit) {
      const days = Math.floor((Date.now() - stats.lastVisit) / 86400000);
      metaParts.push(days === 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days}j`);
    }
    if (chapter.estimatedTime) metaParts.push(`~${chapter.estimatedTime.flashcards} min`);

    const card = el('div', { class: 'chapter-card', onClick: () => navigate(`${subjectId}/${chapter.id}`) },
      el('span', { class: 'icon' }, chapter.icon || '📄'),
      el('div', { class: 'info' },
        el('div', { class: 'name' }, chapter.name),
        el('div', { class: 'meta' }, metaParts.join(' · ')),
        progress.percent > 0
          ? el('div', { class: 'progress-bar' }, el('div', { class: 'fill', style: `width: ${progress.percent}%` }))
          : false
      )
    );
    chaptersSection.appendChild(card);
  }

  const view = el('div', { class: 'view' });
  view.append(topbar, glossaryLink, chaptersSection);
  container.appendChild(view);
}
