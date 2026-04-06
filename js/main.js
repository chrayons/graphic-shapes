/**
 * Layout Practice – draw → feedback → draw loop. No storage.
 */

import * as canvas from './canvas.js';

// ─── State ────────────────────────────────────────────────────────────────────

let round = 1;
let lastFeedbackSections = null;

// ─── Claude API ───────────────────────────────────────────────────────────────

async function getClaudeFeedback(imageDataUrl) {
  const res = await fetch('/api/critique', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Unexpected response format');
  return JSON.parse(match[0]);
}

// ─── Feedback rendering ───────────────────────────────────────────────────────

function renderFeedbackSections(container, sections) {
  container.innerHTML = '';
  if (typeof sections === 'string') {
    const p = document.createElement('p');
    p.textContent = sections;
    container.appendChild(p);
    return;
  }
  sections.forEach((item, idx) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'feedback-section';
    if (idx < sections.length - 1) itemDiv.classList.add('feedback-section--bordered');

    const titleDiv = document.createElement('div');
    titleDiv.className = 'feedback-section-title';

    if (item.status) {
      const statusSpan = document.createElement('span');
      statusSpan.textContent = item.status;
      statusSpan.className = `feedback-status feedback-status--${
        item.status === '✓' ? 'good' : item.status === '✗' ? 'bad' : item.status === '◐' ? 'mid' : 'action'
      }`;
      titleDiv.appendChild(statusSpan);
    }

    const titleSpan = document.createElement('span');
    titleSpan.textContent = item.title;
    titleDiv.appendChild(titleSpan);
    itemDiv.appendChild(titleDiv);

    const contentP = document.createElement('p');
    contentP.className = 'feedback-section-body';
    contentP.textContent = item.content;
    itemDiv.appendChild(contentP);

    container.appendChild(itemDiv);
  });
}

// ─── Fallback math-based feedback ─────────────────────────────────────────────

