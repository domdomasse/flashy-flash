import { getChapterData } from '../data.js';
import { el } from '../render.js';
import { loadGlossary, attachGlossaryTooltips } from '../services/glossary-tooltips.js';
import { buildToc, slugify, buildBackToTop } from '../services/toc.js';

// Mini markdown parser
function renderMarkdown(text) {
  const blocks = text.split('\n\n');
  const container = document.createDocumentFragment();

  for (const block of blocks) {
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

function bold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export async function renderCoursTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'cours');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, '📖'),
      el('p', {}, 'Cours non disponible.')
    ));
    return;
  }

  // Table of contents
  container.appendChild(buildToc(container, data.sections, 'c-'));

  // Sections
  for (const section of data.sections) {
    const sectionSlug = 'c-' + slugify(section.title);
    const sectionEl = el('div', { class: 'summary-section summary-card' });

    sectionEl.appendChild(el('h2', { class: 'summary-section-title', id: sectionSlug }, section.title));

    if (section.content) {
      const textEl = el('div', { class: 'summary-text' });
      textEl.appendChild(renderMarkdown(section.content));
      sectionEl.appendChild(textEl);
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        const subSlug = 'c-' + slugify(section.title + ' ' + sub.title);
        const subEl = el('div', { class: 'summary-subsection' });
        subEl.appendChild(el('h3', { class: 'summary-subsection-title', id: subSlug }, sub.title));
        const textEl = el('div', { class: 'summary-text' });
        textEl.appendChild(renderMarkdown(sub.content));
        subEl.appendChild(textEl);
        sectionEl.appendChild(subEl);
      }
    }

    container.appendChild(sectionEl);
  }

  // Back to top button
  container.appendChild(buildBackToTop());

  const glossary = await loadGlossary(subjectId);
  attachGlossaryTooltips(container, glossary);
}
