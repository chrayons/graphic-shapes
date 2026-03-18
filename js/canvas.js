/**
 * Canvas: design surface with shapes, selection, resize, rotate.
 * All data stays local; no server.
 */

const CANVAS_W = 360;
const CANVAS_H = 480;
const MIN_SHAPES = 2;
const MAX_SHAPES = 8;
const MIN_SIZE = 25;
const MAX_SIZE = 120;
const HANDLE_SIZE = 20;
const ROTATE_HANDLE_OFFSET = 28;
/** Canva-style: corner = proportional, edge = single-axis. Min/max scale for corners. */
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
/** Handle indices: 0=TL, 1=T, 2=TR, 3=L, 4=R, 5=BL, 6=B, 7=BR. */
const CORNER_HANDLES = [0, 2, 5, 7];

const SHAPE_TYPES = ['square', 'circle', 'triangle'];

let shapes = [];
let selectedId = null;
let containerEl = null;
let canvasEl = null;
let ctx = null;
let selectionUI = null;
let selectionBox = null;
let resizeHandles = null;
let rotateHandle = null;
let dragState = null; // { type: 'shape'|'resize'|'rotate', shapeId, handleIndex?, startX, startY, startShape }

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createShape(id, type, x, y, width, height, rotation = 0) {
  return { id, type, x, y, width, height, rotation };
}

function randomShape(id) {
  const type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
  const width = getRandomInt(MIN_SIZE, MAX_SIZE);
  const height = type === 'circle' ? width : getRandomInt(MIN_SIZE, MAX_SIZE);
  const x = getRandomInt(width / 2 + 10, CANVAS_W - width / 2 - 10);
  const y = getRandomInt(height / 2 + 10, CANVAS_H - height / 2 - 10);
  return createShape(id, type, x, y, width, height, 0);
}

