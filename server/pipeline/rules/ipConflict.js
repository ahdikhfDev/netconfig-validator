/**
 * ipConflict.js — RULE-01: Two interfaces (different devices) with same IP.
 */

export function ipConflictRule(devices, _links) {
  const errors = [];

  // Map IP -> list of (deviceId, deviceName, iface)
  const ipMap = {};
  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      if (!iface.ip) continue;
      if (!ipMap[iface.ip]) ipMap[iface.ip] = [];
      ipMap[iface.ip].push({
        deviceId: dev.id,
        deviceName: dev.name,
        interfaceId: iface.id,
        interfaceName: iface.name,
        ip: iface.ip,
      });
    }
  }

  for (const [ip, entries] of Object.entries(ipMap)) {
    if (entries.length < 2) continue;
    errors.push({
      id: `err-ipconflict-${ip}`,
      ruleCode: 'RULE-01',
      severity: 'error',
      message: `IP conflict: ${ip} used by ${entries.map((e) => `${e.deviceName}/${e.interfaceName}`).join(', ')}`,
      relatedDeviceIds: entries.map((e) => e.deviceId),
      relatedInterfaceIds: entries.map((e) => e.interfaceId),
      relatedLinkId: null,
    });
  }

  return errors;
}
