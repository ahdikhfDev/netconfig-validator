/**
 * bgpPeerUnreachable.js — RULE-09: BGP neighbor IP doesn't match
 * any device IP or loopback in the topology.
 */

export function bgpPeerUnreachableRule(devices, _links) {
  const errors = [];

  // Collect all IPs and loopbacks across devices
  const allIps = {};
  for (const dev of devices) {
    allIps[dev.id] = {
      name: dev.name,
      ips: new Set(),
    };
    for (const iface of dev.interfaces) {
      allIps[dev.id].ips.add(iface.ip);
    }
    if (dev.loopback) {
      allIps[dev.id].ips.add(dev.loopback.split('/')[0]);
    }
  }

  // Check each device's BGP peers
  for (const dev of devices) {
    const bgpPeers = dev.routingConfig?.bgp?.peers || [];
    for (const peer of bgpPeers) {
      if (!peer.remoteAddress) continue;

      // Check if remoteAddress exists in any device's IPs
      let found = false;
      let foundOnDevice = null;
      for (const [otherId, info] of Object.entries(allIps)) {
        if (otherId === dev.id) continue; // shouldn't match its own IP
        if (info.ips.has(peer.remoteAddress)) {
          found = true;
          foundOnDevice = info.name;
          break;
        }
      }

      if (!found) {
        errors.push({
          id: `err-bgp-peer-${dev.id}-${peer.name}`,
          ruleCode: 'RULE-09',
          severity: 'error',
          message: `BGP peer ${peer.name} (${peer.remoteAddress}) on ${dev.name} does not match any device IP or loopback in the topology`,
          relatedDeviceIds: [dev.id],
          relatedInterfaceIds: [],
          relatedLinkId: null,
        });
      } else {
        // Warn if AS number mismatch
        if (peer.remoteAs && dev.routingConfig?.bgp?.instances?.length > 0) {
          const localAs = dev.routingConfig.bgp.instances[0].asNumber;
          // We'd need to know the remote device's AS — for now note the peer
          // Check if local AS == remote AS (which is OK for iBGP but not eBGP)
          // This is a simplified check
        }
      }
    }
  }

  return errors;
}
