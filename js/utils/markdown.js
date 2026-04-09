import { el } from '../render.js';

function bold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function renderMarkdown(text) {
  const container = document.createDocumentFragment();

  for (const block of text.split('\n\n')) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split('\n');

    if (lines.every(l => l.trim().startsWith('- ') || l.trim() === '')) {
      const ul = el('ul', {});
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('- ')) ul.appendChild(el('li', { html: bold(t.slice(2)) }));
      }
      container.appendChild(ul);
    } else if (lines.every(l => /^\d+\.\s/.test(l.trim()) || l.trim() === '')) {
      const ol = el('ol', {});
      for (const line of lines) {
        const match = line.trim().match(/^\d+\.\s(.+)/);
        if (match) ol.appendChild(el('li', { html: bold(match[1]) }));
      }
      container.appendChild(ol);
    } else {
      container.appendChild(el('p', { html: bold(trimmed.replace(/\n/g, '<br>')) }));
    }
  }
  return container;
}
