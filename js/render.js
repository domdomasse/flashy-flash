const app = document.getElementById('app');
const cleanups = [];

export function onCleanup(fn) {
  cleanups.push(fn);
}

export async function renderView(viewFn, params) {
  while (cleanups.length) cleanups.pop()();
  app.style.opacity = '0';
  await new Promise(r => setTimeout(r, 100));
  app.innerHTML = '';
  try {
    await viewFn(app, params);
  } catch (err) {
    console.error('[Flashy Flash]', err);
    app.appendChild(el('div', { style: 'text-align:center;padding:60px 20px;color:#f43f5e;' },
      el('p', { style: 'font-size:1.5rem;margin-bottom:8px;' }, '⚠️'),
      el('p', {}, 'Erreur de chargement.'),
      el('p', { style: 'font-size:0.8rem;color:#94a3b8;margin-top:8px;' }, String(err))
    ));
  }
  app.style.opacity = '1';
  window.scrollTo(0, 0);
}

export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') element.className = value;
    else if (key === 'style') element.style.cssText = value;
    else if (key === 'html') element.innerHTML = value;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (['checked', 'disabled', 'readOnly', 'selected'].includes(key)) element[key] = value;
    else element.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else element.appendChild(child);
  }
  return element;
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('visible');
  void toast.offsetWidth; // force reflow for re-trigger
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2200);
}
