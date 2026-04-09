import { getChapterData } from '../data.js';
import { el } from '../render.js';

// Mini markdown parser: **bold**, \n\n → paragraphs, \n- → list items
function renderMarkdown(text) {
  const blocks = text.split('\n\n');
  const container = document.createDocumentFragment();

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');

    // Check if it's a list
    if (lines.every(l => l.trim().startsWith('- ') || l.trim() === '')) {
      const ul = el('ul', {});
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('- ')) {
          ul.appendChild(el('li', { html: bold(t.slice(2)) }));
        }
      }
      container.appendChild(ul);
    }
    // Check if numbered list
    else if (lines.every(l => /^\d+\.\s/.test(l.trim()) || l.trim() === '')) {
      const ol = el('ol', {});
      for (const line of lines) {
        const t = line.trim();
        const match = t.match(/^\d+\.\s(.+)/);
        if (match) {
          ol.appendChild(el('li', { html: bold(match[1]) }));
        }
      }
      container.appendChild(ol);
    }
    // Regular paragraph
    else {
      container.appendChild(el('p', { html: bold(trimmed.replace(/\n/g, '<br>')) }));
    }
  }

  return container;
}

function bold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export async function renderSummaryTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'summary');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, '📝'),
      el('p', {}, 'Résumé non disponible.')
    ));
    return;
  }

  for (const section of data.sections) {
    const sectionEl = el('div', { class: 'summary-section' });
    sectionEl.appendChild(el('h2', { class: 'summary-section-title' }, section.title));

    if (section.content) {
      const textEl = el('div', { class: 'summary-text' });
      textEl.appendChild(renderMarkdown(section.content));
      sectionEl.appendChild(textEl);
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        const subEl = el('div', { class: 'summary-subsection' });
        subEl.appendChild(el('h3', { class: 'summary-subsection-title' }, sub.title));
        const textEl = el('div', { class: 'summary-text' });
        textEl.appendChild(renderMarkdown(sub.content));
        subEl.appendChild(textEl);
        sectionEl.appendChild(subEl);
      }
    }

    container.appendChild(sectionEl);
  }
}
