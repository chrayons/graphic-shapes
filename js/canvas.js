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
let svgEl = null;
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

export function initCanvas(container, svg) {
  containerEl = container;
  svgEl = svg;
  selectionUI = container.querySelector('#selection-ui');
  selectionBox = container.querySelector('#selection-box');
  resizeHandles = container.querySelector('#resize-handles');
  rotateHandle = container.querySelector('#rotate-handle');

  svgEl.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  containerEl.style.aspectRatio = `${CANVAS_W} / ${CANVAS_H}`;
  containerEl.style.maxWidth = `${CANVAS_W}px`;
  containerEl.style.width = '100%';

  containerEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function getSvgPoint(clientX, clientY) {
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
    if (pointInShapeBounds(sx, sy, s)) return s.id;
  }
  return null;
}

/** Hit-test using the shape's bounding box (matches the visible selection box). */
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

  if (shape.type === 'triangle') {
    // Triangle in SVG: points (0, -hh), (hw, hh), (-hw, hh) with transform translate(cx,cy) rotate(θ) translate(-w/2,-h/2)
    // So world = (cx,cy) + R(θ) * (p - (hw, hh))
    const px1 = 0 - hw, py1 = -hh - hh;
    const px2 = hw - hw, py2 = hh - hh;
    const px3 = -hw - hw, py3 = hh - hh;
    const x1 = cx + px1 * cos - py1 * sin;
    const y1 = cy + px1 * sin + py1 * cos;
    const x2 = cx + px2 * cos - py2 * sin;
    const y2 = cy + px2 * sin + py2 * cos;
    const x3 = cx + px3 * cos - py3 * sin;
    const y3 = cy + px3 * sin + py3 * cos;
    const left = Math.min(x1, x2, x3);
    const top = Math.min(y1, y2, y3);
    const right = Math.max(x1, x2, x3);
    const bottom = Math.max(y1, y2, y3);
    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  // Rectangle/circle: AABB of rotated rectangle
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
  const b = getShapeBounds(shape);
  const rect = containerEl.getBoundingClientRect();
  const scaleX = rect.width / CANVAS_W;
  const scaleY = rect.height / CANVAS_H;
  selectionBox.style.left = b.left * scaleX + 'px';
  selectionBox.style.top = b.top * scaleY + 'px';
  selectionBox.style.width = b.width * scaleX + 'px';
  selectionBox.style.height = b.height * scaleY + 'px';

  resizeHandles.innerHTML = '';
  const positions = [
    [0, 0], [0.5, 0], [1, 0],
    [0, 0.5], [1, 0.5],
    [0, 1], [0.5, 1], [1, 1],
  ];
  positions.forEach(([fx, fy], i) => {
    const div = document.createElement('div');
    div.className = 'resize-handle';
    div.dataset.handleIndex = String(i);
    div.style.left = (b.left + b.width * fx) * scaleX + 'px';
    div.style.top = (b.top + b.height * fy) * scaleY + 'px';
    resizeHandles.appendChild(div);
  });

  rotateHandle.style.left = (shape.x * scaleX) + 'px';
  rotateHandle.style.top = ((b.top - ROTATE_HANDLE_OFFSET) * scaleY) + 'px';
  selectionUI.classList.remove('hidden');
}

function renderShapes() {
  svgEl.innerHTML = '';
  shapes.forEach(shape => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.dataset.shapeId = shape.id;
    g.setAttribute('transform', `translate(${shape.x},${shape.y}) rotate(${shape.rotation}) translate(${-shape.width/2},${-shape.height/2})`);

    if (shape.type === 'square') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', shape.width);
      rect.setAttribute('height', shape.height);
      rect.setAttribute('fill', '#000');
      g.appendChild(rect);
    } else if (shape.type === 'circle') {
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ellipse.setAttribute('cx', shape.width / 2);
      ellipse.setAttribute('cy', shape.height / 2);
      ellipse.setAttribute('rx', shape.width / 2);
      ellipse.setAttribute('ry', shape.height / 2);
      ellipse.setAttribute('fill', '#000');
      g.appendChild(ellipse);
    } else if (shape.type === 'triangle') {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const hw = shape.width / 2, hh = shape.height / 2;
      poly.setAttribute('points', `0,${-hh} ${hw},${hh} ${-hw},${hh}`);
      poly.setAttribute('fill', '#000');
      g.appendChild(poly);
    }

    svgEl.appendChild(g);
  });
  updateSelectionUI();
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  const pt = getSvgPoint(e.clientX, e.clientY);

  const handleIndex = e.target.closest('.resize-handle')?.dataset?.handleIndex;
  if (handleIndex != null) {
    const idx = parseInt(handleIndex, 10);
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
    updateSelectionUI();
    const shape = shapes.find(s => s.id === hitId);
    if (shape) {
      dragState = { type: 'shape', shapeId: hitId, startX: pt.x, startY: pt.y, startShapeX: shape.x, startShapeY: shape.y };
      e.preventDefault();
      containerEl.setPointerCapture?.(e.pointerId);
    }
  } else {
    selectedId = null;
    updateSelectionUI();
  }
}

