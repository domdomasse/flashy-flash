import { getChapterData } from '../data.js';
import { el } from '../render.js';
import { renderMarkdown } from '../utils/markdown.js';
import { loadGlossary, attachGlossaryTooltips } from '../services/glossary-tooltips.js';
import { buildToc, slugify, buildBackToTop, activateScrollIndicator } from '../services/toc.js';

export async function renderSummaryTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'summary');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, '📝'),
      el('p', {}, 'Résumé non disponible.')
    ));
    return;
  }

  // Table of contents
  container.appendChild(buildToc(container, data.sections, 's-'));

  // Sections
  for (const section of data.sections) {
    const sectionSlug = 's-' + slugify(section.title);
    const sectionEl = el('div', { class: 'summary-section summary-card' });

    sectionEl.appendChild(el('h2', { class: 'summary-section-title', id: sectionSlug }, section.title));

    if (section.content) {
      const textEl = el('div', { class: 'summary-text' });
      textEl.appendChild(renderMarkdown(section.content));
      sectionEl.appendChild(textEl);
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        const subSlug = 's-' + slugify(section.title + ' ' + sub.title);
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

  // Scroll indicator in topbar + back to top
  activateScrollIndicator(container, 's-');
  container.appendChild(buildBackToTop());

  const glossary = await loadGlossary(subjectId, chapterId);
  attachGlossaryTooltips(container, glossary);
}
