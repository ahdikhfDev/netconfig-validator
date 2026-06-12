/**
 * subnetOverlap.js — RULE-07: Two different subnets that overlap.
 */

import { cidrToRange, rangesOverlap } from '../../utils/cidr.js';

export function subnetOverlapRule(devices, links) {
  const errors = [];
  const seenSubnets = new Set();

  // Collect all unique subnets from links
  for (const link of links) {
    if (seenSubnets.has(link.subnet)) continue;
    seenSubnets.add(link.subnet);
  }

  const subnets = Array.from(seenSubnets).map((s) => ({ cidr: s, range: cidrToRange(s) }));

  for (let i = 0; i < subnets.length; i++) {
    for (let j = i + 1; j < subnets.length; j++) {
      const a = subnets[i];
      const b = subnets[j];

      // Skip exact match (handled by population rules)
      if (a.cidr === b.cidr) continue;

      if (rangesOverlap(a.range, b.range)) {
        errors.push({
          id: `err-overlap-${i}-${j}`,
          ruleCode: 'RULE-07',
          severity: 'warning',
          message: `Subnet overlap: ${a.cidr} overlaps with ${b.cidr}`,
          relatedDeviceIds: [],
          relatedInterfaceIds: [],
          relatedLinkId: null,
        });
      }
    }
  }

  return errors;
}
