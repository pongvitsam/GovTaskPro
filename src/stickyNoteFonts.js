export const STICKY_FONT_PRESETS = [
  {
    id: 'handwriting',
    label: 'ลายมือ',
    stack: '"Segoe Print", "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive',
  },
  {
    id: 'sarabun',
    label: 'Sarabun',
    stack: '"Sarabun", sans-serif',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    stack: '"Manrope", "Sarabun", sans-serif',
  },
  {
    id: 'sans',
    label: 'เรียบ',
    stack: 'system-ui, "Sarabun", sans-serif',
  },
  {
    id: 'mono',
    label: 'โค้ด',
    stack: 'ui-monospace, "Cascadia Code", "Consolas", monospace',
  },
];

export const STICKY_FONT_IDS = STICKY_FONT_PRESETS.map((f) => f.id);

export function stickyFontStack(id) {
  return STICKY_FONT_PRESETS.find((f) => f.id === id)?.stack || STICKY_FONT_PRESETS[0].stack;
}

export function normalizeStickyFontId(id) {
  const value = String(id || '').trim();
  return STICKY_FONT_IDS.includes(value) ? value : 'handwriting';
}
