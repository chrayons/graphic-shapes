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
    
    const feedbackSections = getDesignFeedback(layout);
    
    // If feedback is a string (empty state), render as-is
    if (typeof feedbackSections === 'string') {
      const p = document.createElement('p');
      p.textContent = feedbackSections;
      section.appendChild(p);
    } else {
      // Render structured feedback sections
      const feedbackContainer = document.createElement('div');
      feedbackContainer.className = 'feedback-critique';
      
      feedbackSections.forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'feedback-section';
        itemDiv.style.marginBottom = '1rem';
        itemDiv.style.paddingBottom = '1rem';
        if (idx < feedbackSections.length - 1) {
          itemDiv.style.borderBottom = '1px solid #f0f0f0';
        }
        
        const titleDiv = document.createElement('div');
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.gap = '0.5rem';
        titleDiv.style.marginBottom = '0.5rem';
        
        if (item.status) {
          const statusSpan = document.createElement('span');
          statusSpan.textContent = item.status;
          statusSpan.style.fontSize = '1.2rem';
          statusSpan.style.fontWeight = 'bold';
          statusSpan.style.minWidth = '1.5rem';
          
          if (item.status === '✓') {
            statusSpan.style.color = '#4CAF50';
          } else if (item.status === '✗') {
            statusSpan.style.color = '#FF6B6B';
          } else if (item.status === '◐') {
            statusSpan.style.color = '#FFA500';
          } else if (item.status === '→') {
            statusSpan.style.color = '#2196F3';
          }
          titleDiv.appendChild(statusSpan);
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = item.title;
        titleSpan.style.fontWeight = 'bold';
        titleSpan.style.fontSize = '0.95rem';
        titleDiv.appendChild(titleSpan);
        
        itemDiv.appendChild(titleDiv);
        
        const contentP = document.createElement('p');
        contentP.textContent = item.content;
        contentP.style.margin = '0';
        contentP.style.fontSize = '0.9rem';
        contentP.style.lineHeight = '1.5';
        contentP.style.color = '#555';
        itemDiv.appendChild(contentP);
        
        feedbackContainer.appendChild(itemDiv);
      });
      
      section.appendChild(feedbackContainer);
    }
    
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

  // Calculate areas
  const areas = shapes.map((s) => {
    if (s.type === 'circle') return Math.PI * (s.width / 2) * (s.height / 2);
    if (s.type === 'triangle') return (s.width * s.height) / 2;
    return s.width * s.height;
  });
  const totalArea = areas.reduce((a, b) => a + b, 0);
  const maxArea = Math.max(...areas);
  const minArea = Math.min(...areas);
  const sizeRatio = maxArea / minArea;
  const avgArea = totalArea / n;

  // Hierarchy
  const sizeVariance = areas.reduce((sum, a) => sum + (a - avgArea) ** 2, 0) / n;
  const hasStrongHierarchy = sizeRatio >= 2 && sizeVariance > 0.15 * avgArea * avgArea;
  const hierarchyScore = Math.min(sizeRatio / 3, 1); // 0-1

  // Balance & Asymmetry
  const comX = shapes.reduce((s, sh, i) => s + sh.x * areas[i], 0) / totalArea;
  const comY = shapes.reduce((s, sh, i) => s + sh.y * areas[i], 0) / totalArea;
  const offsetX = Math.abs(comX - cx);
  const offsetY = Math.abs(comY - cy);
  const distanceFromCenter = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  const maxDistance = Math.sqrt(cx * cx + cy * cy);
  const asymmetryScore = Math.min(distanceFromCenter / (maxDistance * 0.3), 1); // 0-1

  // Density
  const densityRatio = totalArea / (CANVAS_W * CANVAS_H);

  // Type variety
  const types = new Set(shapes.map(s => s.type));
  const hasTypeVariety = types.size > 1;

  // Generate structured feedback
  const sections = [];

  // 1. Observation (what they have)
  const typeList = Array.from(types).join(', ');
  sections.push({
    title: 'What you built',
    content: `${n} ${n === 1 ? 'shape' : 'shapes'} (${typeList}) with ${densityRatio < 0.2 ? 'plenty of breathing room' : densityRatio < 0.4 ? 'balanced density' : 'tight packing'}.`
  });

  // 2. Visual Hierarchy
  if (hasStrongHierarchy) {
    sections.push({
      title: 'Visual Hierarchy',
      content: 'Strong hierarchy: You have clear size differences. One or two elements command attention.',
      status: '✓'
    });
  } else if (sizeRatio > 1.3) {
    sections.push({
      title: 'Visual Hierarchy',
      content: `Moderate hierarchy. Your size range is ${sizeRatio.toFixed(1)}:1. Push further—make your hero element at least 3x the size of supporting shapes.`,
      status: '◐'
    });
  } else {
    sections.push({
      title: 'Visual Hierarchy',
      content: 'No clear hierarchy. All shapes are similar sizes. Choose ONE element to dominate.',
      status: '✗'
    });
  }

  // 3. Balance & Asymmetry
  if (asymmetryScore > 0.5) {
    sections.push({
      title: 'Balance & Tension',
      content: 'Strong asymmetry: Composition is deliberately off-center, creating dynamic tension.',
      status: '✓'
    });
  } else if (asymmetryScore > 0.2) {
    sections.push({
      title: 'Balance & Tension',
      content: 'Subtle asymmetry. The center of mass is slightly off-center—good instinct. Push it further.',
      status: '◐'
    });
  } else {
    sections.push({
      title: 'Balance & Tension',
      content: 'Centered and balanced. This is safe, but static. Try moving your main element to one side.',
      status: '✗'
    });
  }

  // 4. Focusing Mechanism
  if (hasStrongHierarchy) {
    sections.push({
      title: 'Focal Point',
      content: 'Clear entry point: Users immediately know where to look.',
      status: '✓'
    });
  } else if (n === 1) {
    sections.push({
      title: 'Focal Point',
      content: 'Single element. Add supporting shapes to create a narrative.',
      status: '◐'
    });
  } else {
    sections.push({
      title: 'Focal Point',
      content: `${n} shapes compete equally for attention. Help the eye find one primary focus.`,
      status: '✗'
    });
  }

  // 5. Type Diversity
  if (hasTypeVariety && n >= 3) {
    sections.push({
      title: 'Shape Variety',
      content: `Nice: Mix of ${Array.from(types).join(' and ')}. Variety prevents monotony.`,
      status: '✓'
    });
  } else if (hasTypeVariety) {
    sections.push({
      title: 'Shape Variety',
      content: `You're mixing shapes. Good instinct. Add more elements to make the variety feel intentional.`,
      status: '◐'
    });
  } else {
    sections.push({
      title: 'Shape Variety',
      content: `All ${Array.from(types)[0]}s. Consider adding a second shape type for visual interest.`,
      status: '◐'
    });
  }

  // 6. Actionable next step
  let nextStep = '';
  if (!hasStrongHierarchy && asymmetryScore < 0.3) {
    nextStep = 'Next: Make one shape much larger and move it to the right or bottom.';
  } else if (!hasStrongHierarchy) {
    nextStep = 'Next: Increase your size range. Make the hero 3x+ the supporting elements.';
  } else if (asymmetryScore < 0.3) {
    nextStep = 'Next: Shift the composition off-center for more dynamic tension.';
  } else {
    nextStep = 'Your composition is strong. Challenge yourself: add a small accent shape to disrupt the balance.';
  }
  sections.push({
    title: 'Next Step',
    content: nextStep,
    status: '→'
  });

  return sections;
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
  const canvasEl = document.getElementById('design-canvas');
  canvas.initCanvas(container, canvasEl);

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
