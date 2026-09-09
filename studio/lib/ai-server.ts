import type {AIProvider} from './ai-providers';

type Message = {role: 'user'; content: string};
type Generation = {
  provider: AIProvider; apiKey: string; model: string;
  instructions: string; input: Message[]; schema: Record<string, unknown>;
};
export class AIError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const incomplete = () => new AIError('AI가 완성된 설계를 반환하지 못했습니다. 요청 범위를 줄여 다시 시도하세요.', 422);
const refused = () => new AIError('AI가 이 요청에 대한 설계를 생성하지 않았습니다. 요청 내용을 바꿔 다시 시도하세요.', 422);

// Claude does not accept array length constraints in its structured output schema.
// Keep these requirements in descriptions; applyPlan still enforces them locally.
function claudeSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(claudeSchema);
  if (!value || typeof value !== 'object') return value;
  const node = value as Record<string, unknown>;
  const result = Object.fromEntries(Object.entries(node)
    .filter(([key]) => key !== 'minItems' && key !== 'maxItems')
    .map(([key, child]) => [key, claudeSchema(child)]));
  if (node.minItems !== undefined || node.maxItems !== undefined) {
    result.description = [node.description, node.minItems !== undefined ? `Minimum items: ${node.minItems}.` : '',
      node.maxItems !== undefined ? `Maximum items: ${node.maxItems}.` : ''].filter(Boolean).join(' ');
  }
  return result;
}

export async function generatePlanText(options: Generation): Promise<string> {
  const {provider, apiKey, model, instructions, input, schema} = options;
  let url: string;
  let body: unknown;
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  switch (provider) {
    case 'openai':
      url = 'https://api.openai.com/v1/responses';
      headers.Authorization = `Bearer ${apiKey}`;
      body = {model, store: false, instructions, input, max_output_tokens: 8000,
        text: {format: {type: 'json_schema', name: 'blueprint_plan', strict: true, schema}}};
      break;
    case 'anthropic':
      url = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {model, max_tokens: 8000, system: instructions, messages: input,
        output_config: {format: {type: 'json_schema', schema: claudeSchema(schema)}}};
      break;
    case 'google':
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      headers['x-goog-api-key'] = apiKey;
      body = {systemInstruction: {parts: [{text: instructions}]},
        contents: input.map(message => ({role: 'user', parts: [{text: message.content}]})),
        generationConfig: {maxOutputTokens: 8000, responseMimeType: 'application/json', responseJsonSchema: schema}};
      break;
  }
  // Fixed origins and disabled redirects keep credentials with the selected provider.
  const upstream = await fetch(url, {method: 'POST', headers, body: JSON.stringify(body),
    redirect: 'error', signal: AbortSignal.timeout(90000)});
  if (!upstream.ok) {
    const status = upstream.status;
    if (status === 401 || status === 403) throw new AIError('선택한 제공업체의 API 키와 모델 접근 권한을 확인하세요.', status);
    if (status === 429) throw new AIError('사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 API 잔액을 확인하세요.', 429);
    if (status === 400 || status === 404) throw new AIError('선택한 제공업체의 API 키, 모델 ID와 구조화 출력 지원 여부를 확인하세요.', 502);
    throw new AIError('AI 서비스가 응답하지 않습니다. 잠시 후 다시 시도하세요.', 502);
  }
  // Never return the raw provider error or credential-bearing request to the client.
  const data = await upstream.json();
  let text = '';
  if (provider === 'openai') {
    const result = data as {status?: string; output?: {content?: {type: string; text?: string}[]}[]};
    const content = result.output?.flatMap(item => item.content || []) || [];
    if (content.some(item => item.type === 'refusal')) throw refused();
    if (result.status && result.status !== 'completed') throw incomplete();
    text = content.filter(item => item.type === 'output_text').map(item => item.text || '').join('');
  } else if (provider === 'anthropic') {
    const result = data as {stop_reason?: string; content?: {type: string; text?: string}[]};
    if (result.stop_reason === 'refusal') throw refused();
    if (result.stop_reason !== 'end_turn') throw incomplete();
    text = result.content?.filter(item => item.type === 'text').map(item => item.text || '').join('') || '';
  } else {
    const result = data as {promptFeedback?: {blockReason?: string}; candidates?: {
      finishReason?: string; content?: {parts?: {text?: string; thought?: boolean}[]}}[]};
    const candidate = result.candidates?.[0];
    if (result.promptFeedback?.blockReason || ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT']
      .includes(candidate?.finishReason || '')) throw refused();
    if (candidate?.finishReason !== 'STOP') throw incomplete();
    text = candidate.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') || '';
  }
  if (!text.trim()) throw incomplete();
  return text;
}
