export type RuleAction = 'proxy' | 'direct';
export type RuleType = 'domain' | 'domain-suffix' | 'domain-keyword' | 'ip-cidr';

export interface ProxyRule {
  id: string;
  type: RuleType;
  value: string;
  action: RuleAction;
  enabled: boolean;
}
