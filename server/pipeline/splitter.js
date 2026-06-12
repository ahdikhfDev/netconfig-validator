/**
 * splitter.js — Split raw multi-device config into per-device blocks.
 * Blocks are delimited by marker comments:
 *   "# N. NamaDevice"  or  "# --- NamaDevice ---"
 */

export function runPipeline(rawText) {
  const lines = rawText.split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const marker = parseMarker(line);
    if (marker) {
      if (current) blocks.push(current);
      current = { name: marker, text: '' };
    } else if (current) {
      current.text += line + '\n';
    }
  }
  if (current) blocks.push(current);

  return blocks;
}

function parseMarker(line) {
  const trim = line.trim();

  // "# N. NamaDevice"
  const m1 = trim.match(/^#\s*\d+\.\s*(.+)$/);
  if (m1) return m1[1].trim();

  // "# --- NamaDevice ---"
  const m2 = trim.match(/^#\s*-{3,}\s*(.+?)\s*-{3,}$/);
  if (m2) return m2[1].trim();

  return null;
}
