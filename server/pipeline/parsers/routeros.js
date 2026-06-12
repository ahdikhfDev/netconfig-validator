/**
 * routeros.js — Parse RouterOS config block into normalized interfaces.
 */

const IP_RE = /^\/ip\s+address\s+add\s+.*address=([0-9./]+).*interface=(\S+)/m;
const IFACE_RE = /^\/interface\s+(?:bridge|ethernet|vlan|wireless|bonding)\s+add\s+.*name=(\S+)/gm;
const LO_RE = /^\/ip\s+address\s+add\s+.*address=([0-9./]+).*interface=lo\b/m;

export function parseRouterOS(text) {
  const interfaces = [];
  const warnings = [];
  let loopback = null;

  // Detect loopback
  const loMatch = text.match(LO_RE);
  if (loMatch) {
    loopback = loMatch[1];
  }

  // Parse IP addresses
  const ipPattern = /^\/ip\s+address\s+add\s+(.*)$/gm;
  let match;
  while ((match = ipPattern.exec(text)) !== null) {
    const params = match[1];
    const addr = params.match(/address=([0-9.]+)\/(\d+)/);
    const iface = params.match(/interface=(\S+)/);
    if (addr && iface) {
      const ip = addr[1];
      const prefix = parseInt(addr[2], 10);
      const ifName = iface[1];
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
  }

  return { interfaces, parseWarnings: warnings, loopback };
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
