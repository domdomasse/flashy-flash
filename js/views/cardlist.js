import { getChapterData } from '../data.js';
import { getCardProgress, toggleBanned } from '../store.js';
import { el } from '../render.js';

export async function renderCardListTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'cards');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, '🃏'),
      el('p', {}, 'Flashcards non disponibles.')
    ));
    return;
  }

  const cards = data.cards;
  const categories = data.categories;

  const catMap = {};
  for (const cat of categories) catMap[cat.id] = cat.label;

  const listEl = el('div', { class: 'cardlist' });

  for (const card of cards) {
    const cardId = `${subjectId}/${chapterId}/${card.id}`;
    const progress = getCardProgress(cardId);
    const isBanned = progress && progress.banned;

    const questionEl = el('div', { class: 'cardlist-q' }, card.q);
    const answerEl = el('div', { class: 'cardlist-a hidden' });
    answerEl.innerHTML = card.a;

    const catLabel = catMap[card.cat] || card.cat;
    const catEl = el('span', { class: 'cardlist-cat' }, catLabel);

    const banBtn = el('button', {
      class: 'cardlist-ban' + (isBanned ? ' active' : ''),
      'aria-label': isBanned ? 'Débannir' : 'Bannir',
      onClick: (e) => {
        e.stopPropagation();
        const nowBanned = toggleBanned(cardId);
        banBtn.classList.toggle('active', nowBanned);
        banBtn.textContent = nowBanned ? '🚫' : '✓';
        banBtn.setAttribute('aria-label', nowBanned ? 'Débannir' : 'Bannir');
        cardRow.classList.toggle('banned', nowBanned);
      }
    }, isBanned ? '🚫' : '✓');

    const cardRow = el('div', {
      class: 'cardlist-card' + (isBanned ? ' banned' : ''),
      onClick: () => {
        answerEl.classList.toggle('hidden');
      }
    },
      el('div', { class: 'cardlist-header' },
        el('div', { class: 'cardlist-left' }, catEl, questionEl),
        banBtn
      ),
      answerEl
    );

    listEl.appendChild(cardRow);
  }

  const info = el('p', { class: 'cardlist-info' },
    `${cards.length} cartes · Appuie sur une carte pour voir la réponse · ✓ = active, 🚫 = bannie`
  );

  container.append(info, listEl);
}
