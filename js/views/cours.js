import { getChapterData } from '../data.js';
import { el } from '../render.js';
import { icon } from '../icons.js';
import { renderMarkdown } from '../utils/markdown.js';
import { loadGlossary, attachGlossaryTooltips } from '../services/glossary-tooltips.js';
import { buildToc, slugify, buildBackToTop, activateScrollIndicator } from '../services/toc.js';

export async function renderCoursTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'cours');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, icon('book-open', 32)),
      el('p', {}, 'Cours non disponible.')
    ));
    return;
  }

  // Table of contents
  container.appendChild(buildToc(container, data.sections, 'c-'));

  // Sections (collapsible)
  for (const section of data.sections) {
    const sectionSlug = 'c-' + slugify(section.title);
    const sectionEl = el('div', { class: 'summary-section summary-card' });

    const hasSubsections = section.subsections && section.subsections.length > 0;
    const sectionToggle = el('div', { class: 'section-toggle' + (hasSubsections ? '' : ' no-separator'), onClick: () => sectionToggle.classList.toggle('collapsed') },
      el('span', { class: 'section-chevron' }, icon('chevron-down', 14)),
      el('h2', { class: 'summary-section-title', id: sectionSlug }, section.title)
    );
    sectionEl.appendChild(sectionToggle);

    const sectionBody = el('div', { class: 'section-body' });

    if (section.content) {
      const textEl = el('div', { class: 'summary-text' });
      textEl.appendChild(renderMarkdown(section.content));
      sectionBody.appendChild(textEl);
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        const subSlug = 'c-' + slugify(section.title + ' ' + sub.title);
        const subEl = el('div', { class: 'summary-subsection' });

        const subToggle = el('div', { class: 'section-toggle', onClick: () => subToggle.classList.toggle('collapsed') },
          el('span', { class: 'section-chevron' }, icon('chevron-down', 12)),
          el('h3', { class: 'summary-subsection-title', id: subSlug }, sub.title)
        );
        subEl.appendChild(subToggle);

        const subBody = el('div', { class: 'section-body' });
        const textEl = el('div', { class: 'summary-text' });
        textEl.appendChild(renderMarkdown(sub.content));
        subBody.appendChild(textEl);
        subEl.appendChild(subBody);

        sectionBody.appendChild(subEl);
      }
    }

    sectionEl.appendChild(sectionBody);
    container.appendChild(sectionEl);
  }

  // Scroll indicator in topbar + back to top
  activateScrollIndicator(container, 'c-');
  container.appendChild(buildBackToTop());

  const glossary = await loadGlossary(subjectId, chapterId);
  attachGlossaryTooltips(container, glossary);
}
