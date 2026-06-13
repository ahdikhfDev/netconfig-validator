/**
 * parsers/index.js — Vendor parser registry and dispatch.
 *
 * To add a new vendor:
 *   1. Create `parsers/<vendor>.js` exporting { name, detect(text), parse(text) }
 *   2. Import and register it in the PARSERS array below
 *
 * detect(text) must return true if this parser handles the config block.
 * The first matching parser wins (ordered by specificity).
 */

import { parseRouterOS } from './routeros.js';
import { parseLinuxHost } from './linuxHost.js';

const PARSERS = [
  {
    name: 'routeros',
    detect: (text) => /^\/interface\b|^\/ip\b|^\/routing\b|^\/mpls\b|^\/system\b/m.test(text),
    parse: parseRouterOS,
  },
  {
    name: 'linux_host',
    detect: (text) => /^auto\s|^iface\s|^source\s/m.test(text),
    parse: parseLinuxHost,
  },
];

/**
 * Detect vendor type from config text.
 * Returns 'unknown' if no parser matches.
 */
export function detectVendor(text) {
  for (const p of PARSERS) {
    if (p.detect(text)) return p.name;
  }
  return 'unknown';
}

/**
 * Parse config text using the appropriate vendor parser.
 * Returns { interfaces, parseWarnings, loopback, routing, protocols }
 * Returns a minimal result object for unknown vendors.
 */
export function parseConfig(text) {
  const vendor = detectVendor(text);
  if (vendor === 'unknown') {
    return {
      interfaces: [],
      parseWarnings: ['Unknown vendor type — parsing skipped'],
      loopback: null,
      routing: null,
      protocols: [],
    };
  }
  const parser = PARSERS.find((p) => p.name === vendor);
  if (!parser) {
    return {
      interfaces: [],
      parseWarnings: [`Parser '${vendor}' not found`],
      loopback: null,
      routing: null,
      protocols: [],
    };
  }
  return parser.parse(text);
}

/**
 * Return all supported vendor names.
 */
export function getSupportedVendors() {
  return PARSERS.map((p) => p.name);
}
