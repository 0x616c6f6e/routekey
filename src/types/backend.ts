export interface BackendSettings {
  type: 'native' | 'mihomo';
  apiUrl?: string;
  secret?: string;
  localProxyHost?: string;
  localProxyPort?: number;
}