export function initCanvas(container, canvas) {
  containerEl = container;
  canvasEl = canvas;
  ctx = canvasEl.getContext('2d');
  selectionUI = container.querySelector('#selection-ui');
  selectionBox = container.querySelector('#selection-box');
  resizeHandles = container.querySelector('#resize-handles');
  rotateHandle = container.querySelector('#rotate-handle');

  containerEl.style.aspectRatio = `${CANVAS_W} / ${CANVAS_H}`;
  containerEl.style.maxWidth = `${CANVAS_W}px`;
  containerEl.style.width = '100%';

  containerEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function getCanvasPoint(clientX, clientY) {
  const rect = containerEl.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function hitTestShape(sx, sy) {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (pointInShapeBounds(sx, sy, s)) {
      return s.id;
    }
  }
  return null;
}

/** Hit-test using the shape's rotated bounding box. */
function pointInShapeBounds(px, py, s) {
  const b = getShapeBounds(s);
  return px >= b.left && px <= b.left + b.width &&
         py >= b.top && py <= b.top + b.height;
}

function getShapeBounds(shape) {
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  const rad = (shape.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = shape.x;
  const cy = shape.y;

  // All shapes: (x,y) is the AABB center; use rotated box formula for consistent resize
  const w = hw * Math.abs(cos) + hh * Math.abs(sin);
  const h = hw * Math.abs(sin) + hh * Math.abs(cos);
  return {
    left: cx - w,
    top: cy - h,
    width: w * 2,
    height: h * 2,
  };
}

function updateSelectionUI() {
  if (!selectedId) {
    selectionUI.classList.add('hidden');
    return;
  }
  const shape = shapes.find(s => s.id === selectedId);
  if (!shape) {
    selectionUI.classList.add('hidden');
    return;
  }
  // Position selection UI at the shape center so rotation happens around it
  const rect = containerEl.getBoundingClientRect();
  const scaleX = rect.width / CANVAS_W;
  const scaleY = rect.height / CANVAS_H;
  const centerX = shape.x * scaleX;
  const centerY = shape.y * scaleY;

  selectionUI.style.left = `${centerX}px`;
  selectionUI.style.top = `${centerY}px`;
  selectionUI.style.right = 'auto';
  selectionUI.style.bottom = 'auto';
  selectionUI.style.width = '0px';
  selectionUI.style.height = '0px';

  const boxW = shape.width * scaleX;
  const boxH = shape.height * scaleY;
  selectionBox.style.left = `${-boxW / 2}px`;
  selectionBox.style.top = `${-boxH / 2}px`;
  selectionBox.style.width = `${boxW}px`;
  selectionBox.style.height = `${boxH}px`;

  resizeHandles.innerHTML = '';
  const positions = [
    [-0.5, -0.5], [0, -0.5], [0.5, -0.5],
    [-0.5, 0], [0.5, 0],
    [-0.5, 0.5], [0, 0.5], [0.5, 0.5],
  ];
  positions.forEach(([fx, fy], i) => {
    const div = document.createElement('div');
    div.className = 'resize-handle';
    div.dataset.handleIndex = String(i);
    div.style.left = `${fx * boxW}px`;
    div.style.top = `${fy * boxH}px`;
    resizeHandles.appendChild(div);
  });

  const handleOffset = ROTATE_HANDLE_OFFSET * ((scaleX + scaleY) / 2);
  rotateHandle.style.left = '0px';
  rotateHandle.style.top = `${-boxH / 2 - handleOffset}px`;

  selectionUI.style.transformOrigin = 'center center';
  selectionUI.style.transform = `rotate(${shape.rotation * 180 / Math.PI}deg)`;
  selectionUI.classList.remove('hidden');
}

function renderShapes() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  shapes.forEach(shape => {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.rotation);
    ctx.fillStyle = '#000';
    if (shape.type === 'square') {
      ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
    } else if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.ellipse(0, 0, shape.width / 2, shape.height / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
    } else if (shape.type === 'triangle') {
      ctx.beginPath();
      const hw = shape.width / 2, hh = shape.height / 2;
      ctx.moveTo(0, -hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(-hw, hh);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
  updateSelectionUI();
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  const pt = getCanvasPoint(e.clientX, e.clientY);

  const handleIndex = e.target.closest('.resize-handle')?.dataset?.handleIndex;
  if (handleIndex != null) {
    const idx = parseInt(handleIndex, 10);
    if (isNaN(idx) || idx < 0 || idx > 7) return;
    const shape = shapes.find(s => s.id === selectedId);
    if (shape) {
      dragState = { type: 'resize', shapeId: shape.id, handleIndex: idx, startX: pt.x, startY: pt.y, startShape: { ...shape } };
      e.preventDefault();
      containerEl.setPointerCapture?.(e.pointerId);
    }
    return;
  }

  if (e.target.closest('#rotate-handle')) {
    const shape = shapes.find(s => s.id === selectedId);
    if (shape) {
      const startAngle = Math.atan2(pt.y - shape.y, pt.x - shape.x);
      dragState = { type: 'rotate', shapeId: shape.id, startAngle, startRotation: shape.rotation, startX: pt.x, startY: pt.y };
      e.preventDefault();
      containerEl.setPointerCapture?.(e.pointerId);
    }
    return;
  }

  const hitId = hitTestShape(pt.x, pt.y);
  if (hitId) {
    selectedId = hitId;
    const shape = shapes.find(s => s.id === hitId);
    if (shape) {
      dragState = { type: 'shape', shapeId: hitId, startX: pt.x, startY: pt.y, startShapeX: shape.x, startShapeY: shape.y };
      e.preventDefault();
      containerEl.setPointerCapture?.(e.pointerId);
    }
  } else {
    selectedId = null;
  }
  renderShapes();
}

function onPointerMove(e) {
  if (!dragState) return;
  const pt = getCanvasPoint(e.clientX, e.clientY);
  const shape = shapes.find(s => s.id === dragState.shapeId);
  if (!shape) return;

  // Minimum drag distance threshold (2px) to avoid accidental drags on click
  const dx = pt.x - dragState.startX;
  const dy = pt.y - dragState.startY;
  const dragDist = Math.sqrt(dx * dx + dy * dy);
  const MIN_DRAG_DIST = 2;

  if (dragState.type === 'shape') {
    shape.x = dragState.startShapeX + (pt.x - dragState.startX);
    shape.y = dragState.startShapeY + (pt.y - dragState.startY);
  } else if (dragState.type === 'resize') {
    // Only apply resize after minimum drag distance
    if (dragDist < MIN_DRAG_DIST) return;

    const i = dragState.handleIndex;
    const start = dragState.startShape;
    const rad = start.rotation;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const w = start.width;
    const h = start.height;
    const b = getShapeBounds(start);

    if (CORNER_HANDLES.includes(i)) {
      // Proportional resize from center
      const oldDist = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
      const newDist = Math.sqrt((pt.x - shape.x) ** 2 + (pt.y - shape.y) ** 2);
      let s = oldDist > 0 ? newDist / oldDist : 1;
      s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
      const nw = Math.max(MIN_SIZE, s * w);
      const nh = Math.max(MIN_SIZE, s * h);
      shape.width = nw;
      shape.height = nh;
      // Center stays fixed
    } else {
      // Edge resize from center, center stays fixed
      if (i === 1) { // top
        const newH = (shape.y + h / 2) - pt.y;
        shape.height = Math.max(MIN_SIZE, newH);
      } else if (i === 6) { // bottom
        const newH = pt.y - (shape.y - h / 2);
        shape.height = Math.max(MIN_SIZE, newH);
      } else if (i === 3) { // left
        const newW = (shape.x + w / 2) - pt.x;
        shape.width = Math.max(MIN_SIZE, newW);
      } else if (i === 4) { // right
        const newW = pt.x - (shape.x - w / 2);
        shape.width = Math.max(MIN_SIZE, newW);
      }
    }
  } else if (dragState.type === 'rotate') {
    // Only apply rotation after minimum drag distance
    if (dragDist < MIN_DRAG_DIST) return;

    const angle = Math.atan2(pt.y - shape.y, pt.x - shape.x);
    const delta = angle - dragState.startAngle;
    shape.rotation = dragState.startRotation + delta;
  }

  renderShapes();
}

function onPointerUp() {
  dragState = null;
}

export function newChallenge() {
  const n = getRandomInt(MIN_SHAPES, MAX_SHAPES);
  shapes = [];
  for (let i = 0; i < n; i++) {
    shapes.push(randomShape('shape-' + i));
  }
  selectedId = null;
  renderShapes();
}

export function getShapes() {
  return shapes.map(s => ({ ...s }));
}

export function loadShapes(data) {
  if (Array.isArray(data) && data.length) {
    shapes = data.map(s => ({
      id: s.id || 'shape-' + Math.random(),
      type: s.type || 'square',
      x: s.x ?? CANVAS_W/2,
      y: s.y ?? CANVAS_H/2,
      width: s.width ?? 50,
      height: s.height ?? 50,
      rotation: s.rotation ?? 0,
    }));
  } else {
    shapes = [];
  }
  selectedId = null;
  renderShapes();
}

export function exportImageDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  shapes.forEach(shape => {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.rotation);
    ctx.fillStyle = '#000';
    if (shape.type === 'square') {
      ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
    } else if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.ellipse(0, 0, shape.width / 2, shape.height / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
    } else if (shape.type === 'triangle') {
      ctx.beginPath();
      const hw = shape.width / 2, hh = shape.height / 2;
      ctx.moveTo(0, -hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(-hw, hh);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

export function getCanvasDimensions() {
  return { w: CANVAS_W, h: CANVAS_H };
}
