/**
 * rules/index.js — Registry of all validation rules.
 * Each rule is a function (devices, links) => ValidationError[].
 */

import { ipConflictRule } from './ipConflict.js';
import { subnetPopulationRule } from './subnetPopulation.js';
import { gatewayMatchRule } from './gatewayMatch.js';
import { loopbackUniqueRule } from './loopbackUnique.js';
import { subnetOverlapRule } from './subnetOverlap.js';

const RULES = [
  ipConflictRule,
  subnetPopulationRule,
  gatewayMatchRule,
  loopbackUniqueRule,
  subnetOverlapRule,
];

export function runAllRules(devices, links) {
  const errors = [];
  for (const rule of RULES) {
    try {
      const result = rule(devices, links);
      if (result && result.length) errors.push(...result);
    } catch (err) {
      console.error(`Rule error:`, err);
    }
  }
  return errors;
}
