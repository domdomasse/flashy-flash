import { getChapterData } from '../data.js';
import { el } from '../render.js';

const TYPE_ICONS = {
  video: '🎬',
  article: '📄',
  podcast: '🎙️',
  book: '📚',
  tool: '🛠️'
};

export async function renderResourcesTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'resources');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, '🔗'),
      el('p', {}, 'Ressources non disponibles.')
    ));
    return;
  }

  for (const res of data.resources) {
    const icon = TYPE_ICONS[res.type] || '🔗';
    let metaParts = [];
    if (res.type) metaParts.push(res.type === 'video' ? 'Vidéo' : res.type === 'article' ? 'Article' : res.type);
    if (res.duration) metaParts.push(res.duration);

    const card = el('a', {
      class: 'resource-card',
      href: res.url,
      target: '_blank',
      rel: 'noopener noreferrer'
    },
      el('span', { class: 'resource-icon' }, icon),
      el('div', { class: 'resource-info' },
        el('div', { class: 'resource-title' }, res.title),
        metaParts.length > 0 ? el('div', { class: 'resource-meta' }, metaParts.join(' · ')) : false,
        res.description ? el('div', { class: 'resource-desc' }, res.description) : false
      ),
      el('span', { class: 'resource-arrow' }, '→')
    );

    container.appendChild(card);
  }
}
