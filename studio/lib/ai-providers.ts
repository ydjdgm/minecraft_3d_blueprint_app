// Shared display metadata only. Credentials stay in the page's in-memory state.
export const aiProviders = {
  openai: {label: 'OpenAI', defaultModel: 'gpt-5.4-mini', keyPlaceholder: 'sk-…'},
  anthropic: {label: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-6', keyPlaceholder: 'sk-ant-…'},
  google: {label: 'Google Gemini', defaultModel: 'gemini-2.5-flash', keyPlaceholder: 'AIza…'},
} as const;
export type AIProvider = keyof typeof aiProviders;
export type AIConnection = {apiKey: string; model: string};
export function isAIProvider(value: unknown): value is AIProvider {
  return typeof value === 'string' && Object.hasOwn(aiProviders, value);
}
export function initialAIConnections(): Record<AIProvider, AIConnection> {
  return Object.fromEntries(Object.entries(aiProviders).map(([id, config]) =>
    [id, {apiKey: '', model: config.defaultModel}])) as Record<AIProvider, AIConnection>;
}
