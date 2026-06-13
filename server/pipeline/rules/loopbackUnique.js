/**
 * loopbackUnique.js — RULE-06: Duplicate loopback /32 addresses.
 */

export function loopbackUniqueRule(devices, _links) {
  const errors = [];
  const loMap = {}; // ip -> device names[]

  for (const dev of devices) {
    if (dev.loopback) {
      if (!loMap[dev.loopback]) loMap[dev.loopback] = [];
      loMap[dev.loopback].push(dev.name);
    }
    // Also check interfaces named 'lo'
    for (const iface of dev.interfaces) {
      if ((iface.name === 'lo' || iface.id === 'lo') && iface.ip) {
        if (!loMap[iface.ip]) loMap[iface.ip] = [];
        loMap[iface.ip].push(dev.name);
      }
    }
  }

  for (const [ip, names] of Object.entries(loMap)) {
    if (names.length < 2) continue;
    errors.push({
      id: `err-lodup-${ip.replace(/[/.]/g, '-')}`,
      ruleCode: 'RULE-06',
      severity: 'error',
      message: `Duplicate loopback: ${ip} used by ${names.join(', ')}`,
      relatedDeviceIds: devices.filter((d) => names.includes(d.name)).map((d) => d.id),
      relatedInterfaceIds: [],
      relatedLinkId: null,
    });
  }

  return errors;
}
