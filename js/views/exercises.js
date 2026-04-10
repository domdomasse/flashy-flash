import { getChapterData } from '../data.js';
import { getPrefs } from '../store.js';
import { el, onCleanup } from '../render.js';
import { icon } from '../icons.js';
import { buildBackToTop } from '../services/toc.js';
import { renderMarkdown } from '../utils/markdown.js';
import { createTimer } from '../services/timer.js';

function createRevealable(label, content) {
  const contentEl = el('div', { class: 'exercise-hidden-content' });
  const textEl = el('div', { class: 'summary-text' });
  textEl.appendChild(renderMarkdown(content));
  contentEl.appendChild(textEl);

  const btn = el('button', { class: 'exercise-reveal-btn' },
    el('span', { class: 'arrow' }, icon('chevron-right', 14)),
    el('span', {}, label)
  );
  btn.addEventListener('click', () => {
    const open = contentEl.classList.toggle('visible');
    btn.classList.toggle('open', open);
  });
  return el('div', {}, btn, contentEl);
}

export async function renderExercisesTab(container, subjectId, chapterId) {
  const data = await getChapterData(subjectId, chapterId, 'exercises');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, icon('pencil', 32)),
      el('p', {}, 'Exercices non disponibles.')
    ));
    return;
  }

  const prefs = getPrefs();
  const timers = [];

  for (const exo of data.exercises) {
    const card = el('div', { class: 'exercise-card' });

    // Header with optional timer
    const typeLabels = { composition: 'Composition', croquis: 'Croquis', etude: 'Étude de doc' };
    const headerLeft = el('span', { class: 'exercise-type' }, typeLabels[exo.type] || exo.type);
    const headerRight = el('span', { class: 'exercise-duration' }, icon('clock', 14), ` ${exo.duration} min`);
    card.appendChild(el('div', { class: 'exercise-header' }, headerLeft, headerRight));

    // Title + subject
    card.appendChild(el('div', { class: 'exercise-title' }, exo.title));
    card.appendChild(el('div', { class: 'exercise-subject' }, `« ${exo.subject} »`));

    // Timer (if enabled in prefs)
    if (prefs.timer && exo.duration) {
      const timerDisplay = el('span', { class: 'timer-display' }, `${String(exo.duration).padStart(2, '0')}:00`);
      const btnStart = el('button', { class: 'timer-btn start' }, icon('play', 14), ' Lancer');
      const btnStop = el('button', { class: 'timer-btn stop', style: 'display:none' }, icon('square', 14), ' Arrêter');
      const btnResetTimer = el('button', { class: 'timer-btn reset', style: 'display:none' }, icon('rotate-ccw', 14));

      const timer = createTimer(exo.duration,
        (formatted, urgent) => {
          timerDisplay.textContent = formatted;
          timerDisplay.classList.toggle('urgent', urgent);
        },
        () => { timerDisplay.classList.add('ended'); timerDisplay.textContent = "Temps écoulé !"; }
      );
      timers.push(timer);

      btnStart.addEventListener('click', () => {
        timer.start();
        btnStart.style.display = 'none';
        btnStop.style.display = '';
        btnResetTimer.style.display = '';
      });
      btnStop.addEventListener('click', () => {
        timer.stop();
        btnStart.style.display = '';
        btnStop.style.display = 'none';
      });
      btnResetTimer.addEventListener('click', () => {
        timer.reset();
        btnStart.style.display = '';
        btnStop.style.display = 'none';
        timerDisplay.classList.remove('urgent', 'ended');
      });

      card.appendChild(el('div', { class: 'timer-bar' }, timerDisplay, btnStart, btnStop, btnResetTimer));
    }

    // Revealables
    if (exo.tips?.length > 0) {
      card.appendChild(createRevealable('Conseils méthodologiques', exo.tips.map(t => `- ${t}`).join('\n')));
    }
    if (exo.outline) {
      card.appendChild(createRevealable('Plan détaillé (corrigé)', exo.outline));
    }
    container.appendChild(card);
  }

  container.appendChild(buildBackToTop());

  // Cleanup timers on navigation
  onCleanup(() => timers.forEach(t => t.stop()));
}