function getDesignFeedback(shapes) {
  const n = shapes.length;
  if (n === 0) return 'Add at least one shape to get feedback.';

  const CANVAS_W = 360;
  const CANVAS_H = 480;
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;

  const shapeData = shapes.map((s, i) => {
    let area;
    if (s.type === 'circle') area = Math.PI * (s.width / 2) * (s.height / 2);
    else if (s.type === 'triangle') area = (s.width * s.height) / 2;
    else area = s.width * s.height;
    return { ...s, area, index: i, sizeLabel: `${Math.round(s.width)}×${Math.round(s.height)}` };
  });

  const sorted = [...shapeData].sort((a, b) => b.area - a.area);
  const largest = sorted[0];
  const smallest = sorted[sorted.length - 1];
  const totalArea = shapeData.reduce((sum, s) => sum + s.area, 0);
  const largestRatio = largest.area / smallest.area;

  const xs = shapeData.map(s => s.x);
  const ys = shapeData.map(s => s.y);
  const horizontalSpread = Math.max(...xs) - Math.min(...xs);
  const verticalSpread = Math.max(...ys) - Math.min(...ys);
  const spread = Math.max(horizontalSpread, verticalSpread);

  const coverage = totalArea / (CANVAS_W * CANVAS_H);

  const comX = shapeData.reduce((s, sh) => s + sh.x * sh.area, 0) / totalArea;
  const comY = shapeData.reduce((s, sh) => s + sh.y * sh.area, 0) / totalArea;
  const offsetX = comX - cx;
  const offsetY = comY - cy;

  const thirdXs = [CANVAS_W / 3, (CANVAS_W * 2) / 3];
  const thirdYs = [CANVAS_H / 3, (CANVAS_H * 2) / 3];
  const nearThird = (val, thirds, tolerance = 40) => thirds.some(t => Math.abs(val - t) < tolerance);
  const largestNearThirds = nearThird(largest.x, thirdXs) && nearThird(largest.y, thirdYs);
  const largestOnCenter = Math.abs(largest.x - cx) < 50 && Math.abs(largest.y - cy) < 80;

  let diagonalScore = 0;
  if (n >= 3) {
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    const ssxy = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
    const ssx = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
    const ssy = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
    diagonalScore = ssx > 0 && ssy > 0 ? (ssxy * ssxy) / (ssx * ssy) : 0;
  }
  const hasDiagonal = diagonalScore > 0.6;

  let overlapCount = 0;
  for (let i = 0; i < shapeData.length; i++) {
    for (let j = i + 1; j < shapeData.length; j++) {
      const a = shapeData[i], b = shapeData[j];
      const overlapX = Math.abs(a.x - b.x) < (a.width / 2 + b.width / 2) * 0.85;
      const overlapY = Math.abs(a.y - b.y) < (a.height / 2 + b.height / 2) * 0.85;
      if (overlapX && overlapY) overlapCount++;
    }
  }
  const hasOverlap = overlapCount > 0;

  const hasAccent = shapeData.some(s => s.color && !['#4a4a4a', '#333', '#666', '#888', 'gray', 'grey', '#3d3d3d'].includes(s.color?.toLowerCase()));

  const dominanceRatio = largest.area / totalArea;
  const has7030 = dominanceRatio >= 0.55 && dominanceRatio <= 0.85;

  const sections = [];

  let hierarchyContent = '';
  let hierarchyStatus = '✗';
  if (largestRatio >= 6) {
    hierarchyContent = `Strong big/medium/small contrast. Largest (${largest.sizeLabel}) is ${largestRatio.toFixed(0)}× the smallest—clear dominance.`;
    hierarchyStatus = '✓';
  } else if (largestRatio >= 3) {
    const targetW = Math.round(largest.width * 1.5);
    const targetH = Math.round(largest.height * 1.5);
    hierarchyContent = `Decent contrast (${largestRatio.toFixed(1)}×) but push it further. Scale your largest shape to ~${targetW}×${targetH}—the size gap should feel almost uncomfortable.`;
    hierarchyStatus = '◐';
  } else if (largestRatio >= 1.5) {
    const targetW = Math.round(smallest.width * 4);
    const targetH = Math.round(smallest.height * 4);
    hierarchyContent = `Weak hierarchy (${largestRatio.toFixed(1)}× range). Make one shape truly dominate: at least 4× the smallest. A ${targetW}×${targetH} anchor against tiny ${smallest.sizeLabel} accents would read instantly.`;
    hierarchyStatus = '✗';
  } else {
    hierarchyContent = `No hierarchy—all shapes are nearly the same size (~${largest.sizeLabel}). Pick one to be the hero: make it 5–8× bigger than the rest.`;
    hierarchyStatus = '✗';
  }
  sections.push({ title: 'Size Hierarchy', content: hierarchyContent, status: hierarchyStatus });

  let placementContent = '';
  let placementStatus = '◐';
  if (largestNearThirds) {
    placementContent = `Dominant shape sits near a rule-of-thirds intersection—that's why it feels placed rather than dropped. The ${Math.abs(offsetX) > 30 ? 'off-center weight creates dynamic tension' : 'centered weight creates stability'}.`;
    placementStatus = '✓';
  } else if (largestOnCenter) {
    placementContent = `Dominant shape (${largest.sizeLabel}) is dead center—safe but static. Shift it to a thirds intersection: try x=${Math.round(CANVAS_W / 3)}px or x=${Math.round((CANVAS_W * 2) / 3)}px.`;
    placementStatus = '◐';
  } else {
    const nearestThirdX = thirdXs.reduce((a, b) => Math.abs(b - largest.x) < Math.abs(a - largest.x) ? b : a);
    const nearestThirdY = thirdYs.reduce((a, b) => Math.abs(b - largest.y) < Math.abs(a - largest.y) ? b : a);
    placementContent = `Anchor at (${Math.round(largest.x)}, ${Math.round(largest.y)})—not in a power zone. Try snapping to (${Math.round(nearestThirdX)}, ${Math.round(nearestThirdY)}).`;
    placementStatus = '◐';
  }
  sections.push({ title: 'Placement & Thirds', content: placementContent, status: placementStatus });

  let tensionContent = '';
  let tensionStatus = '◐';
  const tensionPoints = [];
  if (hasDiagonal) { tensionPoints.push(`diagonal axis—shapes imply movement`); tensionStatus = '✓'; }
  if (hasOverlap) { tensionPoints.push(`${overlapCount} overlapping pair${overlapCount > 1 ? 's' : ''}—creates depth`); tensionStatus = tensionStatus === '✓' ? '✓' : '◐'; }
  if (has7030) { tensionPoints.push(`70/30 weight split (${Math.round(dominanceRatio * 100)}% dominant)—strong contrast`); tensionStatus = '✓'; }

  if (tensionPoints.length >= 2) {
    tensionContent = `Good tension: ${tensionPoints.join(' and ')}. The composition has energy.`;
  } else if (tensionPoints.length === 1) {
    tensionContent = `Some tension via ${tensionPoints[0]}.`;
    if (!hasDiagonal && n >= 3) tensionContent += ` Arrange shapes along a diagonal for more action.`;
    if (!hasOverlap) tensionContent += ` Let shapes overlap—isolated shapes feel timid.`;
    if (!has7030) tensionContent += ` Aim for a 70/30 weight split.`;
  } else {
    const issues = [];
    if (!hasDiagonal) issues.push(`no diagonal`);
    if (!hasOverlap) issues.push(`no overlap`);
    if (!has7030) issues.push(`no 70/30 split`);
    tensionContent = `Low tension: ${issues.join(', ')}. Place shapes on a diagonal, let at least one pair overlap, and let your dominant shape claim ~70% of total visual weight.`;
    tensionStatus = '✗';
  }
  sections.push({ title: 'Tension & Movement', content: tensionContent, status: tensionStatus });

  const usedSpace = Math.round(coverage * 100);
  let spaceContent = '';
  let spaceStatus = '◐';
  if (coverage < 0.12) {
    spaceContent = `Very sparse (${usedSpace}% filled). Cluster shapes into one zone so the empty space becomes an intentional void rather than just emptiness.`;
    spaceStatus = '◐';
  } else if (coverage < 0.30) {
    spaceContent = `Good tension between filled and empty (${usedSpace}% filled). Negative space is doing work—it makes the shapes feel considered.`;
    spaceStatus = '✓';
  } else if (coverage < 0.50) {
    spaceContent = `Getting tight (${usedSpace}% filled). Try removing the smallest shape—negative space is a compositional element, not leftover area.`;
    spaceStatus = '◐';
  } else {
    spaceContent = `Overcrowded (${usedSpace}% filled). Remove shapes until you're under 30% coverage, then re-evaluate.`;
    spaceStatus = '✗';
  }
  sections.push({ title: 'Negative Space', content: spaceContent, status: spaceStatus });

  const directives = [];
  if (largestRatio < 3) {
    const bigTarget = Math.round(Math.sqrt(totalArea * 0.6));
    directives.push(`Make one shape undeniably the biggest—try ${bigTarget * 2}×${Math.round(bigTarget * 1.3)} while keeping your smallest under ${smallest.sizeLabel}.`);
  }
  if (!largestNearThirds) {
    const tx = thirdXs[largest.x > cx ? 1 : 0];
    const ty = thirdYs[largest.y > cy ? 1 : 0];
    directives.push(`Snap your anchor shape to a thirds intersection at approximately (${Math.round(tx)}, ${Math.round(ty)}).`);
  }
  if (!hasDiagonal && n >= 3) {
    directives.push(`Arrange shapes along a diagonal—big upper-left, small lower-right (or reverse).`);
  }
  if (!hasOverlap) {
    directives.push(`Let shapes overlap. Even 10–20% overlap creates depth and makes the layout feel like a system.`);
  }
  if (Math.abs(offsetX) < 40 && Math.abs(offsetY) < 40) {
    directives.push(`Push the center of gravity off to one side—deliberate imbalance creates more energy than symmetry.`);
  }
  if (spread > 250 && largestRatio < 3) {
    directives.push(`Shapes are spread out but nothing anchors the composition. Establish one dominant shape that the others orbit.`);
  }
  if (!hasAccent && n >= 3) {
    directives.push(`Introduce one accent color on the smallest shape—a single pop among neutrals draws the eye instantly.`);
  }

  const directivesText = directives.length > 0
    ? directives.slice(0, 3).map((d, i) => `${i + 1}. ${d}`).join('\n')
    : `Strong bones. Push further: let shapes bleed off the edge, or add a tiny accent shape far from the main cluster.`;

  sections.push({ title: 'Directives', content: directivesText, status: '→' });

  return sections;
}