function onPointerMove(e) {
  if (!dragState) return;
  const pt = getSvgPoint(e.clientX, e.clientY);
  const shape = shapes.find(s => s.id === dragState.shapeId);
  if (!shape) return;

  if (dragState.type === 'shape') {
    shape.x = dragState.startShapeX + (pt.x - dragState.startX);
    shape.y = dragState.startShapeY + (pt.y - dragState.startY);
    shape.x = Math.max(shape.width/2, Math.min(CANVAS_W - shape.width/2, shape.x));
    shape.y = Math.max(shape.height/2, Math.min(CANVAS_H - shape.height/2, shape.y));
  } else if (dragState.type === 'resize') {
    const i = dragState.handleIndex;
    const start = dragState.startShape;
    const rad = (start.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const w = start.width;
    const h = start.height;
    const b = getShapeBounds(start);

    if (CORNER_HANDLES.includes(i)) {
      // Canva-style: corner drag = proportional scale. Fixed point = AABB corner opposite to the handle.
      let fixedWorldX, fixedWorldY;
      if (i === 0) {
        fixedWorldX = b.left + b.width;
        fixedWorldY = b.top + b.height;
      } else if (i === 2) {
        fixedWorldX = b.left;
        fixedWorldY = b.top + b.height;
      } else if (i === 5) {
        fixedWorldX = b.left + b.width;
        fixedWorldY = b.top;
      } else {
        fixedWorldX = b.left;
        fixedWorldY = b.top;
      }
      const dx = fixedWorldX - pt.x;
      const dy = fixedWorldY - pt.y;
      const diagonal = Math.sqrt(w * w + h * h);
      const dist = Math.sqrt(dx * dx + dy * dy);
      let s = diagonal > 1e-4 ? dist / diagonal : 1;
      s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
      const nw = Math.max(MIN_SIZE, s * w);
      const nh = Math.max(MIN_SIZE, s * h);
      shape.width = nw;
      shape.height = nh;
      // New center so this AABB corner stays at (fixedWorldX, fixedWorldY). Which local corner that is depends on handle.
      if (i === 0) {
        shape.x = fixedWorldX - (nw / 2) * cos + (nh / 2) * sin;
        shape.y = fixedWorldY - (nw / 2) * sin - (nh / 2) * cos;
      } else if (i === 2) {
        shape.x = fixedWorldX + (nw / 2) * cos + (nh / 2) * sin;
        shape.y = fixedWorldY + (nw / 2) * sin - (nh / 2) * cos;
      } else if (i === 5) {
        shape.x = fixedWorldX - (nw / 2) * cos - (nh / 2) * sin;
        shape.y = fixedWorldY - (nw / 2) * sin + (nh / 2) * cos;
      } else {
        shape.x = fixedWorldX + (nw / 2) * cos - (nh / 2) * sin;
        shape.y = fixedWorldY + (nw / 2) * sin + (nh / 2) * cos;
      }
    } else {
      // Edge handle: single-axis resize (stretch width or height only), opposite edge fixed
      const absCos = Math.abs(cos);
      const absSin = Math.abs(sin);
      if (i === 1) {
        // Top edge to pt.y: bottom edge fixed
        const fixedBottomY = start.y + (h / 2) * cos;
        const newAabbH = Math.max(20, fixedBottomY - pt.y);
        let nh = absCos >= 1e-4 ? (newAabbH - w * absSin) / absCos : h;
        nh = Math.max(MIN_SIZE, nh);
        shape.height = nh;
        shape.y = fixedBottomY - (nh / 2) * cos;
        shape.x = start.x;
      } else if (i === 6) {
        // Bottom edge to pt.y: top edge fixed
        const fixedTopY = start.y - (h / 2) * cos;
        const newAabbH = Math.max(20, pt.y - fixedTopY);
        let nh = absCos >= 1e-4 ? (newAabbH - w * absSin) / absCos : h;
        nh = Math.max(MIN_SIZE, nh);
        shape.height = nh;
        shape.y = fixedTopY + (nh / 2) * cos;
        shape.x = start.x;
      } else if (i === 3) {
        // Left edge to pt.x: right edge fixed
        const fixedRightX = start.x + (w / 2) * cos;
        const newAabbW = Math.max(20, fixedRightX - pt.x);
        let nw = absCos >= 1e-4 ? (newAabbW - h * absSin) / absCos : w;
        nw = Math.max(MIN_SIZE, nw);
        shape.width = nw;
        shape.x = fixedRightX - (nw / 2) * cos;
        shape.y = start.y;
      } else {
        // Right edge (i === 4) to pt.x: left edge fixed
        const fixedLeftX = start.x - (w / 2) * cos;
        const newAabbW = Math.max(20, pt.x - fixedLeftX);
        let nw = absCos >= 1e-4 ? (newAabbW - h * absSin) / absCos : w;
        nw = Math.max(MIN_SIZE, nw);
        shape.width = nw;
        shape.x = fixedLeftX + (nw / 2) * cos;
        shape.y = start.y;
      }
    }
  } else if (dragState.type === 'rotate') {
    const angle = Math.atan2(pt.y - shape.y, pt.x - shape.x);
    let delta = (angle - dragState.startAngle) * 180 / Math.PI;
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

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export function getCanvasDimensions() {
  return { w: CANVAS_W, h: CANVAS_H };
}
