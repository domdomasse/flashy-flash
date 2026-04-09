let catalog = null;
const cache = {};

export async function getCatalog() {
  if (!catalog) {
    const res = await fetch('data/index.json');
    catalog = await res.json();
  }
  return catalog;
}

export async function getSubject(subjectId) {
  const cat = await getCatalog();
  return cat.subjects.find(s => s.id === subjectId) || null;
}

export async function getChapterData(subjectId, chapterId, type) {
  const key = `${subjectId}/${chapterId}/${type}`;
  if (!cache[key]) {
    const res = await fetch(`data/${subjectId}/${chapterId}/${type}.json`);
    if (!res.ok) return null;
    cache[key] = await res.json();
  }
  return cache[key];
}

/**
 * Load cards for a chapter, with caching.
 * Returns { categories: [...], cards: [...] } or null.
 */
export async function getChapterCards(subjectId, chapterId) {
  return getChapterData(subjectId, chapterId, 'cards');
}

/**
 * Load cards for all chapters in the given subjects.
 * Returns flat array of { card, cardId, subject, chapter, catLabel }.
 */
export async function getAllCards(subjects) {
  const allItems = [];
  for (const subject of subjects) {
    for (const chapter of subject.chapters) {
      const data = await getChapterCards(subject.id, chapter.id);
      if (!data) continue;
      const catMap = {};
      for (const cat of data.categories) catMap[cat.id] = cat.label;
      for (const card of data.cards) {
        allItems.push({
          card,
          cardId: `${subject.id}/${chapter.id}/${card.id}`,
          subject, chapter,
          catLabel: catMap[card.cat] || card.cat
        });
      }
    }
  }
  return allItems;
}
