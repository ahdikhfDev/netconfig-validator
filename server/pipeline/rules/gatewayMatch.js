/**
 * gatewayMatch.js — RULE-04 (gateway not in same subnet) & RULE-05 (gateway not found).
 */

import { ipToInt } from '../../utils/cidr.js';

export function gatewayMatchRule(devices, _links) {
  const errors = [];

  // Collect all IPs from all devices for RULE-05 lookup
  const allIPs = new Map(); // ip -> { deviceId, deviceName }
  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (iface.ip) allIPs.set(iface.ip, { deviceId: dev.id, deviceName: dev.name });
    }
  }

  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (!iface.gateway || !iface.ip || !iface.prefixLength) continue;

      // RULE-04: Gateway in same subnet?
      const gwInt = ipToInt(iface.gateway);
      const ifaceInt = ipToInt(iface.ip);
      const mask = ~(2 ** (32 - iface.prefixLength) - 1) >>> 0;
      const ifaceNet = ifaceInt & mask;
      const gwNet = gwInt & mask;

      if (ifaceNet !== gwNet) {
        errors.push({
          id: `err-gwsubnet-${iface.id}`,
          ruleCode: 'RULE-04',
          severity: 'error',
          message: `Gateway ${iface.gateway} is not in subnet ${iface.ip}/${iface.prefixLength} on ${dev.name}/${iface.name}`,
          relatedDeviceIds: [dev.id],
          relatedInterfaceIds: [iface.id],
          relatedLinkId: null,
        });
        continue;
      }

      // RULE-05: Gateway IP exists on any device?
      if (!allIPs.has(iface.gateway)) {
        errors.push({
          id: `err-gwnotfound-${iface.id}`,
          ruleCode: 'RULE-05',
          severity: 'warning',
          message: `Gateway ${iface.gateway} on ${dev.name}/${iface.name} not found on any device interface`,
          relatedDeviceIds: [dev.id],
          relatedInterfaceIds: [iface.id],
          relatedLinkId: null,
        });
      }
    }
  }

  return errors;
}
