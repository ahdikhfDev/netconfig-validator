/**
 * gatewayMatch.test.js — Tests for split RULE-04 / RULE-05.
 */

import { describe, it, expect } from 'vitest';
import { gatewaySubnetRule, gatewayReachabilityRule } from './gatewayMatch.js';

const makeDevice = (id, name, interfaces) => ({ id, name, interfaces });

// Fixture: Dev-1 has gateway 192.168.1.1 which IS present on Dev-3
//         Dev-1 eth1 gateway 10.10.13.2 IS present on Dev-2
//         Dev-2 eth0 gateway 192.168.1.254 is NOT on any device
const DEVICES_REACHABLE = [
  makeDevice('dev1', 'Dev-1', [
    { id: 'eth0', name: 'eth0', ip: '192.168.1.10', prefixLength: 24, gateway: '192.168.1.1' },
    { id: 'eth1', name: 'eth1', ip: '10.10.13.1', prefixLength: 30, gateway: '10.10.13.2' },
  ]),
  makeDevice('dev2', 'Dev-2', [
    { id: 'eth0', name: 'eth0', ip: '10.10.13.2', prefixLength: 30 }, // this IS the gateway for Dev-1 eth1
  ]),
  makeDevice('dev3', 'Dev-3', [
    { id: 'eth0', name: 'eth0', ip: '192.168.1.1', prefixLength: 24 }, // this IS the gateway for Dev-1 eth0
  ]),
];

// Fixture: same gateways but none present on any device
const DEVICES_UNREACHABLE = [
  makeDevice('dev1', 'Dev-1', [
    { id: 'eth0', name: 'eth0', ip: '192.168.1.10', prefixLength: 24, gateway: '192.168.1.1' },
    { id: 'eth1', name: 'eth1', ip: '10.10.13.1', prefixLength: 30, gateway: '10.10.13.2' },
  ]),
  makeDevice('dev2', 'Dev-2', [
    { id: 'eth0', name: 'eth0', ip: '192.168.1.11', prefixLength: 24, gateway: '192.168.1.254' },
  ]),
];

describe('RULE-04 — gatewaySubnetRule', () => {
  it('returns no errors when gateway is in same subnet', () => {
    const errors = gatewaySubnetRule(DEVICES_REACHABLE, []);
    const subnetErrors = errors.filter((e) => e.ruleCode === 'RULE-04');
    expect(subnetErrors.length).toBe(0);
  });

  it('catches gateway NOT in same subnet', () => {
    const badDevices = [
      makeDevice('dev1', 'Dev-1', [
        { id: 'eth0', name: 'eth0', ip: '192.168.1.10', prefixLength: 24, gateway: '10.0.0.1' },
      ]),
    ];
    const errors = gatewaySubnetRule(badDevices, []);
    expect(errors[0].ruleCode).toBe('RULE-04');
    expect(errors[0].severity).toBe('error');
  });

  it('skips interface with no gateway', () => {
    const devices = [
      makeDevice('dev1', 'Dev-1', [
        { id: 'eth0', name: 'eth0', ip: '192.168.1.10', prefixLength: 24 },
      ]),
    ];
    const errors = gatewaySubnetRule(devices, []);
    expect(errors.length).toBe(0);
  });
});

describe('RULE-05 — gatewayReachabilityRule', () => {
  it('no error when gateway IP exists on another device', () => {
    const errors = gatewayReachabilityRule(DEVICES_REACHABLE, []);
    const reachErrors = errors.filter((e) => e.ruleCode === 'RULE-05');
    // Both dev1 gateways are reachable (192.168.1.1 on dev3, 10.10.13.2 on dev2)
    expect(reachErrors.length).toBe(0);
  });

  it('flags gateway IP not found on any device', () => {
    const errors = gatewayReachabilityRule(DEVICES_UNREACHABLE, []);
    const unreach = errors.filter((e) => e.ruleCode === 'RULE-05');
    // 2 gateways not found: 192.168.1.1 and 10.10.13.2 (not on any device), plus 192.168.1.254
    expect(unreach.length).toBe(3);
    expect(unreach[0].message).toContain('192.168.1.1');
    expect(unreach[0].severity).toBe('warning');
  });

  it('skips interface with no gateway', () => {
    const devices = [
      makeDevice('dev1', 'Dev-1', [
        { id: 'eth0', name: 'eth0', ip: '192.168.1.10', prefixLength: 24 },
      ]),
    ];
    const errors = gatewayReachabilityRule(devices, []);
    expect(errors.length).toBe(0);
  });
});

describe('no duplication between RULE-04 and RULE-05', () => {
  it('RULE-04 and RULE-05 run independently', () => {
    const subnetErrors = gatewaySubnetRule(DEVICES_REACHABLE, []);
    const reachErrors = gatewayReachabilityRule(DEVICES_REACHABLE, []);
    // They don't interfere with each other's logic
    expect(subnetErrors.filter((e) => e.ruleCode === 'RULE-05').length).toBe(0);
    expect(reachErrors.filter((e) => e.ruleCode === 'RULE-04').length).toBe(0);
  });
});