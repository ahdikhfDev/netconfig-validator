/**
 * ospf.js — Parse RouterOS OSPF config sections.
 *
 * Extracts:
 *  - OSPF areas and associated networks
 *  - OSPF interfaces and their area assignment
 */

export function parseOSPF(text) {
  const areas = [];
  const interfaces = [];

  // /routing ospf network add network=10.100.13.0/30 area=0.0.0.0
  const netPattern = /^\/routing\s+ospf\s+network\s+add\s+(.*)$/gm;
  let match;
  while ((match = netPattern.exec(text)) !== null) {
    const params = match[1];
    const network = params.match(/network=([0-9./]+)/);
    const area = params.match(/area=([^\s]+)/);
    if (network) {
      areas.push({
        network: network[1],
        area: area ? area[1] : null,
      });
    }
  }

  // /routing ospf interface add interface=ether2 area=0.0.0.0
  const ifacePattern = /^\/routing\s+ospf\s+(?:interface|interface-template)\s+add\s+(.*)$/gm;
  while ((match = ifacePattern.exec(text)) !== null) {
    const params = match[1];
    const ifName = params.match(/interface=(\S+)/);
    const area = params.match(/area=([^\s]+)/);
    if (ifName) {
      interfaces.push({
        interface: ifName[1],
        area: area ? area[1] : null,
      });
    }
  }

  return { areas, interfaces };
}
