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

  // RouterOS v7+ OSPF area definition:
  //   /routing ospf area add instance=ospf1 name=backbone area-id=0.0.0.0
  // Older v6:
  //   /routing ospf network add network=10.100.13.0/30 area=0.0.0.0
  const areaPattern = /^\/routing\s+ospf\s+(?:area|network)\s+add\s+(.*)$/gm;
  let match;
  while ((match = areaPattern.exec(text)) !== null) {
    const params = match[1];
    const name = params.match(/name=(\S+)/);
    const network = params.match(/network=([0-9./]+)/);
    const area = params.match(/area=([^\s]+)/);
    const instance = params.match(/instance=(\S+)/);
    const areaId = params.match(/area-id=([0-9.]+)/);
    if (network) {
      areas.push({
        network: network[1],
        area: area ? area[1] : null,
      });
    } else if (name || areaId) {
      areas.push({
        network: instance ? `instance:${instance[1]}` : null,
        area: areaId ? areaId[1] : (name ? name[1] : null),
        name: name ? name[1] : null,
      });
    }
  }

  // RouterOS v7+ interface-template format:
  //   /routing ospf interface-template add area=backbone networks=10.10.13.1/32
  // Older v6:
  //   /routing ospf interface add interface=ether2 area=0.0.0.0
  const ifacePattern = /^\/routing\s+ospf\s+(?:interface|interface-template)\s+add\s+(.*)$/gm;
  while ((match = ifacePattern.exec(text)) !== null) {
    const params = match[1];
    const ifName = params.match(/interface=(\S+)/) || params.match(/networks=([0-9./]+)/);
    const area = params.match(/area=([^\s]+)/);
    if (ifName) {
      interfaces.push({
        interface: ifName[1],
        area: area ? area[1] : null,
        isTemplate: params.includes('networks=') || params.startsWith('networks='),
      });
    }
  }

  return { areas, interfaces };
}
