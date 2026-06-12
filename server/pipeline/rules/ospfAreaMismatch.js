/**
 * ospfAreaMismatch.js — RULE-08: Two routers connected on same link
 * but OSPF area different.
 */

export function ospfAreaMismatchRule(devices, links) {
  const errors = [];

  // Build map: deviceId -> ospf area assignments per interface
  const deviceAreas = {};
  for (const dev of devices) {
    if (!dev.routingConfig?.ospf?.interfaces) continue;
    deviceAreas[dev.id] = {};
    for (const ospfIface of dev.routingConfig.ospf.interfaces) {
      deviceAreas[dev.id][ospfIface.interface] = ospfIface.area;
    }
  }

  // For each link, check if both sides have OSPF configured with different areas
  for (const link of links) {
    if (!link.interfaceAId || !link.interfaceBId) continue;

    // Get interface names from IDs (id format: "ifname-ip")
    const ifaceAName = link.interfaceAId.split('-')[0];
    const ifaceBName = link.interfaceBId.split('-')[0];

    const areaA = deviceAreas[link.deviceAId]?.[ifaceAName];
    const areaB = deviceAreas[link.deviceBId]?.[ifaceBName];

    if (areaA && areaB && areaA !== areaB) {
      errors.push({
        id: `err-ospf-area-${link.id}`,
        ruleCode: 'RULE-08',
        severity: 'error',
        message: `OSPF area mismatch on link ${link.subnet}: ${link.deviceAId}/${ifaceAName} area ${areaA}, ${link.deviceBId}/${ifaceBName} area ${areaB}`,
        relatedDeviceIds: [link.deviceAId, link.deviceBId],
        relatedInterfaceIds: [link.interfaceAId, link.interfaceBId],
        relatedLinkId: link.id,
      });
    }

    // If one side has OSPF and the other doesn't at all
    if ((areaA && !areaB) || (!areaA && areaB)) {
      const hasOspfA = deviceAreas[link.deviceAId] !== undefined;
      const hasOspfB = deviceAreas[link.deviceBId] !== undefined;
      if (hasOspfA !== hasOspfB) {
        const offender = hasOspfA ? link.deviceBId : link.deviceAId;
        errors.push({
          id: `err-ospf-missing-${link.id}`,
          ruleCode: 'RULE-08',
          severity: 'warning',
          message: `OSPF not configured on ${offender} for link ${link.subnet}. Connected to a device with OSPF.`,
          relatedDeviceIds: [link.deviceAId, link.deviceBId],
          relatedInterfaceIds: [link.interfaceAId, link.interfaceBId],
          relatedLinkId: link.id,
        });
      }
    }
  }

  return errors;
}
