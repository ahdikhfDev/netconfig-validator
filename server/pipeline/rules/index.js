/**
 * rules/index.js — Registry of all validation rules.
 * Each rule is a function (devices, links) => ValidationError[].
 */

import { ipConflictRule } from './ipConflict.js';
import { subnetPopulationRule } from './subnetPopulation.js';
import { gatewayMatchRule } from './gatewayMatch.js';
import { loopbackUniqueRule } from './loopbackUnique.js';
import { subnetOverlapRule } from './subnetOverlap.js';
import { ospfAreaMismatchRule } from './ospfAreaMismatch.js';
import { bgpPeerUnreachableRule } from './bgpPeerUnreachable.js';
import { mplsLdpInconsistentRule } from './mplsLdpInconsistent.js';
import { vplsVpnIdMismatchRule } from './vplsVpnIdMismatch.js';

const RULES = [
  // Phase 1: Core
  { code: 'RULE-01', fn: ipConflictRule, weight: 10 },
  { code: 'RULE-02', fn: subnetPopulationRule, weight: 9 },
  // RULE-03 underpopulated handled inside subnetPopulationRule
  { code: 'RULE-04', fn: gatewayMatchRule, weight: 7 },
  { code: 'RULE-05', fn: gatewayMatchRule, weight: 7 },
  { code: 'RULE-06', fn: loopbackUniqueRule, weight: 6 },
  { code: 'RULE-07', fn: subnetOverlapRule, weight: 8 },

  // Phase 2: Routing protocols
  { code: 'RULE-08', fn: ospfAreaMismatchRule, weight: 8 },
  { code: 'RULE-09', fn: bgpPeerUnreachableRule, weight: 9 },
  { code: 'RULE-10', fn: mplsLdpInconsistentRule, weight: 6 },
  { code: 'RULE-11', fn: vplsVpnIdMismatchRule, weight: 8 },
];

export function runAllRules(devices, links) {
  const allErrors = [];
  for (const rule of RULES) {
    try {
      const errors = rule.fn(devices, links);
      if (Array.isArray(errors)) {
        allErrors.push(...errors);
      }
    } catch (err) {
      console.error(`Rule ${rule.code} error:`, err);
    }
  }
  return allErrors;
}
