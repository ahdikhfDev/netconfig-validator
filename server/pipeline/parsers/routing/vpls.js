/**
 * vpls.js — Parse RouterOS VPLS config sections.
 *
 * Extracts:
 *  - VPLS interfaces with VPN ID
 */

export function parseVPLS(text) {
  const vplsInterfaces = [];

  // /interface vpls add name=vpls1 remote-peer=10.0.0.1 vpls-id=13:100       (v6)
  // /routing bgp vpls add name=vpls-ipb bridge=br-vpls-ipb rd=... site-id=1  (v7+)
  const vplsPattern = /^\/(?:interface\s+vpls|routing\s+bgp\s+vpls)\s+add\s+(.*)$/gm;
  let match;
  while ((match = vplsPattern.exec(text)) !== null) {
    const params = match[1];
    const name = params.match(/name=(\S+)/);
    // v7+ uses export-route-targets/import-route-targets, v6 uses vpls-id
    const vplsId = params.match(/vpls-id=([0-9:]+)/) || params.match(/(?:export|import)-route-targets=([0-9:]+)/);
    const remotePeer = params.match(/remote-peer=([0-9.]+)/);
    const bridge = params.match(/bridge=(\S+)/);
    const rd = params.match(/\brd=([0-9.]+:\d+)/);
    const mtu = params.match(/mtu=(\d+)/);
    const siteId = params.match(/site-id=(\d+)/);
    vplsInterfaces.push({
      name: name ? name[1] : 'unnamed',
      vplsId: vplsId ? vplsId[1] : null,
      remotePeer: remotePeer ? remotePeer[1] : null,
      bridge: bridge ? bridge[1] : null,
      rd: rd ? rd[1] : null,
      mtu: mtu ? parseInt(mtu[1], 10) : null,
      siteId: siteId ? parseInt(siteId[1], 10) : null,
    });
  }

  // Also check for /interface bridge vlan ... that might reference VPLS
  // This is a simpler approach — focus on /interface vpls add

  return { vplsInterfaces };
}
