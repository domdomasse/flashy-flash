let onNavigate = null;

export function initRouter(callback) {
  onNavigate = callback;
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

export function navigate(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  const raw = window.location.hash.slice(1) || '';
  const [path, query] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');

  let route;

  if (segments.length === 0) {
    route = { view: 'home', params: {} };
  } else if (segments[0] === 'settings') {
    route = { view: 'settings', params: {} };
  } else if (segments[0] === 'search') {
    route = { view: 'search', params: { q: params.get('q') || '' } };
  } else if (segments[0] === 'allcards') {
    route = { view: 'allcards', params: { filter: params.get('filter') || 'all' } };
  } else if (segments.length === 1) {
    route = { view: 'subject', params: { subject: segments[0] } };
  } else if (segments[1] === 'glossary') {
    route = { view: 'glossary', params: { subject: segments[0] } };
  } else {
    route = {
      view: 'chapter',
      params: {
        subject: segments[0],
        chapter: segments[1],
        tab: segments[2] || 'cours'
      }
    };
  }

  if (onNavigate) onNavigate(route);
}
