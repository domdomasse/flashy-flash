import { getPrefs, setPref, exportData, importData, resetAll } from '../store.js';
import { el } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

const FONT_SIZES = [
  { value: 0.85, label: 'Petit' },
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Grand' },
  { value: 1.3, label: 'Très grand' }
];

function createToggle(label, sublabel, checked, onChange) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return el('div', { class: 'toggle-row' },
    el('div', {},
      el('div', { class: 'label' }, label),
      el('div', { class: 'sublabel' }, sublabel)
    ),
    el('label', { class: 'toggle' }, input, el('span', { class: 'slider' }))
  );
}

export async function renderSettings(container) {
  const prefs = getPrefs();

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => history.back(), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    el('h1', {}, 'Réglages')
  );

  // ── Appearance ──
  const themeToggle = createToggle('Mode clair', "Changer l'apparence du site",
    prefs.theme === 'light',
    (checked) => { setPref('theme', checked ? 'light' : 'dark'); window.__applyPrefs(); }
  );

  let fontIdx = FONT_SIZES.findIndex(f => f.value === prefs.fontSize);
  if (fontIdx === -1) fontIdx = 1;
  const fontLabel = el('span', { class: 'value' }, FONT_SIZES[fontIdx].label);
  const updateFont = (delta) => {
    fontIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, fontIdx + delta));
    fontLabel.textContent = FONT_SIZES[fontIdx].label;
    setPref('fontSize', FONT_SIZES[fontIdx].value);
    window.__applyPrefs();
  };
  const fontRow = el('div', { class: 'toggle-row' },
    el('div', {},
      el('div', { class: 'label' }, 'Taille du texte'),
      el('div', { class: 'sublabel' }, "Ajuster la taille de l'affichage")
    ),
    el('div', { class: 'font-size-control' },
      el('button', { onClick: () => updateFont(-1) }, 'A-'),
      fontLabel,
      el('button', { onClick: () => updateFont(1) }, 'A+')
    )
  );

  const appearance = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Apparence'),
    themeToggle, fontRow
  );

  // ── Features ──
  const spacedToggle = createToggle('Répétition espacée',
    'Les cartes ratées reviennent plus souvent',
    prefs.spacedRepetition,
    (checked) => setPref('spacedRepetition', checked)
  );
  const timerToggle = createToggle("Chronomètre d'examen",
    'Afficher un chrono sur les exercices type bac',
    prefs.timer,
    (checked) => setPref('timer', checked)
  );

  const features = el('div', { class: 'section', style: 'margin-top: 24px' },
    el('div', { class: 'section-title' }, 'Fonctionnalités'),
    spacedToggle, timerToggle
  );

  // ── Data management ──
  const btnExport = el('button', { class: 'settings-btn', onClick: () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'flashmob-progression.json';
    a.click();
    URL.revokeObjectURL(url);
  }}, icon('download', 16), ' Exporter ma progression');

  const btnImport = el('button', { class: 'settings-btn', onClick: () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.json';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (importData(reader.result)) {
          window.__applyPrefs();
          alert('Progression restaurée !');
          navigate('settings'); // refresh view
        } else {
          alert('Fichier invalide.');
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  }}, icon('upload', 16), ' Importer une progression');

  const btnResetAll = el('button', { class: 'settings-btn danger', onClick: () => {
    if (confirm('Effacer TOUTE ta progression et tes réglages ?')) {
      resetAll();
      window.__applyPrefs();
      navigate('');
    }
  }}, icon('trash-2', 16), ' Tout effacer');

  const dataSection = el('div', { class: 'section', style: 'margin-top: 24px' },
    el('div', { class: 'section-title' }, 'Mes données'),
    el('div', { class: 'settings-btn-group' }, btnExport, btnImport, btnResetAll)
  );

  const view = el('div', { class: 'view' });
  view.append(topbar, appearance, features, dataSection);
  container.appendChild(view);
}
