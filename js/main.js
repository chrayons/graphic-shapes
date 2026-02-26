/**
 * Layout Practice – main app. Local only, no accounts.
 */

import * as storage from './storage.js';
import * as canvas from './canvas.js';

const LAYOUTS_PER_DAY = 3;

const views = {
  home: document.getElementById('view-home'),
  canvas: document.getElementById('view-canvas'),
  gallery: document.getElementById('view-gallery'),
  feedback: document.getElementById('view-feedback'),
};

function showView(id) {
  Object.keys(views).forEach((key) => {
    views[key].classList.toggle('hidden', key !== id);
  });
}

function getTodayLayouts() {
  return storage.getTodayLayouts();
}

function getNextLayoutIndex() {
  const today = getTodayLayouts();
  for (let i = 0; i < LAYOUTS_PER_DAY; i++) {
    if (!today.find((l) => l.index === i)) return i;
  }
  return null; // all 3 done
}

function updateHomeUI() {
  const today = getTodayLayouts();
  const done = today.length;
  const progressEl = document.getElementById('home-progress');
  const statusEl = document.getElementById('home-status');
  progressEl.innerHTML = '';
  for (let i = 0; i < LAYOUTS_PER_DAY; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i < done ? ' done' : '');
    progressEl.appendChild(dot);
  }
  statusEl.textContent = `${done} of ${LAYOUTS_PER_DAY} layouts done`;
  const btnStart = document.getElementById('btn-start');
  if (done >= LAYOUTS_PER_DAY) {
    btnStart.textContent = "Today's 3 done – view feedback";
    btnStart.dataset.action = 'feedback';
  } else {
    btnStart.textContent = done === 0 ? 'Start layout' : 'Next layout';
    btnStart.dataset.action = 'canvas';
  }
}

function startLayout() {
  const next = getNextLayoutIndex();
  if (next === null) {
    showFeedbackView();
    return;
  }
  currentLayoutIndex = next;
  document.getElementById('canvas-title').textContent = `Layout ${next + 1} of ${LAYOUTS_PER_DAY}`;
  canvas.newChallenge();
  showView('canvas');
}

function showFeedbackView() {
  const today = getTodayLayouts();
  const content = document.getElementById('feedback-content');
  content.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = "Today's layouts";
  title.style.marginTop = '0';
  content.appendChild(title);
  today.forEach((layout, i) => {
    const section = document.createElement('div');
    section.className = 'feedback-item';
    const h4 = document.createElement('h4');
    h4.textContent = `Layout ${i + 1}`;
    section.appendChild(h4);
    if (layout.imageData) {
      const img = document.createElement('img');
      img.src = layout.imageData;
      img.alt = `Layout ${i + 1}`;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '6px';
      img.style.marginBottom = '0.5rem';
      section.appendChild(img);
    }
    const p = document.createElement('p');
    p.textContent = getDesignFeedback(layout);
    section.appendChild(p);
    content.appendChild(section);
  });
  showView('feedback');
}

function getDesignFeedback(layout) {
  const shapes = layout.shapes ?? [];
  const n = shapes.length;
  if (n === 0) return 'Add at least one shape to get feedback.';
  const CANVAS_W = 360;
  const CANVAS_H = 480;
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;

  const areas = shapes.map((s) => {
    if (s.type === 'circle') return Math.PI * (s.width / 2) * (s.height / 2);
    if (s.type === 'triangle') return (s.width * s.height) / 2;
    return s.width * s.height;
  });
  const totalArea = areas.reduce((a, b) => a + b, 0);
  const maxArea = Math.max(...areas);
  const sizeRatio = maxArea / (totalArea / n || 1);

  const sizeVariance = areas.reduce((sum, a) => sum + (a - totalArea / n) ** 2, 0) / n;
  const hasHierarchy = sizeRatio >= 1.5 || sizeVariance > 0.2 * totalArea * totalArea;

  const comX = shapes.reduce((s, sh, i) => s + sh.x * areas[i], 0) / totalArea;
  const comY = shapes.reduce((s, sh, i) => s + sh.y * areas[i], 0) / totalArea;
  const offsetX = Math.abs(comX - cx) / cx;
  const offsetY = Math.abs(comY - cy) / cy;
  const asymmetry = offsetX > 0.15 || offsetY > 0.15;

  const tips = [];
  if (!hasHierarchy) tips.push('Try giving one element clear dominance (size or weight) for stronger visual hierarchy.');
  if (!asymmetry) tips.push('Shifting the balance off-center can create more dynamic asymmetry.');
  if (hasHierarchy && asymmetry) tips.push('Strong hierarchy and asymmetry—nice work.');
  tips.push('Black on white gives strong contrast; use it to define focal points.');

  return tips.join(' ');
}

