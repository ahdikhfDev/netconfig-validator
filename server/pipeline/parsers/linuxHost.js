/**
 * linuxHost.js — Parse Linux /etc/network/interfaces config block.
 */

export function parseLinuxHost(text) {
  const interfaces = [];
  const warnings = [];
  let currentIface = null;

  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // iface eth0 inet static
    const ifaceMatch = line.match(/^iface\s+(\S+)\s+inet\s+(static|dhcp)/);
    if (ifaceMatch) {
      if (currentIface) interfaces.push(currentIface);
      currentIface = {
        id: ifaceMatch[1],
        name: ifaceMatch[1],
        ip: null,
        prefixLength: null,
        networkAddr: null,
        broadcastAddr: null,
        gateway: null,
        role: 'unknown',
      };
      continue;
    }

    // address 192.168.1.1/24
    const addrMatch = line.match(/^address\s+([0-9.]+)\/(\d+)/);
    if (addrMatch && currentIface) {
      currentIface.ip = addrMatch[1];
      currentIface.prefixLength = parseInt(addrMatch[2], 10);
      currentIface.networkAddr = computeNetwork(currentIface.ip, currentIface.prefixLength);
      currentIface.broadcastAddr = computeBroadcast(currentIface.ip, currentIface.prefixLength);
      continue;
    }

    // gateway 192.168.1.1
    const gwMatch = line.match(/^gateway\s+([0-9.]+)/);
    if (gwMatch && currentIface) {
      currentIface.gateway = gwMatch[1];
      continue;
    }
  }
  if (currentIface) interfaces.push(currentIface);

  return { interfaces, parseWarnings: warnings, loopback: null };
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
