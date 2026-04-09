import { getSubject } from '../data.js';
import { el } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

const DEF_PATTERNS = [
  /^d[ée]finir\s/i,
  /^que?\s+(signifie|sont?|est-ce qu[e'])/i,
  /^qu['']est-ce qu[e']/i,
];

export async function renderGlossary(container, { subject: subjectId }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(subjectId), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    el('h1', {}, `Glossaire — ${subject.name}`)
  );

  const view = el('div', { class: 'view' });
  view.appendChild(topbar);

  // Load all cards from all chapters
  const entries = [];
  for (const chapter of subject.chapters) {
    try {
      const res = await fetch(`data/${subjectId}/${chapter.id}/cards.json`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const card of data.cards) {
        // Include cards that look like definitions
        const isDef = DEF_PATTERNS.some(p => p.test(card.q));
        if (isDef) {
          // Extract term from question
          let term = card.q
            .replace(/^(D[ée]finir|Que signifie|Qu['']est-ce que?|Qu['']est-ce qu[''])\s*/i, '')
            .replace(/[?.!]+$/, '')
            .replace(/^(un[e]?|l[ea]s?|l['']|d['']|des)\s*/i, '')
            .trim();
          term = term.charAt(0).toUpperCase() + term.slice(1);

          entries.push({
            term,
            question: card.q,
            answer: card.a,
            chapter: chapter.name,
            chapterId: chapter.id
          });
        }
      }
    } catch { /* skip */ }
  }

  // Sort alphabetically
  entries.sort((a, b) => a.term.localeCompare(b.term, 'fr'));

  if (entries.length === 0) {
    view.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, '📖'),
      el('p', {}, 'Aucune définition trouvée.')
    ));
  } else {
    view.appendChild(el('div', { class: 'section-title' }, `${entries.length} définitions`));

    for (const entry of entries) {
      const card = el('div', { class: 'glossary-card' },
        el('div', { class: 'glossary-term' }, entry.term),
        el('div', { class: 'glossary-def', html: entry.answer }),
        el('div', { class: 'glossary-source', onClick: () => navigate(`${subjectId}/${entry.chapterId}/flashcards`) },
          `📄 ${entry.chapter}`
        )
      );
      view.appendChild(card);
    }
  }

  container.appendChild(view);
}
