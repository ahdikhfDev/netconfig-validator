/**
 * subnetPopulation.js — RULE-02 (overpopulated) & RULE-03 (underpopulated).
 *
 * Overpopulated is only meaningful for P2P subnets (/30+).
 * Broadcast subnets (LAN /29 or larger) can have any number of hosts.
 */

export function subnetPopulationRule(devices, links) {
  const errors = [];
  const seen = new Set();

  for (const link of links) {
    if (seen.has(link.subnet)) continue;
    seen.add(link.subnet);

    // Skip overpopulated for broadcast links — many hosts on a LAN is normal
    if (link.status === 'overpopulated') {
      if (link.linkType === 'broadcast') continue;

      const devs = [];
      for (const l of links) {
        if (l.subnet === link.subnet) {
          if (l.deviceAId && !devs.includes(l.deviceAId)) devs.push(l.deviceAId);
          if (l.deviceBId && !devs.includes(l.deviceBId)) devs.push(l.deviceBId);
        }
      }
      const devNames = devices.filter((d) => devs.includes(d.id)).map((d) => d.name).join(', ');
      errors.push({
        id: `err-overpop-${link.subnet.replace(/\//g, '-')}`,
        ruleCode: 'RULE-02',
        severity: 'error',
        message: `Subnet ${link.subnet} overpopulated: ${devNames}. Point-to-point link should have exactly 2 devices.`,
        relatedDeviceIds: devs,
        relatedInterfaceIds: [link.interfaceAId, link.interfaceBId].filter(Boolean),
        relatedLinkId: link.id,
      });
    }

    if (link.status === 'underpopulated') {
      const dev = devices.find((d) => d.id === link.deviceAId);
      errors.push({
        id: `err-underpop-${link.subnet.replace(/\//g, '-')}`,
        ruleCode: 'RULE-03',
        severity: 'warning',
        message: `Subnet ${link.subnet} underpopulated: only ${dev?.name || link.deviceAId} has an IP. Missing peer device config.`,
        relatedDeviceIds: [link.deviceAId].filter(Boolean),
        relatedInterfaceIds: [link.interfaceAId].filter(Boolean),
        relatedLinkId: link.id,
      });
    }
  }

  return errors;
}