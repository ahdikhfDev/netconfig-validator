/**
 * linuxHost.js — Parse Linux /etc/network/interfaces config block.
 * Supports both "address x.x.x.x/xx" and separate "address" + "netmask" lines.
 */
export function parseLinuxHost(text) {
  const interfaces = [];
  const warnings = [];
  const lines = text.split('\n');

  // We use a lookahead pattern: iface starts a new block, end-of-file also closes.
  // Actually simpler: process line-by-line, track current iface state.
  let currentIface = null;

  function closeIface() {
    if (!currentIface) return;
    // Compute network/broadcast if address known
    if (currentIface.ip && currentIface.prefixLength !== null) {
      currentIface.networkAddr = computeNetwork(currentIface.ip, currentIface.prefixLength);
      currentIface.broadcastAddr = computeBroadcast(currentIface.ip, currentIface.prefixLength);
    }
    interfaces.push(currentIface);
    currentIface = null;
  }

  function startIface(ifaceName) {
    closeIface();
    currentIface = {
      id: ifaceName,
      name: ifaceName,
      ip: null,
      prefixLength: null,
      networkAddr: null,
      broadcastAddr: null,
      gateway: null,
      role: ifaceName === 'lo' ? 'loopback' : 'wan',
    };
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // auto eth0  — just a marker, next line will be "iface"
    if (/^auto\s+\S+/.test(line)) continue;
    // source / dns-* — skip
    if (/^(source|dns-)/i.test(line)) continue;

    // iface eth0 inet static (or dhcp)
    const ifaceMatch = line.match(/^iface\s+(\S+)\s+inet\s+(static|dhcp)/);
    if (ifaceMatch) {
      startIface(ifaceMatch[1]);
      continue;
    }

    // iface lo inet loopback
    const loopbackMatch = line.match(/^iface\s+lo\s+inet\s+loopback/);
    if (loopbackMatch) {
      startIface('lo');
      if (currentIface) currentIface.role = 'loopback';
      continue;
    }

    if (!currentIface) continue;

    // address 192.168.1.1/24  (CIDR notation)
    const addrCidr = line.match(/^address\s+([0-9.]+)\/(\d+)/);
    if (addrCidr) {
      currentIface.ip = addrCidr[1];
      currentIface.prefixLength = parseInt(addrCidr[2], 10);
      continue;
    }

    // address 192.168.1.1  (plain, netmask on another line)
    const addrPlain = line.match(/^address\s+([0-9.]+)$/);
    if (addrPlain) {
      currentIface.ip = addrPlain[1];
      continue;
    }

    // netmask 255.255.255.0  (dotted decimal)
    const nmDotted = line.match(/^netmask\s+(\d+\.\d+\.\d+\.\d+)/);
    if (nmDotted && currentIface) {
      const bits = maskToBits(nmDotted[1]);
      if (bits !== null) currentIface.prefixLength = bits;
      continue;
    }

    // netmask 24  (prefix length)
    const nmBits = line.match(/^netmask\s+(\d+)$/);
    if (nmBits && currentIface) {
      const bits = parseInt(nmBits[1], 10);
      if (bits > 0 && bits <= 32) currentIface.prefixLength = bits;
      continue;
    }

    // gateway 192.168.1.1
    const gwMatch = line.match(/^gateway\s+([0-9.]+)/);
    if (gwMatch) {
      currentIface.gateway = gwMatch[1];
      continue;
    }
  }

  closeIface();

  return {
    interfaces,
    parseWarnings: warnings,
    loopback: null,
    routing: { ospf: null, bgp: null, mpls: null, vpls: null, staticRoutes: [] },
    protocols: [],
  };
}

function maskToBits(mask) {
  const parts = mask.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  const binary = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  let bits = 0;
  let seenZero = false;
  for (let i = 31; i >= 0; i--) {
    if ((binary >>> i) & 1) {
      if (seenZero) return null; // non-contiguous mask
      bits++;
    } else {
      seenZero = true;
    }
  }
  return bits;
}

function computeNetwork(ip, prefix) {
  const mask = ~(2 ** (32 - prefix) - 1) >>> 0;
  return intToIp(ipToInt(ip) & mask);
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