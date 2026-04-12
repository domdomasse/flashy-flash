let glossaryCache = {};

/**
 * Load glossary entries for a given subject + chapter.
 * Returns Map<lowercase term, { term, def }>.
 */
export async function loadGlossary(subjectId, chapterId) {
  const key = `${subjectId}/${chapterId}`;
  if (glossaryCache[key]) return glossaryCache[key];

  const entries = new Map();

  try {
    const res = await fetch(`data/${subjectId}/${chapterId}/glossary.json`);
    if (res.ok) {
      const data = await res.json();
      for (const t of data.terms) {
        if (t.term.length >= 3) {
          entries.set(t.term.toLowerCase(), { term: t.term, def: t.def });
        }
      }
    }
  } catch { /* skip */ }

  glossaryCache[key] = entries;
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

  // Add tooltip dismiss on click outside or scroll
  document.addEventListener('click', dismissTooltip);
  window.addEventListener('scroll', dismissTooltip, { passive: true });
}

function processTextNodes(element, regex, glossary) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    // Skip if parent is already a glossary-link or a link
    if (node.parentElement.closest('.glossary-link, a')) continue;

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
      span.dataset.def = entry.def;
      // Desktop: hover to show/hide
      span.addEventListener('mouseenter', showTooltip);
      span.addEventListener('mouseleave', dismissTooltip);
      // Block click (no action needed, hover handles it on desktop)
      span.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
      // Mobile: tap to show (use touchend to not block scroll)
      let touchMoved = false;
      span.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
      span.addEventListener('touchmove', () => { touchMoved = true; }, { passive: true });
      span.addEventListener('touchend', (e) => {
        if (!touchMoved) {
          e.preventDefault();
          showTooltip(e);
        }
      });
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