// ─── Views ────────────────────────────────────────────────────────────────────

function showPractice() {
  document.getElementById('view-practice').classList.remove('hidden');
  document.getElementById('view-feedback').classList.add('hidden');
}

function showFeedback() {
  document.getElementById('view-practice').classList.add('hidden');
  document.getElementById('view-feedback').classList.remove('hidden');
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submitLayout() {
  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = 'Analyzing…';

  const imageDataUrl = canvas.exportImageDataUrl();
  const shapes = canvas.getShapes();

  // Show the submitted image in feedback view
  const imageWrap = document.getElementById('feedback-image-wrap');
  imageWrap.innerHTML = '';
  const img = document.createElement('img');
  img.src = imageDataUrl;
  img.alt = 'Your layout';
  img.className = 'feedback-submitted-img';
  imageWrap.appendChild(img);

  // Show feedback view with loading state
  const critique = document.getElementById('feedback-critique');
  critique.innerHTML = '<p class="feedback-loading">Analyzing composition…</p>';
  showFeedback();

  try {
    lastFeedbackSections = await getClaudeFeedback(imageDataUrl);
  } catch (_err) {
    lastFeedbackSections = getDesignFeedback(shapes);
  }

  renderFeedbackSections(critique, lastFeedbackSections);

  btn.textContent = 'Submit';
  btn.disabled = false;
}

// ─── Draw Again ───────────────────────────────────────────────────────────────

function startNextRound() {
  round += 1;
  document.getElementById('round-label').textContent = `Round ${round}`;

  canvas.newChallenge();

  // Populate the last-feedback panel
  if (lastFeedbackSections) {
    const wrap = document.getElementById('last-feedback-wrap');
    const body = document.getElementById('last-feedback-body');
    renderFeedbackSections(body, lastFeedbackSections);
    wrap.classList.remove('hidden');
    // Collapse it by default so it doesn't crowd the canvas
    body.classList.add('hidden');
    document.getElementById('btn-toggle-feedback').querySelector('.feedback-toggle-arrow').textContent = '▾';
  }

  showPractice();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  canvas.initCanvas(
    document.getElementById('canvas-container'),
    document.getElementById('design-canvas'),
  );
  canvas.newChallenge();

  document.getElementById('btn-submit').addEventListener('click', async () => {
    await submitLayout();
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    startNextRound();
  });

  document.getElementById('btn-toggle-feedback').addEventListener('click', () => {
    const body = document.getElementById('last-feedback-body');
    const arrow = document.querySelector('.feedback-toggle-arrow');
    const isHidden = body.classList.toggle('hidden');
    arrow.textContent = isHidden ? '▾' : '▴';
  });
}

init();
