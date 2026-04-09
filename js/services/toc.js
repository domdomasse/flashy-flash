import { el, onCleanup } from '../render.js';
import { icon, refreshIcons } from '../icons.js';

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build a collapsible table of contents.
 * Each section group can be expanded/collapsed independently.
 */
export function buildToc(container, sections, prefix = '') {
  const tocList = el('div', { class: 'cours-toc-list' });

  for (const section of sections) {
    const sectionSlug = prefix + slugify(section.title);
    const hasSubs = section.subsections && section.subsections.length > 0;

    // Section row: chevron + title
    const chevron = hasSubs ? el('span', { class: 'cours-toc-chevron' }, icon('chevron-right', 14)) : null;

    const sectionRow = el('div', { class: 'cours-toc-section' },
      chevron,
      el('span', {
        class: 'cours-toc-section-label',
        onClick: () => {
          const target = container.querySelector(`#${sectionSlug}`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, section.title)
    );

    // Subsection list (hidden by default)
    let subsEl = null;
    if (hasSubs) {
      subsEl = el('div', { class: 'cours-toc-subs collapsed' });
      for (const sub of section.subsections) {
        const subSlug = prefix + slugify(section.title + ' ' + sub.title);
        subsEl.appendChild(el('div', {
          class: 'cours-toc-sub',
          onClick: () => {
            const target = container.querySelector(`#${subSlug}`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, sub.title));
      }

      // Toggle subsections on chevron or section row click
      const toggle = () => {
        const wasOpen = !subsEl.classList.contains('collapsed');
        subsEl.classList.toggle('collapsed', wasOpen);
        if (chevron) chevron.classList.toggle('open', !wasOpen);
      };
      if (chevron) chevron.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
      sectionRow.addEventListener('click', toggle);
    }

    const group = el('div', { class: 'cours-toc-group' }, sectionRow);
    if (subsEl) group.appendChild(subsEl);
    tocList.appendChild(group);
  }

  const tocToggle = el('button', { class: 'cours-toc-toggle' }, 'Sommaire');
  const tocContent = el('div', { class: 'cours-toc-content' }, tocList);
  tocContent.style.display = 'none';

  tocToggle.addEventListener('click', () => {
    const open = tocContent.style.display !== 'none';
    tocContent.style.display = open ? 'none' : 'block';
    tocToggle.classList.toggle('open', !open);
    if (!open) refreshIcons();
  });

  return el('div', { class: 'cours-toc' }, tocToggle, tocContent);
}

/**
 * Create a floating "back to top" button that appears on scroll.
 */
export function buildBackToTop() {
  const btn = el('button', {
    class: 'back-to-top',
    'aria-label': 'Retour en haut',
    onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
  }, icon('chevron-up', 22));

  function onScroll() {
    btn.classList.toggle('visible', window.scrollY > 400);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onCleanup(() => window.removeEventListener('scroll', onScroll));
  onScroll();

  return btn;
}
