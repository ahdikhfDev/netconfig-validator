/**
 * graphBuilder.js — Build topology links by matching subnets across devices.
 */

import { networkKey } from '../utils/cidr.js';

export function buildGraph(devices) {
  // Collect all non-loopback interfaces with their network key
  const allIfaces = [];
  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (iface.name === 'lo' || iface.role === 'loopback') continue;
      if (!iface.ip) continue; // skip interfaces without IP (eg. Linux bridge stanzas)
      const key = networkKey(iface.ip, iface.prefixLength);
      allIfaces.push({ ...iface, deviceId: dev.id, deviceName: dev.name, networkKey: key });
    }
  }

  // Group by network key
  const groups = {};
  for (const iface of allIfaces) {
    if (!groups[iface.networkKey]) groups[iface.networkKey] = [];
    groups[iface.networkKey].push(iface);
  }

  // Build links: each group with 2+ members forms links
  const links = [];
  for (const [subnet, members] of Object.entries(groups)) {
    const status = members.length === 2 ? 'valid' : members.length === 1 ? 'underpopulated' : 'overpopulated';

    // Pair up members (for overpopulated, create links between first and each other)
    if (members.length === 1) {
      links.push({
        id: `link-${subnet.replace(/\//g, '-')}-0`,
        subnet,
        interfaceAId: members[0].id,
        interfaceBId: null,
        status,
        deviceAId: members[0].deviceId,
        deviceBId: null,
      });
    } else {
      for (let i = 1; i < members.length; i++) {
        links.push({
          id: `link-${subnet.replace(/\//g, '-')}-${i}`,
          subnet,
          interfaceAId: members[0].id,
          interfaceBId: members[i].id,
          status,
          deviceAId: members[0].deviceId,
          deviceBId: members[i].deviceId,
        });
      }
    }
  }

  return links;
}
