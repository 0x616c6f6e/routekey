import { describe, expect, it } from 'vitest';
import { matchesRule } from '../../src/background/pac-generator';
import type { ProxyRule } from '../../src/types';

const makeRule = (type: ProxyRule['type'], value: string): ProxyRule => ({
  id: 'rule',
  type,
  value,
  action: 'proxy',
  enabled: true,
});

describe('matchesRule', () => {
  it('matches an exact domain without matching a subdomain', () => {
    const rule = makeRule('domain', 'example.com');
    expect(matchesRule('example.com', rule)).toBe(true);
    expect(matchesRule('www.example.com', rule)).toBe(false);
  });

  it('matches suffixes only at a domain boundary', () => {
    const rule = makeRule('domain-suffix', '*.example.com');
    expect(matchesRule('api.example.com', rule)).toBe(true);
    expect(matchesRule('badexample.com', rule)).toBe(false);
  });

  it('ignores disabled and IP-CIDR rules', () => {
    expect(
      matchesRule('example.com', { ...makeRule('domain', 'example.com'), enabled: false }),
    ).toBe(false);
    expect(matchesRule('10.0.0.1', makeRule('ip-cidr', '10.0.0.0/8'))).toBe(false);
  });
});
