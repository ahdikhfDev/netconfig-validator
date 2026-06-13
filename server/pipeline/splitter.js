/**
 * splitter.js — Split raw multi-device config into per-device blocks.
 * Delimiters:
 *   "# N. NamaDevice"
 *   "# --- NamaDevice ---"
 *   "# ROUTER Name"                          (MikroTik header)
 *   "# LOCATION NAME"                        (standalone all-caps location)
 *   "# ============ \n# NAMA \n# ============" (decorative 3-line block → normalized)
 */

export function runPipeline(rawText) {
  // Normalize decorative 3-line headers:
  //   # ==============
  //   # ROUTER/NAME
  //   # ==============
  // → # ROUTER/NAME  (single line)
  rawText = rawText.replace(
    /^#\s*={3,}\s*\n(#[^\n]+)\n#\s*={3,}\s*$/gm,
    '$1'
  );

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

  // "# ROUTER Name" — MikroTik router headers (strip "ROUTER " prefix)
  const m3 = trim.match(/^#\s+ROUTER\s+(.+)$/i);
  if (m3) return m3[1].trim();

  // "# LOCATION NAME" — standalone all-caps location headers
  // matches "IPB DRAMAGA", "UI DEPOK", "UI SALEMBA", etc.
  // 2–4 all-caps words, avoids matching comments/sentences
  const m4 = trim.match(/^#\s+([A-Z]{2,}(?:\s+[A-Z]{2,}){1,3})$/);
  if (m4) return m4[1].trim();

  // "# Name" or "# Name-With-Hyphens" — generic device header fallback
  // catched "Router-A", "R1-Gateway", "Switch-Core", "Core-Switch-01"
  // Excludes common comment patterns (contains lowercase, no colon/question)
  const m5 = trim.match(/^#\s+([A-Za-z][A-Za-z0-9_-]+)$/);
  if (m5) return m5[1].trim();

  return null;
}
