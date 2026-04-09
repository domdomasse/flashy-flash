import { el } from '../render.js';
import { icon } from '../icons.js';

export async function renderGlossaryTab(content, subjectId, chapterId) {
  // Load glossary from dedicated file
  let entries = [];
  try {
    const res = await fetch(`data/${subjectId}/${chapterId}/glossary.json`);
    if (res.ok) {
      const data = await res.json();
      entries = data.terms.map(t => ({ term: t.term, def: t.def }));
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

  // ── Search bar ──
  const searchInput = el('input', {
    class: 'glossary-search-input',
    type: 'text',
    placeholder: `Rechercher parmi ${entries.length} définitions…`
  });
  const searchBar = el('div', { class: 'glossary-search' },
    el('span', { class: 'glossary-search-icon' }, icon('search', 16)),
    searchInput
  );

  // ── Letter index ──
  const letters = [...new Set(entries.map(e => e.term[0].toUpperCase()))].sort((a, b) => a.localeCompare(b, 'fr'));
  const letterBar = el('div', { class: 'glossary-letter-bar' });
  const letterBtns = {};
  for (const letter of letters) {
    const btn = el('button', { class: 'glossary-letter-btn' }, letter);
    btn.addEventListener('click', () => {
      const target = content.querySelector(`[data-letter-group="${letter}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  for (const entry of entries) {
    const letter = entry.term[0].toUpperCase();
    const card = el('div', { class: 'glossary-card' },
      el('div', { class: 'glossary-term' }, entry.term),
      el('div', { class: 'glossary-def' }, entry.def)
    );
    card.dataset.term = entry.term.toLowerCase();
    card.dataset.def = entry.def;
    groups[letter].el.appendChild(card);
    groups[letter].cards.push(card);
  }

  // ── Count label ──
  const countLabel = el('div', { class: 'glossary-count' }, `${entries.length} définitions`);

  content.append(searchBar, letterBar, countLabel, listWrap);

  // ── Search filtering ──
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    for (const letter of letters) {
      const group = groups[letter];
      let groupVisible = false;
      for (const card of group.cards) {
        const match = !q || card.dataset.term.includes(q) || card.dataset.def.toLowerCase().includes(q);
        card.style.display = match ? '' : 'none';
        if (match) { groupVisible = true; visibleCount++; }
      }
      group.el.style.display = groupVisible ? '' : 'none';
      if (letterBtns[letter]) {
        letterBtns[letter].classList.toggle('dimmed', !groupVisible);
      }
    }

    countLabel.textContent = q
      ? `${visibleCount} résultat${visibleCount !== 1 ? 's' : ''}`
      : `${entries.length} définitions`;
  });
}
