/**
 * graphBuilder.js — Build topology links by matching subnets across devices.
 * Supports both P2P and broadcast (LAN) subnet types.
 */

import { networkKey } from '../utils/cidr.js';

const P2P_PREFIX_THRESHOLD = 30; // /30 or /31 = P2P; /29 or smaller = broadcast

/**
 * Determine link type based on prefix length.
 */
function classifyLinkType(prefixLength) {
  return prefixLength >= P2P_PREFIX_THRESHOLD ? 'p2p' : 'broadcast';
}

export function buildGraph(devices) {
  const allIfaces = [];
  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (iface.name === 'lo' || iface.role === 'loopback') continue;
      if (!iface.ip) continue;
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

  const links = [];
  for (const [subnet, members] of Object.entries(groups)) {
    const memberCount = members.length;
    const prefixLength = members[0].prefixLength; // all same subnet, so prefix is consistent
    const linkType = classifyLinkType(prefixLength);

    // Determine status based on link type:
    //   P2P: expect exactly 2
    //   Broadcast (LAN): any number >= 1 is normal
    let status;
    if (linkType === 'p2p') {
      status = memberCount === 2 ? 'valid' : memberCount === 1 ? 'underpopulated' : 'overpopulated';
    } else {
      // Broadcast — many hosts is normal
      status = memberCount >= 1 ? 'valid' : 'underpopulated';
    }

    // Build links
    if (memberCount === 1) {
      links.push({
        id: `link-${subnet.replace(/\//g, '-')}-0`,
        subnet,
        linkType,
        interfaceAId: members[0].id,
        interfaceBId: null,
        status,
        deviceAId: members[0].deviceId,
        deviceBId: null,
      });
    } else {
      for (let i = 1; i < memberCount; i++) {
        links.push({
          id: `link-${subnet.replace(/\//g, '-')}-${i}`,
          subnet,
          linkType,
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

/**
 * Re-export for rules to classify link type without rebuilding full graph.
 */
export { classifyLinkType };
