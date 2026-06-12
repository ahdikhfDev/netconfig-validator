/**
 * responseFormatter.js — Assemble final API response.
 */

export function formatResponse(devices, links, errors) {
  // Flatten interfaces into a separate list with device refs
  const interfaces = [];
  for (const dev of devices) {
    for (const iface of dev.interfaces) {
      interfaces.push({ ...iface, deviceId: dev.id, deviceName: dev.name });
    }
  }

  // Strip rawConfig from response to keep it lean
  const devicesClean = devices.map((d) => {
    const obj = {
      id: d.id,
      name: d.name,
      vendorType: d.vendorType,
      loopback: d.loopback,
      interfaces: d.interfaces.map((iface) => ({
        id: iface.id,
        name: iface.name,
        ip: iface.ip,
        prefixLength: iface.prefixLength,
        networkAddr: iface.networkAddr,
        role: iface.role,
      })),
      parseWarnings: d.parseWarnings,
      protocols: d.protocols || [],
    };
    // Include routing config if present (Fase 2)
    if (d.routingConfig) {
      obj.routingConfig = d.routingConfig;
    }
    return obj;
  });

  return {
    devices: devicesClean,
    interfaces,
    links,
    errors,
    summary: {
      totalDevices: devices.length,
      totalInterfaces: interfaces.length,
      totalLinks: links.length,
      totalErrors: errors.length,
      errorCount: errors.filter((e) => e.severity === 'error').length,
      warningCount: errors.filter((e) => e.severity === 'warning').length,
    },
  };
}
