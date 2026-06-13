/**
 * bgp.js — Parse RouterOS BGP config sections.
 *
 * Extracts:
 *  - BGP instance (AS number, router-id)
 *  - BGP peers (neighbors)
 *  - L2VPN/EVPN address-family (vpn-id, route-target import/export, l2vpn signaling)
 *
 * Uses line-by-line parsing to handle continuation format correctly.
 */

export function parseBGP(text) {
  const instances = [];
  const peers = [];
  const l2vpn = [];

  const lines = text.split('\n');
  let section = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Track section context
    if (/^\/routing\s+bgp\s+(?:instance|template)/i.test(line)) {
      section = 'instances';
    } else if (/^\/routing\s+bgp\s+(?:peer|connection)/i.test(line)) {
      section = 'peers';
    } else if (/^\/routing\s+bgp\s+vpls/i.test(line)) {
      section = 'l2vpn';
    } else if (/^\//.test(line)) {
      // Any other section header resets context
      // (/ip route, /interface, etc.)
      section = null;
    }

    // --- Instances ---
    if (section === 'instances' && /^(?:\/routing\s+bgp\s+(?:instance|template)\s+)?(?:set|add)\s+(.*)$/i.test(line)) {
      const params = line.match(/^.*?(?:set|add)\s+(.*)$/i)?.[1] || '';
      const name = params.match(/(?:name|default)=(\S+)/);
      const asMatch = params.match(/\bas=(\d+)/);
      const routerId = params.match(/router-id=([0-9.]+)/);
      if (asMatch) {
        instances.push({
          name: name ? name[1] : 'default',
          asNumber: parseInt(asMatch[1], 10),
          routerId: routerId ? routerId[1] : null,
        });
      }
    }

    // --- Peers ---
    if (section === 'peers' && /^(?:\/routing\s+bgp\s+(?:peer|connection)\s+)?add\s+(.*)$/i.test(line)) {
      const params = line.match(/^(?:\/routing\s+bgp\s+(?:peer|connection)\s+)?add\s+(.*)$/i)?.[1] || '';
      const name = params.match(/name=(\S+)/);
      const remoteAddress = params.match(/remote[-.]address=([0-9.]+)/);
      const remoteAs = params.match(/remote[-.]as=(\d+)/);
      peers.push({
        name: name ? name[1] : 'unnamed',
        remoteAddress: remoteAddress ? remoteAddress[1] : null,
        remoteAs: remoteAs ? parseInt(remoteAs[1], 10) : null,
      });
    }

    // --- L2VPN / VPLS ---
    if (section === 'l2vpn' && /^(?:\/routing\s+bgp\s+vpls\s+)?add\s+(.*)$/i.test(line)) {
      const params = line.match(/^(?:\/routing\s+bgp\s+vpls\s+)?add\s+(.*)$/i)?.[1] || '';
      const name = params.match(/name=(\S+)/);
      const bridge = params.match(/bridge=(\S+)/);
      const siteId = params.match(/site-id=(\d+)/);
      const rd = params.match(/rd=([0-9.]+:\d+)/) || params.match(/route-distinguisher=([0-9.]+:\d+)/);
      const exportRt = params.match(/export-route-targets?=([0-9:]+)/);
      const importRt = params.match(/import-route-targets?=([0-9:]+)/);
      const vplsId = params.match(/vpls-id=([0-9:]+)/);
      l2vpn.push({
        name: name ? name[1] : 'unnamed',
        type: 'vpls',
        bridge: bridge ? bridge[1] : null,
        siteId: siteId ? parseInt(siteId[1], 10) : null,
        rd: rd ? rd[1] : null,
        exportRouteTarget: exportRt ? exportRt[1] : null,
        importRouteTarget: importRt ? importRt[1] : null,
        vplsId: vplsId ? vplsId[1] : null,
      });
    }
  }

  // Also check for EVPN address-family stanzas outside section context
  const evpnPattern = /^\/routing\s+bgp\s+(?:advertise-vpls|vpls-route-target)\s+add\s+(.*)$/gm;
  let match;
  while ((match = evpnPattern.exec(text)) !== null) {
    const params = match[1];
    const name = params.match(/name=(\S+)/);
    const routeTarget = params.match(/route-target=([0-9:]+)/);
    l2vpn.push({
      name: name ? name[1] : 'unnamed',
      type: 'evpn',
      bridge: null,
      siteId: null,
      rd: null,
      exportRouteTarget: routeTarget ? routeTarget[1] : null,
      importRouteTarget: null,
      vplsId: null,
    });
  }

  return { instances, peers, l2vpn };
}