let currentLayoutIndex = 0;

async function submitLayout() {
  const imageData = await canvas.exportImageDataUrl();
  const layout = {
    date: storage.getTodayKey(),
    index: currentLayoutIndex,
    shapes: canvas.getShapes(),
    imageData: imageData || undefined,
  };
  storage.saveLayout(layout);
  const next = getNextLayoutIndex();
  if (next === null) {
    showFeedbackView();
    return;
  }
  currentLayoutIndex = next;
  document.getElementById('canvas-title').textContent = `Layout ${next + 1} of ${LAYOUTS_PER_DAY}`;
  canvas.newChallenge();
}

function renderGallery() {
  const list = document.getElementById('gallery-list');
  list.innerHTML = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'gallery-toolbar';
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn btn-secondary small';
  exportBtn.textContent = 'Export backup';
  exportBtn.style.marginRight = '0.5rem';
  exportBtn.addEventListener('click', () => {
    const data = storage.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `layout-practice-backup-${storage.getTodayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'btn btn-secondary small';
  importBtn.textContent = 'Import backup';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (storage.importAllData(reader.result)) {
        renderGallery();
        updateHomeUI();
      } else {
        alert('Invalid backup file.');
      }
      input.value = '';
    };
    reader.readAsText(file);
  });
  importBtn.addEventListener('click', () => input.click());
  toolbar.appendChild(exportBtn);
  toolbar.appendChild(importBtn);
  list.appendChild(toolbar);

  const all = storage.loadAllLayouts();
  if (all.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No layouts yet. Complete 3 layouts today to start your gallery.';
    empty.style.color = 'var(--muted)';
    list.appendChild(empty);
    return;
  }

  all.forEach((day) => {
    const section = document.createElement('div');
    section.className = 'gallery-day';
    const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const h3 = document.createElement('h3');
    h3.textContent = dateLabel;
    section.appendChild(h3);
    const trio = document.createElement('div');
    trio.className = 'gallery-trio';
    for (let i = 0; i < LAYOUTS_PER_DAY; i++) {
      const layout = day.layouts.find((l) => l.index === i);
      const cell = document.createElement('div');
      if (layout?.imageData) {
        const img = document.createElement('img');
        img.src = layout.imageData;
        img.alt = `Layout ${i + 1}`;
        cell.appendChild(img);
      } else {
        cell.classList.add('gallery-placeholder');
        cell.textContent = '—';
      }
      trio.appendChild(cell);
    }
    section.appendChild(trio);
    list.appendChild(section);
  });
}

function init() {
  const container = document.getElementById('canvas-container');
  const svg = document.getElementById('design-svg');
  canvas.initCanvas(container, svg);

  document.getElementById('btn-start').addEventListener('click', () => {
    if (document.getElementById('btn-start').dataset.action === 'feedback') {
      showFeedbackView();
    } else {
      startLayout();
    }
  });
  document.getElementById('btn-gallery').addEventListener('click', () => {
    renderGallery();
    showView('gallery');
  });
  document.getElementById('btn-back-canvas').addEventListener('click', () => {
    showView('home');
    updateHomeUI();
  });
  document.getElementById('btn-submit').addEventListener('click', async () => {
    await submitLayout();
  });
  document.getElementById('btn-back-gallery').addEventListener('click', () => {
    showView('home');
  });
  document.getElementById('btn-back-feedback').addEventListener('click', () => {
    showView('home');
    updateHomeUI();
  });
  document.getElementById('btn-done-feedback').addEventListener('click', () => {
    showView('home');
    updateHomeUI();
  });

  updateHomeUI();
}

init();
