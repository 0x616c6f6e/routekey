import { describe, expect, it } from 'vitest';
import { generatePacScript } from '../../src/background/pac-generator';
import type { ProxyRule } from '../../src/types';
import { node } from './fixtures';

describe('generatePacScript', () => {
  it('generates bypass, proxy and direct decisions in order', () => {
    const rules: ProxyRule[] = [
      { id: '1', type: 'domain-suffix', value: 'example.com', action: 'proxy', enabled: true },
      { id: '2', type: 'domain', value: 'private.example.com', action: 'direct', enabled: true },
    ];
    const pac = generatePacScript(node, rules, ['localhost', '*.local']);
    expect(pac).toContain('host === "localhost"');
    expect(pac).toContain('dnsDomainIs(host, "." + "example.com")');
    expect(pac).toContain('return "SOCKS5 127.0.0.1:1080"');
    expect(pac).toMatch(/return "DIRECT";\n}$/);
  });

  it('quotes rule text instead of inserting executable input', () => {
    const malicious = '"); return "PROXY attacker:1"; //';
    const pac = generatePacScript(
      node,
      [{ id: '1', type: 'domain-keyword', value: malicious, action: 'proxy', enabled: true }],
      [],
    );
    expect(pac).toContain(JSON.stringify(malicious.toLowerCase()));
    expect(pac).not.toContain(`host.indexOf("${malicious}")`);
  });

  it('skips unsupported IP-CIDR rules', () => {
    const pac = generatePacScript(
      node,
      [{ id: '1', type: 'ip-cidr', value: '10.0.0.0/8', action: 'proxy', enabled: true }],
      [],
    );
    expect(pac).not.toContain('10.0.0.0');
  });
});
