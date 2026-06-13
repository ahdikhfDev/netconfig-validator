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

  // --- Loopback detection ---
  const loMatch = text.match(/^\s*(?:\/ip\s+address\s+)?add\s+.*address=([0-9./]+).*\binterface=lo\b/m);
  if (loMatch) {
    loopback = loMatch[1];
  }

  // --- IP address parsing ---
  // Handle: /ip address add address=X.X.X.X/Y interface=Z
  // Also handles continuation lines: add address=... interface=...
  // Extended to capture optional network=, disabled=, comment=
  const ipPattern = /^\s*(?:\/ip\s+address\s+)?add\s+.*address=([0-9.]+)\/(\d+).*\binterface=(\S+)(.*)$/gm;
  let match;
  while ((match = ipPattern.exec(text)) !== null) {
    const ip = match[1];
    const prefix = parseInt(match[2], 10);
    const ifName = match[3];
    const restOfLine = match[4] || ''; // captures everything after interface name
    if (ifName === 'lo') continue;

    // Extract optional gateway from comment or from subsequent lines
    // RouterOS can set gateway per-address with `gateway=X.X.X.X`
    const gatewayMatch = match[0].match(/gateway=([0-9.]+)/);
    const gateway = gatewayMatch ? gatewayMatch[1] : null;

    // Check disabled in full match OR in rest-of-line capture
    const disabled = match[0].includes('disabled=yes') || restOfLine.includes('disabled=yes');

    interfaces.push({
      id: `${ifName}-${ip}`,
      name: ifName,
      ip,
      prefixLength: prefix,
      networkAddr: computeNetwork(ip, prefix),
      broadcastAddr: computeBroadcast(ip, prefix),
      gateway,
      disabled,
      role: inferInterfaceRole(ifName),
    });
  }

  // --- Static route parsing ---
  // /ip route add dst-address=0.0.0.0/0 gateway=192.168.1.1 distance=1
  // /ip route add dst-address=10.100.0.0/16 gateway=10.10.13.5
  const staticRoutes = [];
  const routePattern = /^\s*(?:\/ip\s+route\s+)?add\s+(.*)$/gm;
  while ((match = routePattern.exec(text)) !== null) {
    const params = match[1];
    const dst = params.match(/dst-address=([0-9./]+)/);
    const gw = params.match(/gateway=([0-9.]+)/);
    const distance = params.match(/distance=(\d+)/);
    const routingMark = params.match(/routing-mark=(\S+)/);
    const disabled = params.includes('disabled=yes');
    if (dst) {
      staticRoutes.push({
        dstAddress: dst[1],
        gateway: gw ? gw[1] : null,
        distance: distance ? parseInt(distance[1], 10) : 1,
        routingMark: routingMark ? routingMark[1] : null,
        disabled,
      });
    }
  }

  // --- Routing protocol sections ---
  const routing = {
    ospf: parseOSPF(text),
    bgp: parseBGP(text),
    mpls: parseMPLS(text),
    vpls: parseVPLS(text),
    staticRoutes,
  };

  // Determine which protocols are active
  const protocols = [];
  if (routing.ospf.areas.length > 0 || routing.ospf.interfaces.length > 0) protocols.push('ospf');
  if (routing.bgp.instances.length > 0 || routing.bgp.peers.length > 0) protocols.push('bgp');
  if (routing.mpls.ldpInterfaces.length > 0) protocols.push('mpls');
  if (routing.vpls.vplsInterfaces.length > 0) protocols.push('vpls');
  if (staticRoutes.length > 0) protocols.push('static');

  return { interfaces, parseWarnings: warnings, loopback, routing, protocols };
}

/**
 * Infer interface role from name.
 * RouterOS naming conventions:
 *   etherN  → unknown (could be WAN, P2P core-facing, or CE-facing)
 *   bridgeN → lan
 *   vlanN / vlanN.X → vlan subinterface
 *   wlanN / wifiN   → wireless
 *   lo / loopbackN  → loopback
 */
function inferInterfaceRole(name) {
  if (name === 'lo' || name.startsWith('loopback')) return 'loopback';
  if (name.startsWith('bridge')) return 'lan';
  if (name.startsWith('wlan') || name.startsWith('wifi') || name.startsWith('wl')) return 'wlan';
  if (name.startsWith('vlan') || name.includes('.')) return 'vlan';
  // ether* is ambiguous — could be P2P, core, or access
  return 'unknown';
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
