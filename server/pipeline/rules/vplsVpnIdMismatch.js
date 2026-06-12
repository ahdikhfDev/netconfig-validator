/**
 * vplsVpnIdMismatch.js — RULE-11: Two PEs that should form VPLS
 * pseudowire have different VPN ID.
 *
 * Checks: if two devices are linked and both have VPLS config,
 * their VPLS-ID (VPN ID) should match for the same VPLS service.
 */

export function vplsVpnIdMismatchRule(devices, links) {
  const errors = [];

  // Build per-device VPLS ID set
  const deviceVplsIds = {};
  for (const dev of devices) {
    const vplsIfaces = dev.routingConfig?.vpls?.vplsInterfaces || [];
    deviceVplsIds[dev.id] = {
      name: dev.name,
      vplsIds: new Set(vplsIfaces.map((v) => v.vplsId).filter(Boolean)),
      vplsInterfaces: vplsIfaces,
    };
  }

  // Check linked devices for VPLS ID mismatch
  for (const link of links) {
    if (!link.interfaceAId || !link.interfaceBId) continue;

    const vplsA = deviceVplsIds[link.deviceAId];
    const vplsB = deviceVplsIds[link.deviceBId];

    if (!vplsA || !vplsB) continue;
    if (vplsA.vplsIds.size === 0 || vplsB.vplsIds.size === 0) continue;

    // Find matching VPLS IDs between the two devices
    const commonIds = [...vplsA.vplsIds].filter((id) => vplsB.vplsIds.has(id));

    if (commonIds.length === 0) {
      // Both have VPLS but no common VPLS-ID on a linked subnet
      errors.push({
        id: `err-vpls-mismatch-${link.id}`,
        ruleCode: 'RULE-11',
        severity: 'error',
        message: `VPLS VPN ID mismatch on link ${link.subnet}: ${vplsA.name} (${[...vplsA.vplsIds].join(', ')}), ${vplsB.name} (${[...vplsB.vplsIds].join(', ')}). Peers should share same VPLS-ID for the same pseudowire.`,
        relatedDeviceIds: [link.deviceAId, link.deviceBId],
        relatedInterfaceIds: [link.interfaceAId, link.interfaceBId],
        relatedLinkId: link.id,
      });
    }
  }

  // Also check if a VPLS interface's remote-peer doesn't match any device IP
  for (const dev of devices) {
    const vplsIfaces = dev.routingConfig?.vpls?.vplsInterfaces || [];
    for (const vpls of vplsIfaces) {
      if (!vpls.remotePeer) continue;

      // Collect all IPs
      let peerFound = false;
      for (const otherDev of devices) {
        if (otherDev.id === dev.id) continue;
        for (const iface of otherDev.interfaces) {
          if (iface.ip === vpls.remotePeer) {
            peerFound = true;
            break;
          }
        }
        if (otherDev.loopback && otherDev.loopback.split('/')[0] === vpls.remotePeer) {
          peerFound = true;
        }
        if (peerFound) break;
      }

      if (!peerFound) {
        errors.push({
          id: `err-vpls-peer-${dev.id}-${vpls.name}`,
          ruleCode: 'RULE-11',
          severity: 'warning',
          message: `VPLS remote-peer ${vpls.remotePeer} on ${dev.name}/${vpls.name} does not match any device IP in the topology`,
          relatedDeviceIds: [dev.id],
          relatedInterfaceIds: [],
          relatedLinkId: null,
        });
      }
    }
  }

  return errors;
}
