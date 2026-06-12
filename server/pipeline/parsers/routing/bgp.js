/**
 * bgp.js — Parse RouterOS BGP config sections.
 *
 * Extracts:
 *  - BGP instance (AS number)
 *  - BGP peers (neighbors)
 */

export function parseBGP(text) {
  const instances = [];
  const peers = [];

  // /routing bgp instance set default ... as=77133 ...
  // /routing bgp instance add name=... as=77133 ...
  const instPattern = /^\/routing\s+bgp\s+(?:instance|template)\s+(?:set|add)\s+(.*)$/gm;
  let match;
  while ((match = instPattern.exec(text)) !== null) {
    const params = match[1];
    const name = params.match(/(?:name|default)=(\S+)/);
    // Extract AS number
    const asMatch = params.match(/\bas=(\d+)/);
    const routerId = params.match(/router-id=([0-9.]+)/);
    instances.push({
      name: name ? name[1] : 'default',
      asNumber: asMatch ? parseInt(asMatch[1], 10) : null,
      routerId: routerId ? routerId[1] : null,
    });
  }

  // /routing bgp peer add name=peer1 remote-address=10.10.13.4 remote-as=77133
  const peerPattern = /^\/routing\s+bgp\s+peer\s+add\s+(.*)$/gm;
  while ((match = peerPattern.exec(text)) !== null) {
    const params = match[1];
    const name = params.match(/name=(\S+)/);
    const remoteAddress = params.match(/remote-address=([0-9.]+)/);
    const remoteAs = params.match(/remote-as=(\d+)/);
    peers.push({
      name: name ? name[1] : 'unnamed',
      remoteAddress: remoteAddress ? remoteAddress[1] : null,
      remoteAs: remoteAs ? parseInt(remoteAs[1], 10) : null,
    });
  }

  return { instances, peers };
}
