/**
 * gatewayMatch.js — Split into RULE-04 and RULE-05.
 * RULE-04: gateway not in same subnet as interface IP
 * RULE-05: gateway IP not found on any device interface
 */

import { ipToInt } from '../../utils/cidr.js';

/**
 * RULE-04: Check that every interface with a gateway has it in the same subnet.
 */
export function gatewaySubnetRule(devices, _links) {
  const errors = [];

  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (!iface.gateway || !iface.ip || !iface.prefixLength) continue;

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
      }
    }
  }

  return errors;
}

/**
 * RULE-05: Check that every gateway IP exists on some device's interface.
 */
export function gatewayReachabilityRule(devices, _links) {
  const errors = [];

  // Collect all IPs from all devices
  const allIPs = new Set();
  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (iface.ip) allIPs.add(iface.ip);
    }
  }

  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (!iface.gateway) continue;

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