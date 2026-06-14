import { type Env, loadEnv } from '@chorala/config'
import type { LLMProvider } from './provider.ts'
import { AnthropicProvider, NoopProvider, OllamaProvider, OpenAIProvider } from './providers.ts'

/** Build the configured LLM provider from env (SPEC §11 factory). */
export function createProvider(env: Env = loadEnv()): LLMProvider {
  const cfg = {
    baseUrl: env.CHORALA_AI_BASE_URL.replace(/\/+$/, ''),
    apiKey: env.CHORALA_AI_API_KEY,
    chatModel: env.CHORALA_AI_CHAT_MODEL,
    embedModel: env.CHORALA_AI_EMBED_MODEL,
  }
  switch (env.CHORALA_AI_PROVIDER) {
    case 'ollama':
      return new OllamaProvider(cfg)
    case 'openai':
      return new OpenAIProvider({ ...cfg, baseUrl: cfg.baseUrl || 'https://api.openai.com' })
    case 'anthropic':
      return new AnthropicProvider({ ...cfg, baseUrl: cfg.baseUrl || 'https://api.anthropic.com' })
    default:
      return new NoopProvider()
  }
}
