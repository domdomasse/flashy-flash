// Lucide icon helper — creates <i data-lucide="name"> elements
// After rendering a view, call refreshIcons() to replace them with SVGs.

export function icon(name, size = 20) {
  const i = document.createElement('i');
  i.setAttribute('data-lucide', name);
  i.style.width = size + 'px';
  i.style.height = size + 'px';
  return i;
}

export function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
