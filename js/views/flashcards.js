import { getChapterData } from '../data.js';
import { saveCardAnswer, getCardProgress, toggleFavorite, toggleBanned, resetChapter, updateChapterVisit, getPrefs, isCardBanned } from '../store.js';
import { el, onCleanup } from '../render.js';
import { icon, refreshIcons } from '../icons.js';
import { getNextReview, sortBySpacedRepetition } from '../services/spaced.js';

export async function renderFlashcardsTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'cards');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, icon('layers', 32)),
      el('p', {}, 'Flashcards non disponibles.')
    ));
    return;
  }
  await renderFlashcardsEngine(container, data.cards, data.categories, subjectId, chapterId);
}

export async function renderFlashcardsEngine(container, allCardsRaw, categories, subjectId, chapterId) {
  const prefs = getPrefs();

  // All cards (including banned) for the card list; active cards for the deck
  const allCards = allCardsRaw;
  const getActiveCards = () => allCards.filter(c => !isCardBanned(`${subjectId}/${chapterId}/${c.id}`));

  let deck = [], currentIdx = 0, isFlipped = false;
  let goodList = [], badList = [];
  let activeFilter = 'all';
  let listMode = false;

  updateChapterVisit(subjectId, chapterId);

  const storeId = (card) => `${card._prefix || (subjectId + '/' + chapterId)}/${card.id}`;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const catMap = {};
  for (const cat of categories) catMap[cat.id] = cat.label;

  // ── DOM ──
  const progressText = el('span', {}, '');
  const countGood = el('span', {}, '0');
  const countBad = el('span', {}, '0');
  const progressFill = el('div', { class: 'fc-progress-fill' });

  // List mode toggle button (placed in stats bar)
  const listToggleBtn = el('button', {
    class: 'fc-list-toggle',
    onClick: toggleListMode
  }, icon('list', 16));

  const stats = el('div', { class: 'fc-stats' },
    progressText,
    el('div', { class: 'fc-badges' },
      el('span', { class: 'fc-badge good' }, icon('check', 14), ' ', countGood),
      el('span', { class: 'fc-badge bad' }, icon('x', 14), ' ', countBad),
      listToggleBtn
    )
  );
  const progressBar = el('div', { class: 'fc-progress-wrap' }, progressFill);

  // ── Filters — line 1: categories ──
  const filtersLine1 = el('div', { class: 'fc-filters' });
  const filtersLine2 = el('div', { class: 'fc-filters fc-filters-special' });
  const filterBtns = [];

  function addFilter(id, label, line, extraClass) {
    const btn = el('button', {
      class: 'fc-filter-btn' + (id === 'all' ? ' active' : '') + (extraClass ? ' ' + extraClass : ''),
      onClick: () => { if (listMode) toggleListMode(); setFilter(id, btn); }
    }, label);
    line.appendChild(btn);
    filterBtns.push(btn);
    return btn;
  }

  addFilter('all', 'Toutes', filtersLine1);
  for (const cat of categories) addFilter(cat.id, cat.label, filtersLine1);

  // Line 2: special filters
  addFilter('favorites', 'Favoris', filtersLine2, 'fc-filter-special');
  addFilter('weak', 'Points faibles', filtersLine2, 'fc-filter-special');

  const filtersWrap = el('div', { class: 'fc-filters-wrap' }, filtersLine1, filtersLine2);

  // ── Card list container ──
  const cardListEl = el('div', { class: 'fc-cardlist hidden' });

  // ── Card ──
  const categoryTag = el('span', { class: 'fc-category-tag' });
  const questionText = el('p', { class: 'fc-question' });
  const answerText = el('p', { class: 'fc-answer' });

  const favBtn = el('button', { class: 'fc-fav-btn', onClick: (e) => {
    e.stopPropagation();
    if (currentIdx >= deck.length) return;
    const isFav = toggleFavorite(storeId(deck[currentIdx]));
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.classList.toggle('active', isFav);
  }}, '☆');

  const cardEl = el('div', { class: 'fc-card' },
    el('div', { class: 'fc-card-inner' },
      el('div', { class: 'fc-card-front' },
        categoryTag,
        questionText,
        el('span', { class: 'fc-hint' }, 'Appuyer pour révéler')
      ),
      el('div', { class: 'fc-card-back' }, answerText)
    )
  );
  // favBtn outside the 3D card but inside the positioned wrapper
  const cardContainer = el('div', { class: 'fc-card-container' }, favBtn, cardEl);

  const swipeHint = el('p', { class: 'fc-swipe-hint' },
    '◀ swipe pour naviguer \u00a0·\u00a0 tap pour retourner ▶'
  );

  // ── Actions ──
  const actionsEl = el('div', { class: 'fc-actions hidden' });
  const btnBad = el('button', { class: 'fc-action-btn bad', onClick: () => answerCard(false) }, icon('x', 18), ' À revoir');
  const btnGood = el('button', { class: 'fc-action-btn good', onClick: () => answerCard(true) }, icon('check', 18), ' Je savais');
  actionsEl.append(btnBad, btnGood);

  const btnPrev = el('button', { disabled: true, onClick: goPrev }, icon('chevron-left', 16), ' Précédente');
  const btnNext = el('button', { onClick: goNext }, 'Suivante ', icon('chevron-right', 16));
  const navEl = el('div', { class: 'fc-nav' }, btnPrev, btnNext);

  // ── End screen ──
  const endStats = el('p', { class: 'fc-end-stats' });
  const btnRestart = el('button', { class: 'fc-btn-restart', onClick: () => initDeck(getFiltered()) }, icon('refresh-cw', 16), ' Recommencer');
  const btnRetry = el('button', { class: 'fc-btn-retry', onClick: () => { if (badList.length > 0) initDeck([...badList]); } }, icon('repeat', 16), ' Revoir les ratées');
  const btnReset = el('button', { class: 'fc-btn-reset', onClick: handleReset }, icon('trash-2', 16), ' Effacer progression');
  const endEl = el('div', { class: 'fc-end hidden' },
    el('h2', {}, 'Session terminée !'),
    endStats,
    el('div', { class: 'fc-end-actions' }, btnRestart, btnRetry, btnReset)
  );

  // ── Deck elements (grouped for show/hide) ──
  const deckArea = el('div', { class: 'fc-deck-area' }, cardContainer, swipeHint, actionsEl, navEl, endEl);

  // ── Assemble ──
  container.append(stats, progressBar, filtersWrap, deckArea, cardListEl);

  // ── Card list rendering ──
  function toggleListMode() {
    listMode = !listMode;
    listToggleBtn.classList.toggle('active', listMode);
    deckArea.classList.toggle('hidden', listMode);
    cardListEl.classList.toggle('hidden', !listMode);
    if (listMode) renderCardList();
  }

  function renderCardList() {
    cardListEl.innerHTML = '';
    const filtered = getFilteredAll(); // includes banned cards

    const info = el('p', { class: 'cardlist-info' },
      `${filtered.length} cartes · Appuie sur une carte pour voir la réponse · ✓ = active, 🚫 = bannie`
    );
    cardListEl.appendChild(info);

    for (const card of filtered) {
      const cardId = storeId(card);
      const progress = getCardProgress(cardId);
      const isBanned = progress && progress.banned;

      const questionDiv = el('div', { class: 'cardlist-q' }, card.q);
      const answerDiv = el('div', { class: 'cardlist-a hidden' });
      answerDiv.innerHTML = card.a;

      const catLabel = catMap[card.cat] || card.cat;
      const catEl = el('span', { class: 'cardlist-cat' }, catLabel);

      const banBtn = el('button', {
        class: 'cardlist-ban' + (isBanned ? ' active' : ''),
        onClick: (e) => {
          e.stopPropagation();
          const nowBanned = toggleBanned(cardId);
          banBtn.classList.toggle('active', nowBanned);
          banBtn.textContent = nowBanned ? '🚫' : '✓';
          cardRow.classList.toggle('banned', nowBanned);
        }
      }, isBanned ? '🚫' : '✓');

      const cardRow = el('div', {
        class: 'cardlist-card' + (isBanned ? ' banned' : ''),
        onClick: () => answerDiv.classList.toggle('hidden')
      },
        el('div', { class: 'cardlist-header' },
          el('div', { class: 'cardlist-left' }, catEl, questionDiv),
          banBtn
        ),
        answerDiv
      );
      cardListEl.appendChild(cardRow);
    }
    refreshIcons();
  }

  // ── Logic ──
  function getFiltered() {
    const active = getActiveCards();
    if (activeFilter === 'favorites') {
      return active.filter(c => { const p = getCardProgress(storeId(c)); return p && p.fav; });
    }
    if (activeFilter === 'weak') {
      return active.filter(c => { const p = getCardProgress(storeId(c)); return !p || p.score <= 0; });
    }
    if (activeFilter !== 'all') {
      return active.filter(c => c.cat === activeFilter);
    }
    return active;
  }

  // For card list: show ALL cards (including banned) matching the filter
  function getFilteredAll() {
    if (activeFilter === 'favorites') {
      return allCards.filter(c => { const p = getCardProgress(storeId(c)); return p && p.fav; });
    }
    if (activeFilter === 'weak') {
      return allCards.filter(c => { const p = getCardProgress(storeId(c)); return !p || p.score <= 0; });
    }
    if (activeFilter !== 'all') {
      return allCards.filter(c => c.cat === activeFilter);
    }
    return allCards;
  }

  function setFilter(id, btn) {
    activeFilter = id;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (listMode) {
      renderCardList();
    } else {
      const filtered = getFiltered();
      if (filtered.length === 0) {
        initEmpty(id === 'favorites' ? 'Aucun favori pour l\'instant. Appuie sur ☆ pour en ajouter.' : 'Aucune carte dans cette catégorie.');
      } else {
        initDeck(filtered);
      }
    }
  }

  function initEmpty(msg) {
    deck = []; currentIdx = 0;
    cardContainer.style.display = 'none';
    swipeHint.style.display = 'none';
    actionsEl.style.display = 'none';
    navEl.style.display = 'none';
    endEl.classList.add('hidden');
    let emptyEl = deckArea.querySelector('.fc-empty');
    if (!emptyEl) {
      emptyEl = el('div', { class: 'fc-empty placeholder' },
        el('div', { class: 'icon' }, icon('inbox', 32)),
        el('p', {})
      );
      deckArea.appendChild(emptyEl);
    }
    emptyEl.querySelector('p').textContent = msg;
    emptyEl.style.display = '';
    refreshIcons();
  }

  function initDeck(cards) {
    const emptyEl = deckArea.querySelector('.fc-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    if (prefs.spacedRepetition) {
      deck = sortBySpacedRepetition([...cards], c => getCardProgress(storeId(c)));
    } else {
      deck = shuffle([...cards]);
    }
    currentIdx = 0; goodList = []; badList = [];
    countGood.textContent = '0'; countBad.textContent = '0';

    cardContainer.style.display = '';
    swipeHint.style.display = '';
    actionsEl.style.display = '';
    actionsEl.classList.add('hidden');
    navEl.style.display = '';
    endEl.classList.add('hidden');
    renderCard();
  }

  function renderCard() {
    if (currentIdx >= deck.length) { showEnd(); return; }
    const card = deck[currentIdx];
    questionText.textContent = card.q;
    answerText.innerHTML = card.a;
    const catLabel = categories.find(c => c.id === card.cat);
    categoryTag.textContent = catLabel ? catLabel.label : card.cat;

    isFlipped = false;
    cardEl.classList.remove('flipped');
    actionsEl.classList.add('hidden');

    const progress = getCardProgress(storeId(card));
    const isFav = progress && progress.fav;
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.classList.toggle('active', !!isFav);

    progressText.textContent = `Carte ${currentIdx + 1} / ${deck.length}`;
    progressFill.style.width = (currentIdx / deck.length * 100) + '%';
    btnPrev.disabled = currentIdx === 0;
    btnNext.disabled = false;
    countGood.textContent = goodList.length;
    countBad.textContent = badList.length;
  }

  function flipCard() {
    isFlipped = !isFlipped;
    cardEl.classList.toggle('flipped', isFlipped);
    actionsEl.classList.toggle('hidden', !isFlipped);
  }

  function goNext() {
    if (currentIdx < deck.length - 1) { currentIdx++; renderCard(); }
    else if (currentIdx === deck.length - 1) { currentIdx++; showEnd(); }
  }
  function goPrev() { if (currentIdx > 0) { currentIdx--; renderCard(); } }

  function answerCard(correct) {
    const card = deck[currentIdx];
    const id = storeId(card);
    if (correct) goodList.push(card); else badList.push(card);

    if (prefs.spacedRepetition) {
      const progress = getCardProgress(id);
      const spacedData = getNextReview(progress, correct);
      saveCardAnswer(id, correct, spacedData);
    } else {
      saveCardAnswer(id, correct);
    }
    currentIdx++;
    renderCard();
  }

  function showEnd() {
    cardContainer.style.display = 'none';
    swipeHint.style.display = 'none';
    actionsEl.style.display = 'none';
    navEl.style.display = 'none';
    endEl.classList.remove('hidden');
    const total = goodList.length + badList.length;
    const pct = total ? Math.round(goodList.length / total * 100) : 0;
    endStats.innerHTML =
      `<strong>${goodList.length}</strong> réponse${goodList.length > 1 ? 's' : ''} correcte${goodList.length > 1 ? 's' : ''} sur <strong>${total}</strong> (${pct} %)<br>` +
      `<strong>${badList.length}</strong> carte${badList.length > 1 ? 's' : ''} à revoir`;
    btnRetry.style.display = badList.length === 0 ? 'none' : '';
    progressFill.style.width = '100%';
    refreshIcons();
  }

  function handleReset() {
    if (confirm('Effacer toute ta progression pour ce chapitre ?')) {
      resetChapter(subjectId, chapterId);
      initDeck(getFiltered());
    }
  }

  // ── Touch ──
  let tX = 0, tY = 0, touchUsed = false;
  cardEl.addEventListener('touchstart', e => {
    tX = e.changedTouches[0].clientX;
    tY = e.changedTouches[0].clientY;
    touchUsed = false;
  }, { passive: true });

  cardEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tX;
    const dy = e.changedTouches[0].clientY - tY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touchUsed = true;
    if (ax < 20 && ay < 20) flipCard();
    else if (ax > 40 && ax > ay) { dx < 0 ? goNext() : goPrev(); }
    e.preventDefault();
  }, { passive: false });

  cardEl.addEventListener('click', () => {
    if (touchUsed) { touchUsed = false; return; }
    flipCard();
  });

  // ── Keyboard ──
  const abortCtrl = new AbortController();
  onCleanup(() => abortCtrl.abort());

  document.addEventListener('keydown', e => {
    if (listMode) return;
    if (!endEl.classList.contains('hidden')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if ((e.key === 'g' || e.key === 'G') && isFlipped) answerCard(true);
    if ((e.key === 'b' || e.key === 'B') && isFlipped) answerCard(false);
    if (e.key === 'f' || e.key === 'F') favBtn.click();
  }, { signal: abortCtrl.signal });

  // ── Start ──
  initDeck(getActiveCards());
  refreshIcons();
}
