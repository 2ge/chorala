import { type Env, loadEnv } from '@heed/config'
import type { LLMProvider } from './provider.ts'
import { AnthropicProvider, NoopProvider, OllamaProvider, OpenAIProvider } from './providers.ts'

/** Build the configured LLM provider from env (SPEC §11 factory). */
export function createProvider(env: Env = loadEnv()): LLMProvider {
  const cfg = {
    baseUrl: env.HEED_AI_BASE_URL.replace(/\/+$/, ''),
    apiKey: env.HEED_AI_API_KEY,
    chatModel: env.HEED_AI_CHAT_MODEL,
    embedModel: env.HEED_AI_EMBED_MODEL,
  }
  switch (env.HEED_AI_PROVIDER) {
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
