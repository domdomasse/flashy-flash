import { el, onCleanup } from '../render.js';
import { icon } from '../icons.js';
import { buildBackToTop } from '../services/toc.js';

/** Strip accents for comparison */
function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Strip accents and return base uppercase letter, or '#' for non-alpha */
function letterOf(term) {
  const base = term[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return /^[A-Z]$/.test(base) ? base : '#';
}

/** Wrap matching substring in <mark> */
function highlightTerm(text, query) {
  if (!query) return text;
  const norm = normalize(text);
  const idx = norm.indexOf(query);
  if (idx === -1) return text;
  return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + query.length) + '</mark>' + text.slice(idx + query.length);
}

export async function renderGlossaryTab(content, subjectId, chapterId) {
  // Load glossary from dedicated file
  let entries = [];
  try {
    const res = await fetch(`data/${subjectId}/${chapterId}/glossary.json`);
    if (res.ok) {
      const data = await res.json();
      entries = data.terms.map(t => ({
        term: t.term,
        def: t.def,
        termNorm: normalize(t.term),
        defNorm: normalize(t.def)
      }));
    }
  } catch { /* skip */ }

  entries.sort((a, b) => a.term.localeCompare(b.term, 'fr'));

  if (entries.length === 0) {
    content.appendChild(el('div', { class: 'placeholder', style: 'padding: 40px 0' },
      el('div', { class: 'icon' }, icon('book-open', 32)),
      el('p', {}, 'Aucune définition trouvée dans ce chapitre.')
    ));
    return;
  }

  // ── Search bar with clear button ──
  const searchInput = el('input', {
    class: 'glossary-search-input',
    type: 'text',
    placeholder: `Rechercher parmi ${entries.length} définitions…`
  });
  const clearBtn = el('button', { class: 'glossary-search-clear hidden', onClick: () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    runSearch();
    searchInput.focus();
  }}, icon('x', 14));
  const searchBar = el('div', { class: 'glossary-search' },
    el('span', { class: 'glossary-search-icon' }, icon('search', 16)),
    searchInput,
    clearBtn
  );

  // ── Letter index ──
  const letters = [...new Set(entries.map(e => letterOf(e.term)))].sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b, 'fr');
  });
  const letterBar = el('div', { class: 'glossary-letter-bar' });
  const letterBtns = {};
  let activeLetter = null;

  function clearLetterFilter() {
    if (!activeLetter) return;
    letterBtns[activeLetter].classList.remove('active');
    activeLetter = null;
    for (const l of letters) {
      groups[l].el.style.display = '';
      letterBtns[l].classList.remove('dimmed');
    }
    countLabel.textContent = `${entries.length} définitions`;
  }

  const allBtn = el('button', { class: 'glossary-letter-btn active', onClick: () => {
    clearLetterFilter();
    allBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }}, icon('list', 14));
  letterBar.appendChild(allBtn);

  for (const letter of letters) {
    const btn = el('button', { class: 'glossary-letter-btn' }, letter);
    btn.addEventListener('click', () => {
      if (activeLetter === letter) {
        return;
      } else {
        // Activer le filtre sur cette lettre
        activeLetter = letter;
        allBtn.classList.remove('active');
        for (const l of letters) {
          groups[l].el.style.display = l === letter ? '' : 'none';
          letterBtns[l].classList.remove('active', 'dimmed');
        }
        btn.classList.add('active');
        countLabel.textContent = `${groups[letter].cards.length} définition${groups[letter].cards.length > 1 ? 's' : ''} — ${letter}`;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    letterBar.appendChild(btn);
    letterBtns[letter] = btn;
  }

  // ── Grouped entries ──
  const listWrap = el('div', { class: 'glossary-list' });
  const groups = {};

  for (const letter of letters) {
    const groupEl = el('div', { class: 'glossary-group' });
    groupEl.setAttribute('data-letter-group', letter);
    const header = el('div', { class: 'glossary-group-header' }, letter);
    groupEl.appendChild(header);
    groups[letter] = { el: groupEl, cards: [] };
    listWrap.appendChild(groupEl);
  }

  const cardData = []; // parallel array: { card, entry, letter }
  for (const entry of entries) {
    const letter = letterOf(entry.term);
    const termEl = el('div', { class: 'glossary-term' });
    const defEl = el('div', { class: 'glossary-def' });
    termEl.textContent = entry.term;
    defEl.textContent = entry.def;
    const card = el('div', { class: 'glossary-card' }, termEl, defEl);
    groups[letter].el.appendChild(card);
    groups[letter].cards.push(card);
    cardData.push({ card, entry, letter, termEl, defEl });
  }

  // ── Count label ──
  const countLabel = el('div', { class: 'glossary-count' }, `${entries.length} définitions`);

  content.append(searchBar, letterBar, countLabel, listWrap);

  // ── Search logic ──
  function runSearch() {
    const raw = searchInput.value.trim();
    const q = normalize(raw);

    // Show/hide clear button
    clearBtn.classList.toggle('hidden', !raw);

    // Réinitialiser le filtre lettre
    if (activeLetter) {
      clearLetterFilter();
      allBtn.classList.add('active');
    }

    if (!q) {
      // Reset: show all, remove highlights, restore alpha order
      for (const d of cardData) {
        d.card.style.display = '';
        d.card.style.order = '';
        d.termEl.textContent = d.entry.term;
        d.defEl.textContent = d.entry.def;
      }
      for (const letter of letters) {
        groups[letter].el.style.display = '';
        if (letterBtns[letter]) letterBtns[letter].classList.remove('dimmed');
      }
      listWrap.style.display = '';
      countLabel.textContent = `${entries.length} définitions`;
      return;
    }

    // Score each entry: 3=exact, 2=starts with, 1=term contains, 0.5=def contains, -1=no match
    const scored = [];
    const hasExact = cardData.some(d => d.entry.termNorm === q);

    for (const d of cardData) {
      let score;
      if (d.entry.termNorm === q) score = 3;
      else if (hasExact) score = -1; // exact exists, hide non-exact
      else if (d.entry.termNorm.startsWith(q)) score = 2;
      else if (d.entry.termNorm.includes(q)) score = 1;
      else if (d.entry.defNorm.includes(q)) score = 0.5;
      else score = -1;
      scored.push({ ...d, score });
    }

    // Apply visibility, order, and highlighting
    let visibleCount = 0;
    for (const s of scored) {
      const visible = s.score > 0;
      s.card.style.display = visible ? '' : 'none';
      s.card.style.order = visible ? String(4 - Math.floor(s.score)) : '';
      if (visible) {
        visibleCount++;
        s.termEl.innerHTML = highlightTerm(s.entry.term, q);
        if (s.score <= 1) {
          s.defEl.innerHTML = highlightTerm(s.entry.def, q);
        } else {
          s.defEl.textContent = s.entry.def;
        }
      }
    }

    // Update letter groups visibility
    for (const letter of letters) {
      const group = groups[letter];
      const groupVisible = group.cards.some(c => c.style.display !== 'none');
      group.el.style.display = groupVisible ? '' : 'none';
      if (letterBtns[letter]) letterBtns[letter].classList.toggle('dimmed', !groupVisible);
    }

    countLabel.textContent = `${visibleCount} résultat${visibleCount !== 1 ? 's' : ''}`;
  }

  searchInput.addEventListener('input', runSearch);

  // ── Keyboard shortcut: / or Ctrl+K to focus search ──
  const abortCtrl = new AbortController();
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      searchInput.focus();
    }
  }, { signal: abortCtrl.signal });

  content.appendChild(buildBackToTop());

  onCleanup(() => abortCtrl.abort());
}
