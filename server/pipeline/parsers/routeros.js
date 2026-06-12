/**
 * routeros.js — Parse RouterOS config block into normalized interfaces + routing config.
 * Handles both inline commands and continuation-line format (RouterOS v7+).
 *
 * Example continuation format:
 *   /ip address
 *   add address=10.0.0.1/32 interface=lo
 *   add address=10.0.0.2/30 interface=ether1
 *   → each "add" line is matched individually.
 */

import { parseOSPF } from './routing/ospf.js';
import { parseBGP } from './routing/bgp.js';
import { parseMPLS } from './routing/mpls.js';
import { parseVPLS } from './routing/vpls.js';

export function parseRouterOS(text) {
  const interfaces = [];
  const warnings = [];
  let loopback = null;

  // Detect loopback — matches both inline and continuation formats
  // Inline:      /ip address add address=10.0.0.1/32 interface=lo
  // Continuation: add address=10.0.0.1/32 interface=lo
  const loMatch = text.match(/^\s*(?:\/ip\s+address\s+)?add\s+.*address=([0-9./]+).*\binterface=lo\b/m);
  if (loMatch) {
    loopback = loMatch[1];
  }

  // Parse IP addresses — matches both inline and continuation formats
  // Inline:      /ip address add address=10.0.0.1/32 interface=lo
  // Continuation: add address=10.0.0.1/32 interface=ether1
  const ipPattern = /^\s*(?:\/ip\s+address\s+)?add\s+.*address=([0-9.]+)\/(\d+).*\binterface=(\S+)/gm;
  let match;
  while ((match = ipPattern.exec(text)) !== null) {
    const ip = match[1];
    const prefix = parseInt(match[2], 10);
    const ifName = match[3];
    if (ifName === 'lo') continue; // handled as loopback

    interfaces.push({
      id: `${ifName}-${ip}`,
      name: ifName,
      ip,
      prefixLength: prefix,
      networkAddr: computeNetwork(ip, prefix),
      broadcastAddr: computeBroadcast(ip, prefix),
      gateway: null,
      role: ifName.startsWith('ether') ? 'wan' : ifName.startsWith('bridge') ? 'lan' : 'unknown',
    });
  }

  // Parse routing protocol sections
  const routing = {
    ospf: parseOSPF(text),
    bgp: parseBGP(text),
    mpls: parseMPLS(text),
    vpls: parseVPLS(text),
  };

  // Determine which protocols are active
  const protocols = [];
  if (routing.ospf.areas.length > 0 || routing.ospf.interfaces.length > 0) protocols.push('ospf');
  if (routing.bgp.instances.length > 0 || routing.bgp.peers.length > 0) protocols.push('bgp');
  if (routing.mpls.ldpInterfaces.length > 0) protocols.push('mpls');
  if (routing.vpls.vplsInterfaces.length > 0) protocols.push('vpls');

  return { interfaces, parseWarnings: warnings, loopback, routing, protocols };
}

function computeNetwork(ip, prefix) {
  const mask = ~(2 ** (32 - prefix) - 1) >>> 0;
  const ipInt = ipToInt(ip);
  return intToIp(ipInt & mask);
}

function computeBroadcast(ip, prefix) {
  const mask = ~(2 ** (32 - prefix) - 1) >>> 0;
  const ipInt = ipToInt(ip);
  return intToIp((ipInt & mask) | (~mask >>> 0));
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function intToIp(num) {
  return [(num >>> 24), (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
}
