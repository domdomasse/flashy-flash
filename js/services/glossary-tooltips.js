import { getCatalog } from '../data.js';

const DEF_PATTERNS = [
  /^d[ée]finir\s/i,
  /^que?\s+(signifie|sont?|est-ce qu[e'])/i,
  /^qu['']est-ce qu[e']/i,
];

let glossaryCache = null;

/**
 * Load glossary entries for a given subject.
 * Returns Map<lowercase term, { term, answer }>.
 */
export async function loadGlossary(subjectId) {
  if (glossaryCache) return glossaryCache;

  const catalog = await getCatalog();
  const subject = catalog.subjects.find(s => s.id === subjectId);
  if (!subject) return new Map();

  const entries = new Map();

  for (const chapter of subject.chapters) {
    try {
      const res = await fetch(`data/${subjectId}/${chapter.id}/cards.json`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const card of data.cards) {
        const isDef = DEF_PATTERNS.some(p => p.test(card.q));
        if (!isDef) continue;
        let term = card.q
          .replace(/^(D[ée]finir|Que signifie|Qu['']est-ce que?|Qu['']est-ce qu[''])\s*/i, '')
          .replace(/[?.!]+$/, '')
          .replace(/^(un[e]?|l[ea]s?|l['']|d['']|des)\s*/i, '')
          .trim();
        term = term.charAt(0).toUpperCase() + term.slice(1);
        if (term.length >= 3) {
          entries.set(term.toLowerCase(), { term, answer: card.a });
        }
      }
    } catch { /* skip */ }
  }

  glossaryCache = entries;
  return entries;
}

/**
 * Scan a container for glossary terms and wrap them with clickable spans.
 * Call after content is rendered in DOM.
 */
export function attachGlossaryTooltips(container, glossary) {
  if (!glossary || glossary.size === 0) return;

  // Sort terms by length (longest first) to match longer terms before shorter ones
  const terms = [...glossary.keys()].sort((a, b) => b.length - a.length);

  // Build regex matching all terms (case insensitive, word boundary)
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  // Walk text nodes in summary-text elements
  const textEls = container.querySelectorAll('.summary-text');
  for (const textEl of textEls) {
    processTextNodes(textEl, regex, glossary);
  }

  // Add tooltip dismiss on click outside
  document.addEventListener('click', dismissTooltip);
}

function processTextNodes(element, regex, glossary) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    // Skip if parent is already a glossary-link or a strong/a tag
    if (node.parentElement.closest('.glossary-link, a, strong')) continue;

    const text = node.textContent;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      // Create clickable span
      const entry = glossary.get(match[0].toLowerCase());
      const span = document.createElement('span');
      span.className = 'glossary-link';
      span.textContent = match[0];
      span.dataset.term = entry.term;
      span.dataset.def = entry.answer;
      span.addEventListener('click', showTooltip);
      fragment.appendChild(span);

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  }
}

function showTooltip(e) {
  e.stopPropagation();
  dismissTooltip();

  const span = e.currentTarget;
  const tooltip = document.createElement('div');
  tooltip.className = 'glossary-tooltip';
  tooltip.innerHTML = `<div class="glossary-tooltip-term">${span.dataset.term}</div><div class="glossary-tooltip-def">${span.dataset.def}</div>`;

  // Position relative to the clicked term
  const rect = span.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 300)) + 'px';
  tooltip.style.top = (rect.bottom + 8) + 'px';

  // If tooltip would go off bottom, show above
  document.body.appendChild(tooltip);
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.bottom > window.innerHeight - 8) {
    tooltip.style.top = (rect.top - tooltipRect.height - 8) + 'px';
  }
}

function dismissTooltip() {
  const existing = document.querySelector('.glossary-tooltip');
  if (existing) existing.remove();
}
