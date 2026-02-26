/**
 * Local storage for layouts. No passwords – everything stays on device.
 */

const STORAGE_KEY = 'layout-practice-gallery';

export function getTodayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function loadAllLayouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLayout(layout) {
  const all = loadAllLayouts();
  const key = layout.date;
  let day = all.find(d => d.date === key);
  if (!day) {
    day = { date: key, layouts: [] };
    all.push(day);
    all.sort((a, b) => b.date.localeCompare(a.date));
  }
  const idx = day.layouts.findIndex(l => l.index === layout.index);
  const entry = {
    ...layout,
    id: layout.id || `${key}-${layout.index}-${Date.now()}`,
  };
  if (idx >= 0) day.layouts[idx] = entry;
  else day.layouts.push(entry);
  day.layouts.sort((a, b) => a.index - b.index);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return entry;
}

export function getTodayLayouts() {
  const key = getTodayKey();
  const all = loadAllLayouts();
  const day = all.find(d => d.date === key);
  return day ? day.layouts : [];
}

export function getLayoutImageData(layout) {
  return layout.imageData || null;
}

export function setLayoutImageData(layoutId, imageData) {
  const all = loadAllLayouts();
  for (const day of all) {
    const layout = day.layouts.find(l => l.id === layoutId);
    if (layout) {
      layout.imageData = imageData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return;
    }
  }
}

/** Export all data as JSON file (backup). Local only. */
export function exportAllData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    days: loadAllLayouts(),
  };
  return JSON.stringify(data);
}

/** Import from previously exported JSON. Replaces current data. */
export function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.days)) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.days));
    return true;
  } catch {
    return false;
  }
}
