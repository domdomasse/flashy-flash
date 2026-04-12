import { getSubject } from '../data.js';
import { el, showToast, getCleanupMark, runCleanupsFrom, onCleanup } from '../render.js';
import { navigate } from '../router.js';
import { icon, refreshIcons } from '../icons.js';
import { renderFlashcardsTab } from './flashcards.js';
import { renderSummaryTab } from './summary.js';
import { renderExercisesTab } from './exercises.js';
import { renderCoursTab } from './cours.js';
import { renderGlossaryTab } from './glossary-tab.js';

const TABS = [
  { id: 'cours', label: 'Cours', iconName: 'book-open' },
  { id: 'summary', label: 'Résumé', iconName: 'file-text' },
  { id: 'flashcards', label: 'Flashcards', iconName: 'layers' },
  { id: 'glossary', label: 'Glossaire', iconName: 'book-text' },
  { id: 'exercises', label: 'Exercices', iconName: 'pencil' }
];

const TAB_RENDERERS = {
  cours: renderCoursTab,
  summary: renderSummaryTab,
  flashcards: renderFlashcardsTab,
  glossary: renderGlossaryTab,
  exercises: renderExercisesTab
};

export async function renderChapter(container, { subject: subjectId, chapter: chapterId, tab }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }
  const chapter = subject.chapters.find(c => c.id === chapterId);
  if (!chapter) { navigate(subjectId); return; }

  let activeTab = tab;

  async function shareChapter() {
    const url = window.location.href;
    const title = `${chapter.name} — Flashmob`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); showToast('Lien copié !'); }
      catch { showToast('Impossible de copier le lien'); }
    }
  }

  const topbarTitle = el('h1', {}, chapter.name);
  const topbarSection = el('div', { class: 'topbar-section' });
  const topbarCenter = el('div', { class: 'topbar-center' }, topbarTitle, topbarSection);

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(subjectId), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    topbarCenter,
    el('div', { class: 'topbar-actions' },
      el('button', { class: 'btn-icon', onClick: shareChapter, 'aria-label': 'Partager' }, icon('share-2', 20)),
      el('button', { class: 'btn-icon', onClick: () => navigate('settings'), 'aria-label': 'Réglages' }, icon('settings', 22))
    )
  );

  // Desktop: top tab bar
  const tabBarBtns = [];
  const tabBar = el('div', { class: 'tab-bar' });
  for (const t of TABS) {
    const btn = el('button', {
      class: t.id === activeTab ? 'active' : '',
      onClick: () => switchTab(t.id)
    }, icon(t.iconName, 16), ' ' + t.label);
    tabBar.appendChild(btn);
    tabBarBtns.push({ id: t.id, el: btn });
  }

  // Mobile/tablet: bottom nav bar
  const bottomNavBtns = [];
  const bottomNav = el('nav', { class: 'bottom-nav' });
  for (const t of TABS) {
    const btn = el('button', {
      class: 'bottom-nav-btn' + (t.id === activeTab ? ' active' : ''),
      onClick: () => switchTab(t.id)
    }, icon(t.iconName, 22), el('span', { class: 'bottom-nav-label' }, t.label));
    bottomNav.appendChild(btn);
    bottomNavBtns.push({ id: t.id, el: btn });
  }

  const filterSlot = el('div', { class: 'tab-filter-slot' });
  const content = el('div', { class: 'tab-content' });

  const view = el('div', { class: 'view has-bottom-nav' });
  view.append(topbar, tabBar, filterSlot, content);
  container.appendChild(view);
  // Bottom nav hors de #app pour ne pas être affecté par le fade-in
  document.body.appendChild(bottomNav);

  // Visual Viewport positioning for Firefox Android dynamic toolbar.
  // Uses top-based positioning from the visual viewport (always accurate)
  // instead of bottom-based (depends on layout viewport which can lag).
  function syncBottomNav() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    bottomNav.style.bottom = 'auto';
    bottomNav.style.top = (vv.offsetTop + vv.height - bottomNav.offsetHeight) + 'px';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncBottomNav);
    window.visualViewport.addEventListener('scroll', syncBottomNav);
    window.addEventListener('scroll', syncBottomNav, { passive: true });
    syncBottomNav();
  }

  onCleanup(() => {
    bottomNav.remove();
    bottomNav.style.top = '';
    bottomNav.style.bottom = '';
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', syncBottomNav);
      window.visualViewport.removeEventListener('scroll', syncBottomNav);
      window.removeEventListener('scroll', syncBottomNav);
    }
  });

  // Mark AFTER page-level cleanups (bottomNav) so tab switches don't remove them
  let tabCleanupMark = getCleanupMark();

  // ── Switch tab without full page reload ──
  async function switchTab(newTab) {
    if (newTab === activeTab) return;
    activeTab = newTab;

    // Run tab-level cleanups (scroll listeners, timers, keyboard, etc.)
    runCleanupsFrom(tabCleanupMark);

    // Update hash silently (no router trigger)
    history.replaceState(null, '', `#${subjectId}/${chapterId}/${newTab}`);

    // Update active states on both navs
    tabBarBtns.forEach(b => b.el.classList.toggle('active', b.id === newTab));
    bottomNavBtns.forEach(b => b.el.classList.toggle('active', b.id === newTab));

    // Clear content + filter slot, scroll to top
    content.innerHTML = '';
    filterSlot.innerHTML = '';
    window.scrollTo(0, 0);

    // Reset topbar scroll state
    topbar.classList.remove('scrolled');
    topbarSection.textContent = '';

    // Ensure bottom nav is still in the DOM (defensive)
    if (!bottomNav.parentElement) {
      document.body.appendChild(bottomNav);
    }

    // Render new tab
    const renderer = TAB_RENDERERS[newTab];
    if (renderer) {
      await renderer(content, subjectId, chapterId, { filterSlot });
    } else {
      content.appendChild(
        el('div', { class: 'placeholder' },
          el('div', { class: 'icon' }, icon('file-text', 32)),
          el('p', {}, 'Contenu non disponible.')
        )
      );
    }
    tabCleanupMark = getCleanupMark();
    refreshIcons();
    window.scrollTo(0, 0);
    // Resync bottom nav position after tab switch.
    // Firefox Android's visual viewport updates asynchronously after scrollTo,
    // so we sync multiple times to catch the final state.
    syncBottomNav();
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      syncBottomNav();
      // One more after Firefox toolbar transition settles (~300ms)
      setTimeout(syncBottomNav, 300);
    });
  }

  // ── Render initial tab ──
  const renderer = TAB_RENDERERS[activeTab];
  if (renderer) {
    await renderer(content, subjectId, chapterId, { filterSlot });
  } else {
    content.appendChild(
      el('div', { class: 'placeholder' },
        el('div', { class: 'icon' }, icon('file-text', 32)),
        el('p', {}, 'Contenu non disponible.')
      )
    );
  }

  // Initial sync after page load (Firefox Android toolbar may still be transitioning)
  requestAnimationFrame(syncBottomNav);
  setTimeout(syncBottomNav, 300);
}
