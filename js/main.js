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

  const dominanceRatio = largest.area / totalArea;
  const has7030 = dominanceRatio >= 0.55 && dominanceRatio <= 0.85;

  const sections = [];

  // 1. Emphasis — is there a clear focal point?
  let emphasisContent = '';
  let emphasisStatus = '✗';
  if (largestRatio >= 6) {
    emphasisContent = `Emphasis is working. The largest shape (${largest.sizeLabel}) is ${largestRatio.toFixed(0)}× the smallest—the eye has no choice but to land there first. Clear primary → accent hierarchy.`;
    emphasisStatus = '✓';
  } else if (largestRatio >= 3) {
    const targetW = Math.round(largest.width * 1.5);
    const targetH = Math.round(largest.height * 1.5);
    emphasisContent = `Emphasis is present but not decisive (${largestRatio.toFixed(1)}× size range). The dominant shape reads as slightly bigger, not unmistakably primary. Scale it to ~${targetW}×${targetH} so the hierarchy is instant—not something the viewer has to deduce.`;
    emphasisStatus = '◐';
  } else if (largestRatio >= 1.5) {
    const targetW = Math.round(smallest.width * 4);
    const targetH = Math.round(smallest.height * 4);
    emphasisContent = `Emphasis is failing (${largestRatio.toFixed(1)}× range). All shapes compete for attention—none wins. Establish one focal point: make the largest shape at least 4× the area of the smallest. A ${targetW}×${targetH} anchor with ${smallest.sizeLabel} accents would create an immediate reading order.`;
    emphasisStatus = '✗';
  } else {
    emphasisContent = `No emphasis—every shape is nearly the same size (~${largest.sizeLabel}). The eye has nowhere to start. Pick one shape to be the hero and scale it to 5–8× the others. Without a focal point, this is a pattern, not a composition.`;
    emphasisStatus = '✗';
  }
  sections.push({ title: 'Emphasis', content: emphasisContent, status: emphasisStatus });

  // 2. Balance — distribution of visual weight
  let balanceContent = '';
  let balanceStatus = '◐';
  if (largestNearThirds) {
    balanceContent = `Balance is intentional. The dominant shape anchors near a rule-of-thirds intersection, creating ${Math.abs(offsetX) > 30 ? 'asymmetric tension—the off-center weight implies deliberate choice' : 'stable, centered weight'}. The composition feels placed, not dropped.`;
    balanceStatus = '✓';
  } else if (largestOnCenter) {
    balanceContent = `Balance is symmetrical but static. The dominant shape (${largest.sizeLabel}) sits dead center—stable but inert. Shift it to a thirds intersection (x≈${Math.round(CANVAS_W / 3)} or x≈${Math.round((CANVAS_W * 2) / 3)}) to create asymmetric balance with more energy.`;
    balanceStatus = '◐';
  } else {
    const nearestThirdX = thirdXs.reduce((a, b) => Math.abs(b - largest.x) < Math.abs(a - largest.x) ? b : a);
    const nearestThirdY = thirdYs.reduce((a, b) => Math.abs(b - largest.y) < Math.abs(a - largest.y) ? b : a);
    balanceContent = `Balance feels accidental. The heaviest element sits at (${Math.round(largest.x)}, ${Math.round(largest.y)})—not a strong anchor zone. Snap it to (${Math.round(nearestThirdX)}, ${Math.round(nearestThirdY)}) to create intentional asymmetric balance.`;
    balanceStatus = '◐';
  }
  sections.push({ title: 'Balance', content: balanceContent, status: balanceStatus });

  // 3. Movement — eye path through the composition
  let movementContent = '';
  let movementStatus = '◐';
  const movementPoints = [];
  if (hasDiagonal) { movementPoints.push(`diagonal axis that pulls the eye through the frame`); movementStatus = '✓'; }
  if (hasOverlap) { movementPoints.push(`${overlapCount} overlapping pair${overlapCount > 1 ? 's' : ''} that create depth and imply sequence`); movementStatus = movementStatus === '✓' ? '✓' : '◐'; }
  if (has7030) { movementPoints.push(`70/30 weight split (${Math.round(dominanceRatio * 100)}% dominant) that gives the eye a clear entry point`); movementStatus = '✓'; }

  if (movementPoints.length >= 2) {
    movementContent = `Strong movement: ${movementPoints.join(' and ')}. The eye enters, travels, and lands—the composition has a readable path.`;
  } else if (movementPoints.length === 1) {
    movementContent = `Some movement via ${movementPoints[0]}, but the path stalls.`;
    if (!hasDiagonal && n >= 3) movementContent += ` A diagonal arrangement (large upper-left, small lower-right) would give the eye a direction to follow.`;
    if (!hasOverlap) movementContent += ` Overlapping shapes create implied sequence—let at least one pair touch.`;
    if (!has7030) movementContent += ` A 70/30 dominant/accent split establishes where the eye enters.`;
  } else {
    movementContent = `No movement—the eye lands and stops. Shapes are isolated, same-weight, and unconnected.${!hasDiagonal ? ' Arrange them along a diagonal.' : ''}${!hasOverlap ? ' Let at least one pair overlap.' : ''}${!has7030 ? ' Let one shape claim ~70% of total visual weight.' : ''}`;
    movementStatus = '✗';
  }
  sections.push({ title: 'Movement', content: movementContent, status: movementStatus });

  // 4. White Space — intentional use of empty area
  const usedSpace = Math.round(coverage * 100);
  let spaceContent = '';
  let spaceStatus = '◐';
  if (coverage < 0.12) {
    spaceContent = `White space is abundant (${usedSpace}% filled) but feels incidental rather than designed. Cluster shapes into a defined zone—empty space only works when it's intentional, framing something rather than just surrounding it.`;
    spaceStatus = '◐';
  } else if (coverage < 0.30) {
    spaceContent = `White space is working (${usedSpace}% filled). The empty areas frame the shapes and give them room to breathe—this reads as a considered composition, not a crowded one.`;
    spaceStatus = '✓';
  } else if (coverage < 0.50) {
    spaceContent = `White space is getting crowded (${usedSpace}% filled). Remove the smallest shape and re-evaluate—white space is a compositional element, not leftover area. Less is more here.`;
    spaceStatus = '◐';
  } else {
    spaceContent = `White space has been eliminated (${usedSpace}% filled). The composition is overcrowded—shapes have no room to be seen individually. Remove shapes until coverage drops below 30%, then assess the remaining relationships.`;
    spaceStatus = '✗';
  }
  sections.push({ title: 'White Space', content: spaceContent, status: spaceStatus });

  // 5. Fix This First — one concrete action
  const directives = [];
  if (largestRatio < 3) {
    const bigTarget = Math.round(Math.sqrt(totalArea * 0.6));
    directives.push(`Emphasis is broken—scale one shape to ${bigTarget * 2}×${Math.round(bigTarget * 1.3)} while keeping your smallest under ${smallest.sizeLabel}. Size difference should feel almost uncomfortable.`);
  }
  if (!largestNearThirds) {
    const tx = thirdXs[largest.x > cx ? 1 : 0];
    const ty = thirdYs[largest.y > cy ? 1 : 0];
    directives.push(`Balance is unanchored—move the dominant shape to the thirds intersection at (${Math.round(tx)}, ${Math.round(ty)}).`);
  }
  if (!hasDiagonal && n >= 3) {
    directives.push(`Movement is absent—arrange shapes along a diagonal: largest upper-left, smallest lower-right (or reverse). The eye needs a path.`);
  }
  if (!hasOverlap) {
    directives.push(`Overlap at least one pair of shapes. Even 15% overlap creates depth and makes the layout read as a system instead of isolated objects.`);
  }
  if (Math.abs(offsetX) < 40 && Math.abs(offsetY) < 40) {
    directives.push(`Push the visual center of gravity off to one side—deliberate asymmetric balance has more energy than accidental symmetry.`);
  }

  const directivesText = directives.length > 0
    ? directives[0]
    : `Strong composition. Push further: let a shape bleed off the canvas edge, or introduce one tiny accent shape far from the main cluster to create tension across distance.`;

  sections.push({ title: 'Fix This First', content: directivesText, status: '→' });

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
