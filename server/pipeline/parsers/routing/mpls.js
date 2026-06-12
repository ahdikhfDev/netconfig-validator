/**
 * mpls.js — Parse RouterOS MPLS/LDP config sections.
 *
 * Extracts:
 *  - LDP interfaces
 *  - MPLS interface config
 */

export function parseMPLS(text) {
  const ldpInterfaces = [];

  // /mpls ldp interface add interface=ether2
  const ldpPattern = /^\/mpls\s+ldp\s+interface\s+add\s+(.*)$/gm;
  let match;
  while ((match = ldpPattern.exec(text)) !== null) {
    const params = match[1];
    const ifName = params.match(/interface=(\S+)/);
    if (ifName) {
      ldpInterfaces.push({ interface: ifName[1] });
    }
  }

  // /mpls interface add interface=ether2
  const mplsIfacePattern = /^\/mpls\s+interface\s+add\s+(.*)$/gm;
  while ((match = mplsIfacePattern.exec(text)) !== null) {
    const params = match[1];
    const ifName = params.match(/interface=(\S+)/);
    // same set, just mark ldpInterfaces as having MPLS enabled
    if (ifName && !ldpInterfaces.find((i) => i.interface === ifName[1])) {
      ldpInterfaces.push({ interface: ifName[1] });
    }
  }

  return { ldpInterfaces };
}
