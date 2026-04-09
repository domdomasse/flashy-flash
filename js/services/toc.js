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
 * - Sections with subsections: click toggles expand/collapse only
 * - Sections without subsections: click scrolls to section
 * - Sub-items: click scrolls to sub-section
 */
export function buildToc(container, sections, prefix = '') {
  const tocList = el('div', { class: 'cours-toc-list' });

  for (const section of sections) {
    const sectionSlug = prefix + slugify(section.title);
    const hasSubs = section.subsections && section.subsections.length > 0;

    const chevron = hasSubs ? el('span', { class: 'cours-toc-chevron' }, icon('chevron-right', 14)) : null;

    const label = el('span', { class: 'cours-toc-section-label' }, section.title);

    const sectionRow = el('div', { class: 'cours-toc-section' }, chevron, label);

    let subsEl = null;
    if (hasSubs) {
      subsEl = el('div', { class: 'cours-toc-subs collapsed' });
      for (const sub of section.subsections) {
        const subSlug = prefix + slugify(section.title + ' ' + sub.title);
        subsEl.appendChild(el('div', {
          class: 'cours-toc-sub',
          onClick: (e) => {
            e.stopPropagation();
            const target = container.querySelector(`#${subSlug}`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, sub.title));
      }

      // Click on section row = toggle only (no scroll)
      const toggle = () => {
        const wasOpen = !subsEl.classList.contains('collapsed');
        subsEl.classList.toggle('collapsed', wasOpen);
        if (chevron) chevron.classList.toggle('open', !wasOpen);
      };
      sectionRow.addEventListener('click', toggle);
    } else {
      // No subsections: click scrolls to section
      sectionRow.addEventListener('click', () => {
        const target = container.querySelector(`#${sectionSlug}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
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

/**
 * Activate the scroll indicator inside the topbar.
 * Looks for .topbar-section and .topbar in the DOM, updates text on scroll.
 * Adds .scrolled class to topbar when a section is visible.
 */
export function activateScrollIndicator(container, prefix) {
  let headings = [];

  function collectHeadings() {
    headings = [];
    const allH = [...container.querySelectorAll(`h2[id^="${prefix}"], h3[id^="${prefix}"]`)];
    let lastParent = '';
    for (let i = 0; i < allH.length; i++) {
      const h = allH[i];
      if (h.tagName === 'H2') {
        lastParent = h.textContent;
        // Include h2 if it has no h3 following (standalone section like Introduction)
        const next = allH[i + 1];
        if (!next || next.tagName === 'H2') {
          headings.push({ el: h, text: h.textContent, parent: '' });
        }
        // Skip h2 that have subsections — their h3 children will show instead
      } else {
        const match = lastParent.match(/^([IVX]+)\s*[–—-]/);
        const parentLabel = match ? match[1] : '';
        headings.push({ el: h, text: h.textContent, parent: parentLabel });
      }
    }
  }

  function onScroll() {
    if (headings.length === 0) collectHeadings();

    const topbar = document.querySelector('.topbar');
    const sectionEl = document.querySelector('.topbar-section');
    if (!topbar || !sectionEl) return;

    const offset = topbar.offsetHeight + 40;
    const scrollY = window.scrollY + offset;
    let current = null;
    for (const h of headings) {
      if (h.el.offsetTop <= scrollY) current = h;
      else break;
    }

    if (current && window.scrollY > 150) {
      sectionEl.textContent = current.parent ? `${current.parent} – ${current.text}` : current.text;
      topbar.classList.add('scrolled');
    } else {
      sectionEl.textContent = '';
      topbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.classList.remove('scrolled');
  });

  setTimeout(onScroll, 100);
}
