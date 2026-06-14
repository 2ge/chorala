export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type CompleteOptions = {
  system?: string
  messages: ChatMessage[]
  /** Ask the model to return JSON (best-effort per provider). */
  json?: boolean
  temperature?: number
}

/**
 * Pluggable LLM provider. Implementations: Ollama (default), OpenAI, Anthropic, Noop.
 * `enabled=false` (NoopProvider) means AI features degrade cleanly to disabled (SPEC §2).
 */
export interface LLMProvider {
  readonly name: string
  readonly enabled: boolean
  /** Whether this provider can produce embeddings (Anthropic cannot). */
  readonly canEmbed: boolean
  complete(opts: CompleteOptions): Promise<string>
  embed(texts: string[]): Promise<number[][]>
}
