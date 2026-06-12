/**
 * mplsLdpInconsistent.js — RULE-10: Router along LSP path doesn't
 * enable LDP on a linked interface.
 *
 * Checks: if two devices are linked via a subnet and either has LDP
 * on that interface, the other should too (symmetry check).
 */

export function mplsLdpInconsistentRule(devices, links) {
  const errors = [];

  // Build per-device LDP-enabled interface set
  const deviceLdpIfaces = {};
  for (const dev of devices) {
    const ldpIfaces = dev.routingConfig?.mpls?.ldpInterfaces || [];
    deviceLdpIfaces[dev.id] = new Set(ldpIfaces.map((l) => l.interface));
  }

  for (const link of links) {
    if (!link.interfaceAId || !link.interfaceBId) continue;

    const ifaceAName = link.interfaceAId.split('-')[0];
    const ifaceBName = link.interfaceBId.split('-')[0];

    const ldpA = deviceLdpIfaces[link.deviceAId]?.has(ifaceAName);
    const ldpB = deviceLdpIfaces[link.deviceBId]?.has(ifaceBName);

    // Check if either device has LDP at all
    const hasAnyLdpA = (deviceLdpIfaces[link.deviceAId]?.size || 0) > 0;
    const hasAnyLdpB = (deviceLdpIfaces[link.deviceBId]?.size || 0) > 0;

    // Only flag if MPLS/LDP is configured somewhere in the topology
    const anyLdpConfigured = Object.values(deviceLdpIfaces).some((s) => s.size > 0);
    if (!anyLdpConfigured) continue;

    // If one side has LDP on link but other doesn't, flag it
    if (ldpA && !ldpB && hasAnyLdpB) {
      errors.push({
        id: `err-mpls-ldp-${link.id}`,
        ruleCode: 'RULE-10',
        severity: 'warning',
        message: `LDP not enabled on ${link.deviceBId}/${ifaceBName} for link ${link.subnet}. ${link.deviceAId} has LDP on this interface.`,
        relatedDeviceIds: [link.deviceAId, link.deviceBId],
        relatedInterfaceIds: [link.interfaceAId, link.interfaceBId],
        relatedLinkId: link.id,
      });
    } else if (!ldpA && ldpB && hasAnyLdpA) {
      errors.push({
        id: `err-mpls-ldp-${link.id}`,
        ruleCode: 'RULE-10',
        severity: 'warning',
        message: `LDP not enabled on ${link.deviceAId}/${ifaceAName} for link ${link.subnet}. ${link.deviceBId} has LDP on this interface.`,
        relatedDeviceIds: [link.deviceAId, link.deviceBId],
        relatedInterfaceIds: [link.interfaceAId, link.interfaceBId],
        relatedLinkId: link.id,
      });
    }
  }

  return errors;
}
