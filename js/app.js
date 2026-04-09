import { initRouter } from './router.js';
import { getPrefs } from './store.js';
import { renderView } from './render.js';
import { renderHome } from './views/home.js';
import { renderSubject } from './views/subject.js';
import { renderChapter } from './views/chapter.js';
import { renderSettings } from './views/settings.js';
import { renderSearch } from './views/search.js';
import { renderGlossary } from './views/glossary.js';

const views = {
  home: renderHome,
  subject: renderSubject,
  chapter: renderChapter,
  settings: renderSettings,
  search: renderSearch,
  glossary: renderGlossary
};

function applyPrefs() {
  const prefs = getPrefs();
  document.documentElement.setAttribute('data-theme', prefs.theme);
  document.documentElement.style.setProperty('--font-scale', prefs.fontSize);
  const themeColors = { dark: '#0f172a', light: '#f1f5f9' };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColors[prefs.theme] || themeColors.dark);
}

window.__applyPrefs = applyPrefs;

function onNavigate(route) {
  const viewFn = views[route.view] || renderHome;
  renderView(viewFn, route.params);
}

applyPrefs();
initRouter(onNavigate);
