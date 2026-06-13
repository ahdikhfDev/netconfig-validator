/**
 * routeros.test.js — Tests for RouterOS parser.
 */

import { describe, it, expect } from 'vitest';
import { parseRouterOS } from './pipeline/parsers/routeros.js';

const PE1_CONFIG = `
/interface ethernet
set [ find default-name=ether1 ] name=ether1-wan
set [ find default-name=ether2 ] name=ether2-core
/ip address
add address=10.10.13.2/30 interface=ether1-wan
add address=192.168.1.2/24 interface=bridge1
add address=10.0.0.2/32 interface=lo
/routing bgp instance
set default as=77133 router-id=10.0.0.2
/routing bgp peer
add name=to-pe2 remote-address=10.10.13.1 remote-as=77133
add name=to-pe3 remote-address=10.10.13.5 remote-as=77133
/routing ospf area
add name=backbone area-id=0.0.0.0 instance=ospf1
/routing bgp vpls
add name=vpls-ipb bridge=br-vpls-ipb rd=77133:100 export-route-targets=13:100 import-route-targets=13:100
/ip route
add dst-address=0.0.0.0/0 gateway=10.10.13.1 distance=1
add dst-address=10.100.0.0/16 gateway=10.10.13.6 routing-mark=VRF-CUSTOMER
`;

const PE1_RESULT = parseRouterOS(PE1_CONFIG);

describe('RouterOS parser', () => {
  describe('loopback detection', () => {
    it('extracts loopback IP from continuation format', () => {
      expect(PE1_RESULT.loopback).toBe('10.0.0.2/32');
    });

    it('returns null loopback for config without lo interface', () => {
      const result = parseRouterOS('/ip address add address=10.0.0.1/24 interface=ether1');
      expect(result.loopback).toBeNull();
    });
  });

  describe('IP address parsing', () => {
    it('parses multiple non-loopback interfaces', () => {
      expect(PE1_RESULT.interfaces.length).toBeGreaterThanOrEqual(2);
    });

    it('sets correct prefix length', () => {
      const wanIface = PE1_RESULT.interfaces.find(
        (i) => i.ip === '10.10.13.2'
      );
      expect(wanIface.prefixLength).toBe(30);
    });

    it('sets interface name correctly', () => {
      const wanIface = PE1_RESULT.interfaces.find(
        (i) => i.ip === '10.10.13.2'
      );
      expect(wanIface.name).toBe('ether1-wan');
    });

    it('classifies bridge* as lan role', () => {
      const bridgeIface = PE1_RESULT.interfaces.find(
        (i) => i.ip === '192.168.1.2'
      );
      expect(bridgeIface.role).toBe('lan');
    });

    it('computes networkAddr and broadcastAddr correctly', () => {
      const wanIface = PE1_RESULT.interfaces.find(
        (i) => i.ip === '10.10.13.2'
      );
      expect(wanIface.networkAddr).toBe('10.10.13.0');
      expect(wanIface.broadcastAddr).toBe('10.10.13.3');
    });
  });

  describe('static route parsing', () => {
    it('parses default route', () => {
      const routes = PE1_RESULT.routing.staticRoutes;
      const defaultRoute = routes.find((r) => r.dstAddress === '0.0.0.0/0');
      expect(defaultRoute).toBeDefined();
      expect(defaultRoute.gateway).toBe('10.10.13.1');
      expect(defaultRoute.distance).toBe(1);
    });

    it('parses VRF static route with routing-mark', () => {
      const routes = PE1_RESULT.routing.staticRoutes;
      const vrfRoute = routes.find(
        (r) => r.routingMark === 'VRF-CUSTOMER'
      );
      expect(vrfRoute).toBeDefined();
      expect(vrfRoute.dstAddress).toBe('10.100.0.0/16');
      expect(vrfRoute.gateway).toBe('10.10.13.6');
    });

    it('registers static protocol when routes present', () => {
      expect(PE1_RESULT.protocols).toContain('static');
    });

    it('returns empty staticRoutes array for config without routes', () => {
      const result = parseRouterOS('/ip address add address=10.0.0.1/24 interface=ether1');
      expect(result.routing.staticRoutes).toEqual([]);
    });
  });

  describe('BGP L2VPN parsing', () => {
    it('extracts route-target import/export from v7 vpls stanza', () => {
      const l2vpn = PE1_RESULT.routing.bgp.l2vpn;
      expect(l2vpn.length).toBeGreaterThan(0);
      const vpls = l2vpn.find((s) => s.name === 'vpls-ipb');
      expect(vpls).toBeDefined();
      expect(vpls.rd).toBe('77133:100');
      expect(vpls.exportRouteTarget).toBe('13:100');
      expect(vpls.importRouteTarget).toBe('13:100');
      expect(vpls.type).toBe('vpls');
    });
  });

  describe('BGP instance & peer', () => {
    it('extracts AS number and router-id', () => {
      const { instances } = PE1_RESULT.routing.bgp;
      expect(instances[0].asNumber).toBe(77133);
      expect(instances[0].routerId).toBe('10.0.0.2');
    });

    it('extracts BGP peers with v6 and v7 syntax', () => {
      const { peers } = PE1_RESULT.routing.bgp;
      expect(peers.length).toBe(2);
      expect(peers[0].remoteAddress).toBe('10.10.13.1');
      expect(peers[0].remoteAs).toBe(77133);
    });
  });

  describe('protocol detection', () => {
    it('detects bgp protocol', () => {
      expect(PE1_RESULT.protocols).toContain('bgp');
    });
    it('detects ospf protocol', () => {
      expect(PE1_RESULT.protocols).toContain('ospf');
    });
  });

  describe('edge cases', () => {
    it('handles inline format: /ip address add address=X/Y interface=Z', () => {
      const result = parseRouterOS(
        '/ip address add address=1.2.3.4/30 interface=ether2'
      );
      expect(result.interfaces.length).toBe(1);
      expect(result.interfaces[0].ip).toBe('1.2.3.4');
    });

    it('marks disabled interfaces', () => {
      const result = parseRouterOS(
        '/ip address add address=1.2.3.4/24 interface=ether1 disabled=yes'
      );
      const iface = result.interfaces.find((i) => i.ip === '1.2.3.4');
      expect(iface.disabled).toBe(true);
    });

    it('returns empty arrays for minimal config', () => {
      const result = parseRouterOS('/system identity set name=R1');
      expect(result.interfaces).toEqual([]);
      expect(result.routing.staticRoutes).toEqual([]);
      expect(result.routing.bgp.instances).toEqual([]);
    });
  });
});