/**
 * cidr.js — Network calculation helpers.
 */

export function networkKey(ip, prefix) {
  const mask = ~(2 ** (32 - prefix) - 1) >>> 0;
  return `${intToIp(ipToInt(ip) & mask)}/${prefix}`;
}

export function ipToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

export function intToIp(num) {
  return [(num >>> 24), (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
}

export function cidrToRange(cidr) {
  const [ip, bits] = cidr.split('/');
  const prefix = parseInt(bits, 10);
  const mask = ~(2 ** (32 - prefix) - 1) >>> 0;
  const start = ipToInt(ip) & mask;
  const end = start | (~mask >>> 0);
  return { start, end, prefix };
}

export function rangesOverlap(a, b) {
  return a.start <= b.end && b.start <= a.end;
}
