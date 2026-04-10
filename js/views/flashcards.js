import { getChapterData } from '../data.js';
import { saveCardAnswer, getCardProgress, toggleFavorite, toggleBanned, resetChapter, updateChapterVisit, getPrefs, isCardBanned } from '../store.js';
import { el, onCleanup } from '../render.js';
import { icon, refreshIcons } from '../icons.js';
import { getNextReview, sortBySpacedRepetition } from '../services/spaced.js';

export async function renderFlashcardsTab(container, subjectId, chapterId, { filterSlot } = {}) {
  const data = await getChapterData(subjectId, chapterId, 'cards');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, icon('layers', 32)),
      el('p', {}, 'Flashcards non disponibles.')
    ));
    return;
  }
  await renderFlashcardsEngine(container, data.cards, data.categories, subjectId, chapterId, filterSlot);
}

export async function renderFlashcardsEngine(container, allCardsRaw, categories, subjectId, chapterId, filterSlot) {
  const prefs = getPrefs();
  const allCards = allCardsRaw;
  const getActiveCards = () => allCards.filter(c => !isCardBanned(`${subjectId}/${chapterId}/${c.id}`));

  let deck = [], currentIdx = 0, isFlipped = false;
  let goodList = [], badList = [];
  let activeFilter = 'all';
  let listMode = false, focusMode = false;
  let animating = false; // lock during card exit animation

  updateChapterVisit(subjectId, chapterId);

  const storeId = (card) => `${card._prefix || (subjectId + '/' + chapterId)}/${card.id}`;
  const catMap = {};
  for (const cat of categories) catMap[cat.id] = cat.label;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ══════════════════════════════════════
  // DOM
  // ══════════════════════════════════════

  const progressText = el('span', {}, '');
  const progressCounter = el('div', { class: 'fc-counter' }, progressText);
  const countGood = el('span', {}, '0');
  const countBad = el('span', {}, '0');
  const progressFill = el('div', { class: 'fc-progress-fill' });

  const listToggleBtn = el('button', { class: 'fc-list-toggle', onClick: toggleListMode }, icon('list', 16));
  const focusToggleBtn = el('button', { class: 'fc-list-toggle', onClick: toggleFocusMode }, icon('maximize-2', 16));

  let hintTimer = null;
  const infoBtn = el('button', { class: 'fc-list-toggle', onClick: () => {
    swipeHint.classList.remove('hidden');
    cardHint.classList.add('visible');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      swipeHint.classList.add('hidden');
      cardHint.classList.remove('visible');
    }, 3000);
  }}, icon('info', 14));

  // ── Filter menu (drawer on mobile, dropdown on desktop) ──
  const filterBtns = [];
  const filterList = el('div', { class: 'fc-filter-list' });

  filterList.appendChild(el('div', { class: 'fc-filter-section-title' }, 'Catégories'));
  addFilterItem('all', 'Toutes les cartes', icon('layers', 18), allCards.length);
  for (const cat of categories) {
    const count = allCards.filter(c => c.cat === cat.id).length;
    addFilterItem(cat.id, cat.label, null, count);
  }
  filterList.appendChild(el('div', { class: 'fc-filter-section-title' }, 'Filtres'));
  addFilterItem('favorites', 'Favoris', icon('star', 18));
  addFilterItem('weak', 'Points faibles', icon('flame', 18));

  function addFilterItem(id, label, iconEl, count) {
    const btn = el('button', {
      class: 'fc-filter-item' + (id === 'all' ? ' active' : ''),
      onClick: () => {
        if (listMode) toggleListMode();
        setFilter(id, btn);
        closeFilterMenu();
      }
    },
      iconEl || el('span', { class: 'fc-filter-dot' }),
      el('span', { class: 'fc-filter-item-label' }, label),
      count != null ? el('span', { class: 'fc-filter-item-count' }, String(count)) : false
    );
    filterList.appendChild(btn);
    filterBtns.push(btn);
  }

  const filterOverlay = el('div', { class: 'fc-filter-overlay', onClick: closeFilterMenu });
  const filterMenu = el('div', { class: 'fc-filter-menu' },
    el('div', { class: 'fc-filter-menu-header' },
      el('span', { class: 'fc-filter-menu-title' }, 'Filtrer les cartes'),
      el('button', { class: 'fc-filter-menu-close', onClick: closeFilterMenu }, icon('x', 20))
    ),
    filterList
  );
  const filterContainer = el('div', { class: 'fc-filter-container' }, filterOverlay, filterMenu);

  let filterMenuOpen = false;
  function toggleFilterMenu() {
    filterMenuOpen = !filterMenuOpen;
    filterContainer.classList.toggle('open', filterMenuOpen);
    filterTrigger.classList.toggle('active', filterMenuOpen);
    if (filterMenuOpen) refreshIcons();
  }
  function closeFilterMenu() {
    filterMenuOpen = false;
    filterContainer.classList.remove('open');
    filterTrigger.classList.remove('active');
  }

  // Filter trigger button (in stats bar)
  const filterLabel = el('span', { class: 'fc-filter-label' }, 'Toutes');
  const filterTrigger = el('button', { class: 'fc-filter-trigger', onClick: toggleFilterMenu },
    icon('filter', 16), ' ', filterLabel, el('span', { class: 'fc-filter-chevron' }, icon('chevron-down', 14))
  );
  const filterTriggerWrap = el('div', { class: 'fc-filter-trigger-wrap' }, filterTrigger, filterContainer);

  const badgeGood = el('span', { class: 'fc-badge good clickable', onClick: () => toggleSessionList('good') }, icon('check', 14), ' ', countGood);
  const badgeBad = el('span', { class: 'fc-badge bad clickable', onClick: () => toggleSessionList('bad') }, icon('x', 14), ' ', countBad);

  // Focus exit button (only visible in focus mode)
  const focusExitBtn = el('button', { class: 'fc-focus-exit', onClick: toggleFocusMode }, icon('minimize-2', 20));

  const stats = el('div', { class: 'fc-stats' },
    el('div', { class: 'fc-stats-left' }, filterTriggerWrap, progressCounter),
    el('div', { class: 'fc-badges' },
      badgeGood, badgeBad,
      infoBtn,
      listToggleBtn,
      focusToggleBtn
    )
  );
  const progressBar = el('div', { class: 'fc-progress-wrap' }, progressFill);

  // Session list (good/bad answers during current session)
  const sessionListEl = el('div', { class: 'fc-session-list' });
  const sessionScrollHint = el('div', { class: 'fc-session-scroll-hint' }, icon('chevron-down', 18));
  const sessionWrap = el('div', { class: 'fc-session-list-wrap hidden' }, sessionListEl, sessionScrollHint);
  let sessionListType = null;

  // Hide scroll hint when scrolled to bottom
  sessionListEl.addEventListener('scroll', () => {
    const atBottom = sessionListEl.scrollTop + sessionListEl.clientHeight >= sessionListEl.scrollHeight - 10;
    sessionScrollHint.classList.toggle('hidden', atBottom);
  });

  function toggleSessionList(type) {
    if (sessionListType === type) {
      sessionWrap.classList.add('hidden');
      sessionListType = null;
      return;
    }
    sessionListType = type;
    const cards = type === 'good' ? goodList : badList;
    sessionListEl.innerHTML = '';
    if (cards.length === 0) {
      sessionListEl.appendChild(el('p', { class: 'cardlist-info' },
        type === 'good' ? 'Aucune bonne réponse pour l\'instant.' : 'Aucune mauvaise réponse pour l\'instant.'
      ));
    } else {
      sessionListEl.appendChild(el('p', { class: 'cardlist-info' },
        `${cards.length} ${type === 'good' ? 'correcte' : 'à revoir'}${cards.length > 1 ? 's' : ''}`
      ));
      for (const card of cards) {
        const answerDiv = el('div', { class: 'cardlist-a hidden' });
        answerDiv.innerHTML = card.a;
        const catLabel = catMap[card.cat] || card.cat;
        sessionListEl.appendChild(el('div', {
          class: 'cardlist-card',
          onClick: () => answerDiv.classList.toggle('hidden')
        },
          el('div', { class: 'cardlist-header' },
            el('div', { class: 'cardlist-left' },
              el('span', { class: 'cardlist-cat' }, catLabel),
              el('div', { class: 'cardlist-q' }, card.q)
            ),
            el('span', { class: 'cardlist-score ' + (type === 'good' ? 'good' : 'bad') },
              type === 'good' ? '✓' : '✗')
          ),
          answerDiv
        ));
      }
    }
    sessionWrap.classList.remove('hidden');
    sessionListEl.scrollTop = 0;
    // Show/hide scroll hint based on content
    requestAnimationFrame(() => {
      sessionScrollHint.classList.toggle('hidden', sessionListEl.scrollHeight <= sessionListEl.clientHeight);
    });
    refreshIcons();
  }

  // Card list (browse all / ban)
  const cardListEl = el('div', { class: 'fc-cardlist hidden' });

  // Card elements
  const categoryTag = el('span', { class: 'fc-category-tag' });
  const questionText = el('p', { class: 'fc-question' });
  const answerText = el('p', { class: 'fc-answer' });

  // Swipe overlays (green right / red left)
  const overlayGood = el('div', { class: 'fc-swipe-overlay good' }, icon('check', 32));
  const overlayBad = el('div', { class: 'fc-swipe-overlay bad' }, icon('x', 32));

  const favBtn = el('button', { class: 'fc-fav-btn', onClick: (e) => {
    e.stopPropagation();
    if (currentIdx >= deck.length) return;
    const isFav = toggleFavorite(storeId(deck[currentIdx]));
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.classList.toggle('active', isFav);
  }}, '☆');

  // Answer zones on the back of the card
  const zoneBad = el('button', { class: 'fc-zone bad', onClick: (e) => { e.stopPropagation(); if (isFlipped) answerCard(false); } },
    icon('x', 20), el('span', {}, 'À revoir')
  );
  const zoneGood = el('button', { class: 'fc-zone good', onClick: (e) => { e.stopPropagation(); if (isFlipped) answerCard(true); } },
    icon('check', 20), el('span', {}, 'Je savais')
  );
  const answerZones = el('div', { class: 'fc-zones' }, zoneBad, zoneGood);

  const cardHint = el('span', { class: 'fc-hint' }, 'Appuyer pour révéler');

  const skipBtn = el('button', { class: 'fc-skip', onClick: (e) => {
    e.stopPropagation();
    if (!animating && !flipping) goNext();
  }}, icon('skip-forward', 16), ' Passer');

  const cardEl = el('div', { class: 'fc-card' },
    el('div', { class: 'fc-card-inner' },
      el('div', { class: 'fc-card-front' },
        categoryTag, favBtn, questionText,
        cardHint,
        skipBtn
      ),
      el('div', { class: 'fc-card-back' }, answerText, answerZones)
    ),
    overlayGood, overlayBad
  );
  const cardContainer = el('div', { class: 'fc-card-container' }, cardEl);

  const swipeHint = el('p', { class: 'fc-swipe-hint hidden' },
    'Tap pour retourner \u00a0·\u00a0 Swipe ▼ pour passer \u00a0·\u00a0 Swipe ◀▶ pour répondre'
  );

  // Actions


  // End screen
  const endBarFill = el('div', { class: 'fc-end-bar-fill' });
  const endBarBad = el('div', { class: 'fc-end-bar-bad' });
  const endBar = el('div', { class: 'fc-end-bar' }, endBarFill, endBarBad);
  const endLabel = el('div', { class: 'fc-end-label' });
  const endStats = el('div', { class: 'fc-end-stats-wrap' }, endBar, endLabel);
  const endFailedList = el('div', { class: 'fc-end-failed' });
  const btnRestart = el('button', { class: 'fc-btn-restart', onClick: () => initDeck(getFiltered()) }, icon('refresh-cw', 16), ' Recommencer');
  const btnRetry = el('button', { class: 'fc-btn-retry', onClick: () => { if (badList.length > 0) initDeck([...badList]); } }, icon('repeat', 16), ' Revoir les ratées');
  const btnReset = el('button', { class: 'fc-btn-reset', onClick: handleReset }, icon('trash-2', 16), ' Effacer progression');
  const endEl = el('div', { class: 'fc-end hidden' },
    el('h2', {}, 'Session terminée !'),
    endStats, endFailedList,
    el('div', { class: 'fc-end-actions' }, btnRestart, btnRetry, btnReset)
  );

  const deckArea = el('div', { class: 'fc-deck-area' }, focusExitBtn, cardContainer, swipeHint, endEl);

  container.append(stats, progressBar, sessionWrap, deckArea, cardListEl);

  // ══════════════════════════════════════
  // Focus mode (#10)
  // ══════════════════════════════════════

  function toggleFocusMode() {
    // Exit list mode first if active
    if (listMode) toggleListMode();
    focusMode = !focusMode;
    focusToggleBtn.classList.toggle('active', focusMode);
    document.getElementById('app').classList.toggle('fc-focus', focusMode);
  }

  // ══════════════════════════════════════
  // Filter collapse (#9)
  // ══════════════════════════════════════

  // No-ops — filter collapse no longer needed with drawer/dropdown
  function collapseFilters() {}
  function expandFilters() {}

  // ══════════════════════════════════════
  // Card list
  // ══════════════════════════════════════

  function toggleListMode() {
    listMode = !listMode;
    listToggleBtn.classList.toggle('active', listMode);
    deckArea.classList.toggle('hidden', listMode);
    cardListEl.classList.toggle('hidden', !listMode);
    sessionWrap.classList.add('hidden'); sessionListType = null;
    if (listMode) { renderCardList(); expandFilters(); }
  }

  function renderCardList() {
    cardListEl.innerHTML = '';
    const filtered = getFilteredAll();
    cardListEl.appendChild(el('p', { class: 'cardlist-info' },
      `${filtered.length} cartes · Appuie pour voir la réponse · Swipe → bannir · Swipe ← débannir`
    ));
    for (const card of filtered) {
      const cardId = storeId(card);
      const progress = getCardProgress(cardId);
      const isBanned = progress && progress.banned;
      const questionDiv = el('div', { class: 'cardlist-q' }, card.q);
      const answerDiv = el('div', { class: 'cardlist-a hidden' });
      answerDiv.innerHTML = card.a;
      const catLabel = catMap[card.cat] || card.cat;
      const banBar = el('div', { class: 'cardlist-banbar' + (isBanned ? ' banned' : '') });

      function doBan() {
        const nowBanned = toggleBanned(cardId);
        banBar.classList.toggle('banned', nowBanned);
        cardRow.classList.toggle('banned', nowBanned);
      }

      // Ban bar click (desktop)
      banBar.addEventListener('click', (e) => { e.stopPropagation(); doBan(); });

      const cardRow = el('div', {
        class: 'cardlist-card' + (isBanned ? ' banned' : ''),
        onClick: () => answerDiv.classList.toggle('hidden')
      },
        el('div', { class: 'cardlist-body' },
          el('div', { class: 'cardlist-header' },
            el('div', { class: 'cardlist-left' },
              el('span', { class: 'cardlist-cat' }, catLabel), questionDiv)
          ),
          answerDiv
        ),
        banBar
      );

      // Swipe to ban/unban (mobile)
      let sX = 0, sY = 0, swiping = false;
      cardRow.addEventListener('touchstart', (e) => {
        sX = e.changedTouches[0].clientX;
        sY = e.changedTouches[0].clientY;
        swiping = false;
      }, { passive: true });
      cardRow.addEventListener('touchmove', (e) => {
        const dx = e.changedTouches[0].clientX - sX;
        if (!swiping && Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(e.changedTouches[0].clientY - sY)) {
          swiping = true;
        }
        if (swiping) {
          e.preventDefault();
          const clamp = Math.max(-60, Math.min(60, dx));
          cardRow.style.transform = `translateX(${clamp}px)`;
          cardRow.style.transition = 'none';
        }
      }, { passive: false });
      cardRow.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - sX;
        cardRow.style.transition = 'transform 0.2s ease';
        cardRow.style.transform = '';
        if (swiping && Math.abs(dx) > 30) {
          // Swipe right = ban, swipe left = unban
          const currentlyBanned = cardRow.classList.contains('banned');
          if (dx > 0 && !currentlyBanned) doBan();
          else if (dx < 0 && currentlyBanned) doBan();
          e.preventDefault();
        }
        swiping = false;
      }, { passive: false });

      cardListEl.appendChild(cardRow);
    }
    refreshIcons();
  }

  // ══════════════════════════════════════
  // Filtering
  // ══════════════════════════════════════

  function getFiltered() {
    const active = getActiveCards();
    if (activeFilter === 'favorites') return active.filter(c => { const p = getCardProgress(storeId(c)); return p && p.fav; });
    if (activeFilter === 'weak') return active.filter(c => { const p = getCardProgress(storeId(c)); return !p || p.score <= 0; });
    if (activeFilter !== 'all') return active.filter(c => c.cat === activeFilter);
    return active;
  }

  function getFilteredAll() {
    if (activeFilter === 'favorites') return allCards.filter(c => { const p = getCardProgress(storeId(c)); return p && p.fav; });
    if (activeFilter === 'weak') return allCards.filter(c => { const p = getCardProgress(storeId(c)); return !p || p.score <= 0; });
    if (activeFilter !== 'all') return allCards.filter(c => c.cat === activeFilter);
    return allCards;
  }

  function setFilter(id, btn) {
    activeFilter = id;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Update trigger label
    const labelMap = { all: 'Toutes', favorites: 'Favoris', weak: 'Points faibles' };
    const catObj = categories.find(c => c.id === id);
    filterLabel.textContent = labelMap[id] || (catObj ? catObj.label : id);
    if (listMode) { renderCardList(); }
    else {
      const filtered = getFiltered();
      if (filtered.length === 0) initEmpty(id === 'favorites' ? 'Aucun favori pour l\'instant. Appuie sur ☆ pour en ajouter.' : 'Aucune carte dans cette catégorie.');
      else initDeck(filtered);
    }
  }

  // ══════════════════════════════════════
  // Deck logic
  // ══════════════════════════════════════

  function initEmpty(msg) {
    deck = []; currentIdx = 0;
    cardContainer.style.display = 'none';
    swipeHint.style.display = 'none';
    endEl.classList.add('hidden');
    let emptyEl = deckArea.querySelector('.fc-empty');
    if (!emptyEl) {
      emptyEl = el('div', { class: 'fc-empty placeholder' }, el('div', { class: 'icon' }, icon('inbox', 32)), el('p', {}));
      deckArea.appendChild(emptyEl);
    }
    emptyEl.querySelector('p').textContent = msg;
    emptyEl.style.display = '';
    expandFilters();
    refreshIcons();
  }

  function initDeck(cards) {
    const emptyEl = deckArea.querySelector('.fc-empty');
    if (emptyEl) emptyEl.style.display = 'none';
    deck = prefs.spacedRepetition
      ? sortBySpacedRepetition([...cards], c => getCardProgress(storeId(c)))
      : shuffle([...cards]);
    currentIdx = 0; goodList = []; badList = [];
    countGood.textContent = '0'; countBad.textContent = '0';
    sessionWrap.classList.add('hidden'); sessionListType = null;
    cardContainer.style.display = '';
    swipeHint.style.display = '';
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
    cardEl.style.transform = '';
    overlayGood.style.opacity = '0';
    overlayBad.style.opacity = '0';

    const progress = getCardProgress(storeId(card));
    const isFav = progress && progress.fav;
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.classList.toggle('active', !!isFav);

    progressText.textContent = `${currentIdx + 1} / ${deck.length}`;
    progressFill.style.width = (currentIdx / deck.length * 100) + '%';
    countGood.textContent = goodList.length;
    countBad.textContent = badList.length;
    animating = false;
  }

  let flipping = false;
  function flipCard() {
    if (animating || flipping) return;
    flipping = true;
    isFlipped = !isFlipped;
    cardEl.classList.toggle('flipped', isFlipped);
    if (isFlipped) swipeHint.textContent = '◀ À revoir \u00a0·\u00a0 tap pour retourner \u00a0·\u00a0 Je savais ▶';
    else swipeHint.textContent = '◀ swipe pour naviguer \u00a0·\u00a0 tap pour retourner ▶';
    setTimeout(() => { flipping = false; }, 550);
  }

  function goNext() {
    if (animating) return;
    if (currentIdx < deck.length - 1) { currentIdx++; renderCard(); }
    else if (currentIdx === deck.length - 1) { currentIdx++; showEnd(); }
  }
  function goPrev() { if (!animating && currentIdx > 0) { currentIdx--; renderCard(); } }

  // ══════════════════════════════════════
  // Answer with exit animation (#2)
  // ══════════════════════════════════════

  function answerCard(correct) {
    if (animating) return;
    animating = true;
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

    // Collapse filters after first answer (#9)
    collapseFilters();

    // Exit animation
    const dir = correct ? 1 : -1;
    cardEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    cardEl.style.transform = `translateX(${dir * 120}%) rotate(${dir * 10}deg)`;
    cardEl.style.opacity = '0';

    setTimeout(() => {
      const inner = cardEl.querySelector('.fc-card-inner');
      inner.style.transition = 'none';
      cardEl.style.transition = 'none';
      cardEl.style.transform = 'scale(0.95)';
      cardEl.style.opacity = '0';
      currentIdx++;
      renderCard();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardEl.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
          cardEl.style.transform = '';
          cardEl.style.opacity = '';
          setTimeout(() => {
            cardEl.style.transition = '';
            inner.style.transition = '';
          }, 150);
        });
      });
    }, 200);
  }

  // ══════════════════════════════════════
  // End screen (#7 + #8)
  // ══════════════════════════════════════

  function showEnd() {
    cardContainer.style.display = 'none';
    swipeHint.style.display = 'none';
    endEl.classList.remove('hidden');
    expandFilters();

    const total = goodList.length + badList.length;
    const pct = total ? Math.round(goodList.length / total * 100) : 0;
    const pctBad = total ? Math.round(badList.length / total * 100) : 0;

    // Animated bar (#7)
    endBarFill.style.width = '0';
    endBarBad.style.width = '0';
    requestAnimationFrame(() => {
      endBarFill.style.width = pct + '%';
      endBarBad.style.width = pctBad + '%';
    });
    endLabel.innerHTML =
      `<span class="fc-end-good">${goodList.length} correcte${goodList.length > 1 ? 's' : ''}</span>` +
      `<span class="fc-end-pct">${pct}%</span>` +
      `<span class="fc-end-bad">${badList.length} à revoir</span>`;

    // Failed cards list (#8)
    endFailedList.innerHTML = '';
    if (badList.length > 0) {
      const failedTitle = el('div', { class: 'fc-end-failed-title' }, `Questions ratées (${badList.length})`);
      endFailedList.appendChild(failedTitle);
      for (const card of badList) {
        const row = el('div', { class: 'fc-end-failed-card' },
          el('div', { class: 'fc-end-failed-q' }, card.q),
          el('div', { class: 'fc-end-failed-a', html: card.a })
        );
        endFailedList.appendChild(row);
      }
    }

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

  // ══════════════════════════════════════
  // Touch with real-time feedback (#3)
  // ══════════════════════════════════════

  let tX = 0, tY = 0, touchUsed = false, dragDir = null; // 'h' or 'v'

  cardEl.addEventListener('touchstart', e => {
    if (animating) return;
    tX = e.changedTouches[0].clientX;
    tY = e.changedTouches[0].clientY;
    touchUsed = false;
    dragDir = null;
    cardEl.style.transition = 'none';
  }, { passive: true });

  cardEl.addEventListener('touchmove', e => {
    if (animating) return;
    const dx = e.changedTouches[0].clientX - tX;
    const dy = e.changedTouches[0].clientY - tY;
    const ax = Math.abs(dx), ay = Math.abs(dy);

    // Lock direction on first significant move
    if (!dragDir && (ax > 10 || ay > 10)) {
      dragDir = ax > ay ? 'h' : 'v';
    }
    if (!dragDir) return;

    // Horizontal: only when flipped (swipe to answer)
    if (dragDir === 'h' && isFlipped) {
      e.preventDefault();
      const rotation = Math.max(-10, Math.min(10, dx * 0.06));
      cardEl.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;
      const intensity = Math.min(ax / 120, 1);
      if (dx > 0) {
        overlayGood.style.opacity = String(intensity);
        overlayBad.style.opacity = '0';
      } else {
        overlayBad.style.opacity = String(intensity);
        overlayGood.style.opacity = '0';
      }
    }

    // Vertical down: skip (only when not flipped)
    if (dragDir === 'v' && dy > 10 && !isFlipped) {
      e.preventDefault();
      const clamped = Math.min(dy, 100);
      cardEl.style.transform = `translateY(${clamped}px)`;
      cardEl.style.opacity = String(1 - clamped / 200);
    }
  }, { passive: false });

  cardEl.addEventListener('touchend', e => {
    if (animating) return;
    const dx = e.changedTouches[0].clientX - tX;
    const dy = e.changedTouches[0].clientY - tY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touchUsed = true;

    // Reset overlays
    overlayGood.style.opacity = '0';
    overlayBad.style.opacity = '0';

    // Tap (no significant movement)
    if (!dragDir && ax < 20 && ay < 20) {
      cardEl.style.transition = '';
      cardEl.style.transform = '';
      cardEl.style.opacity = '';
      const target = e.target;
      if (target.closest && (target.closest('.fc-zone') || target.closest('.fc-skip'))) return;
      flipCard();
    }
    // Horizontal swipe when flipped → answer
    else if (dragDir === 'h' && isFlipped && ax > 30) {
      answerCard(dx > 0);
    }
    // Vertical swipe down when not flipped → skip
    else if (dragDir === 'v' && dy > 50 && !isFlipped) {
      cardEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      cardEl.style.transform = 'translateY(120px)';
      cardEl.style.opacity = '0';
      setTimeout(() => {
        cardEl.style.transition = '';
        cardEl.style.transform = '';
        cardEl.style.opacity = '';
        goNext();
      }, 200);
    }
    // Snap back
    else {
      cardEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      cardEl.style.transform = '';
      cardEl.style.opacity = '';
    }

    e.preventDefault();
  }, { passive: false });

  cardEl.addEventListener('click', () => {
    if (touchUsed) { touchUsed = false; return; }
    flipCard();
  });

  // ══════════════════════════════════════
  // Keyboard
  // ══════════════════════════════════════

  const abortCtrl = new AbortController();
  onCleanup(() => {
    abortCtrl.abort();
    clearTimeout(hintTimer);
    document.getElementById('app').classList.remove('fc-focus');
  });

  document.addEventListener('keydown', e => {
    if (listMode || animating) return;
    if (!endEl.classList.contains('hidden')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
    if (e.key === 'ArrowRight' && isFlipped) answerCard(true);
    if (e.key === 'ArrowLeft' && isFlipped) answerCard(false);
    if (e.key === 'ArrowDown' && !isFlipped) { e.preventDefault(); goNext(); }
    if ((e.key === 'g' || e.key === 'G') && isFlipped) answerCard(true);
    if ((e.key === 'b' || e.key === 'B') && isFlipped) answerCard(false);
    if (e.key === 's' || e.key === 'S') { if (!isFlipped) goNext(); }
    if (e.key === 'f' || e.key === 'F') favBtn.click();
  }, { signal: abortCtrl.signal });

  // ══════════════════════════════════════
  // Start
  // ══════════════════════════════════════

  initDeck(getActiveCards());
  refreshIcons();
}
