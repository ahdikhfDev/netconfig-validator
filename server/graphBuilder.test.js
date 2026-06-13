/**
 * graphBuilder.test.js — Tests for topology link builder.
 */

import { describe, it, expect } from 'vitest';
import { buildGraph, classifyLinkType } from './pipeline/graphBuilder.js';

const makeDevice = (id, name, interfaces) => ({ id, name, interfaces });

const P2P_DEVICES = [
  makeDevice('pe-1', 'PE-1', [
    { id: 'eth0-10.10.13.1', name: 'eth0', ip: '10.10.13.1', prefixLength: 30, role: 'wan' },
  ]),
  makeDevice('pe-2', 'PE-2', [
    { id: 'eth0-10.10.13.2', name: 'eth0', ip: '10.10.13.2', prefixLength: 30, role: 'wan' },
  ]),
];

const LAN_DEVICES = [
  makeDevice('ce-1', 'CE-1', [
    { id: 'eth0-192.168.1.10', name: 'eth0', ip: '192.168.1.10', prefixLength: 24, role: 'lan' },
  ]),
  makeDevice('host-1', 'Host-1', [
    { id: 'eth0-192.168.1.11', name: 'eth0', ip: '192.168.1.11', prefixLength: 24, role: 'lan' },
  ]),
  makeDevice('host-2', 'Host-2', [
    { id: 'eth0-192.168.1.12', name: 'eth0', ip: '192.168.1.12', prefixLength: 24, role: 'lan' },
  ]),
];

const MIXED_DEVICES = [
  makeDevice('pe-1', 'PE-1', [
    { id: 'e1-10.10.13.1', name: 'ether1', ip: '10.10.13.1', prefixLength: 30, role: 'wan' },
    { id: 'lo-10.0.0.1', name: 'lo', ip: '10.0.0.1', prefixLength: 32, role: 'loopback' },
  ]),
  makeDevice('pe-2', 'PE-2', [
    { id: 'e1-10.10.13.2', name: 'ether1', ip: '10.10.13.2', prefixLength: 30, role: 'wan' },
    { id: 'lo-10.0.0.2', name: 'lo', ip: '10.0.0.2', prefixLength: 32, role: 'loopback' },
    { id: 'e2-10.10.13.5', name: 'ether2', ip: '10.10.13.5', prefixLength: 30, role: 'wan' },
  ]),
  makeDevice('pe-3', 'PE-3', [
    { id: 'e1-10.10.13.6', name: 'ether1', ip: '10.10.13.6', prefixLength: 30, role: 'wan' },
    { id: 'lo-10.0.0.3', name: 'lo', ip: '10.0.0.3', prefixLength: 32, role: 'loopback' },
  ]),
];

describe('classifyLinkType', () => {
  it('/30 → p2p', () => expect(classifyLinkType(30)).toBe('p2p'));
  it('/31 → p2p', () => expect(classifyLinkType(31)).toBe('p2p'));
  it('/32 → p2p', () => expect(classifyLinkType(32)).toBe('p2p'));
  it('/29 → broadcast', () => expect(classifyLinkType(29)).toBe('broadcast'));
  it('/24 → broadcast', () => expect(classifyLinkType(24)).toBe('broadcast'));
  it('/16 → broadcast', () => expect(classifyLinkType(16)).toBe('broadcast'));
});

describe('buildGraph — P2P links (/30)', () => {
  const links = buildGraph(P2P_DEVICES);

  it('creates 1 link for 2 devices on same /30', () => {
    expect(links.length).toBe(1);
  });

  it('link status = valid for 2 devices', () => {
    expect(links[0].status).toBe('valid');
  });

  it('linkType = p2p for /30', () => {
    expect(links[0].linkType).toBe('p2p');
  });

  it('both device IDs populated', () => {
    expect(links[0].deviceAId).toBe('pe-1');
    expect(links[0].deviceBId).toBe('pe-2');
  });
});

describe('buildGraph — LAN broadcast links (/24)', () => {
  const links = buildGraph(LAN_DEVICES);

  it('creates N-1 links for N devices on same /24', () => {
    // 3 devices = 2 links (0↔1, 0↔2)
    expect(links.length).toBe(2);
  });

  it('all links on LAN subnet marked as broadcast', () => {
    for (const l of links) {
      expect(l.linkType).toBe('broadcast');
    }
  });

  it('all links on LAN subnet marked as valid (not overpopulated)', () => {
    for (const l of links) {
      expect(l.status).toBe('valid');
    }
  });
});

describe('buildGraph — underpopulated', () => {
  it('single device on subnet → underpopulated', () => {
    const devices = [
      makeDevice('orphan', 'Orphan', [
        { id: 'eth0-10.10.13.1', name: 'eth0', ip: '10.10.13.1', prefixLength: 30, role: 'wan' },
      ]),
    ];
    const links = buildGraph(devices);
    expect(links[0].status).toBe('underpopulated');
  });
});

describe('buildGraph — mixed topology', () => {
  const links = buildGraph(MIXED_DEVICES);

  it('excludes loopback interfaces from graph', () => {
    const loLinks = links.filter(
      (l) => l.deviceAId === 'pe-1' && l.interfaceAId === 'lo-10.0.0.1'
    );
    expect(loLinks.length).toBe(0);
  });

  it('creates P2P links for core-facing interfaces', () => {
    const p2pLinks = links.filter((l) => l.linkType === 'p2p');
    expect(p2pLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('no false overpopulated on P2P links', () => {
    expect(links.filter((l) => l.linkType === 'p2p' && l.status === 'overpopulated').length).toBe(0);
  });
});

describe('buildGraph — overpopulated P2P guard', () => {
  it('3 devices on /30 flagged as overpopulated', () => {
    const devices = [
      makeDevice('a', 'A', [{ id: 'eth0-10.10.13.1', name: 'eth0', ip: '10.10.13.1', prefixLength: 30, role: 'wan' }]),
      makeDevice('b', 'B', [{ id: 'eth0-10.10.13.2', name: 'eth0', ip: '10.10.13.2', prefixLength: 30, role: 'wan' }]),
      makeDevice('c', 'C', [{ id: 'eth0-10.10.13.3', name: 'eth0', ip: '10.10.13.3', prefixLength: 30, role: 'wan' }]),
    ];
    const links = buildGraph(devices);
    const overpop = links.filter((l) => l.status === 'overpopulated');
    expect(overpop.length).toBeGreaterThan(0);
    expect(overpop[0].linkType).toBe('p2p');
  });
});