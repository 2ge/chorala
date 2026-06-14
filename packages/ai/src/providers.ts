import type { CompleteOptions, LLMProvider } from './provider.ts'

/** AI disabled — every feature degrades to a clean no-op (SPEC §2). */
export class NoopProvider implements LLMProvider {
  readonly name = 'none'
  readonly enabled = false
  readonly canEmbed = false
  async complete(): Promise<string> {
    return ''
  }
  async embed(): Promise<number[][]> {
    return []
  }
}

type HttpProviderConfig = {
  baseUrl: string
  apiKey?: string
  chatModel: string
  embedModel: string
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama'
  readonly enabled = true
  readonly canEmbed = true
  constructor(private cfg: HttpProviderConfig) {}

  async complete(opts: CompleteOptions): Promise<string> {
    const messages = opts.system
      ? [{ role: 'system', content: opts.system }, ...opts.messages]
      : opts.messages
    const res = await fetch(`${this.cfg.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.cfg.chatModel,
        messages,
        stream: false,
        format: opts.json ? 'json' : undefined,
        options: { temperature: opts.temperature ?? 0.2 },
      }),
    })
    if (!res.ok) throw new Error(`Ollama chat failed: ${res.status}`)
    const data = (await res.json()) as { message?: { content?: string } }
    return data.message?.content ?? ''
  }

  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = []
    for (const text of texts) {
      const res = await fetch(`${this.cfg.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.cfg.embedModel, prompt: text }),
      })
      if (!res.ok) throw new Error(`Ollama embed failed: ${res.status}`)
      const data = (await res.json()) as { embedding: number[] }
      out.push(data.embedding)
    }
    return out
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  readonly enabled = true
  readonly canEmbed = true
  constructor(private cfg: HttpProviderConfig) {}

  private headers() {
    return { 'content-type': 'application/json', authorization: `Bearer ${this.cfg.apiKey}` }
  }

  async complete(opts: CompleteOptions): Promise<string> {
    const messages = opts.system
      ? [{ role: 'system', content: opts.system }, ...opts.messages]
      : opts.messages
    const res = await fetch(`${this.cfg.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.cfg.chatModel,
        messages,
        temperature: opts.temperature ?? 0.2,
        response_format: opts.json ? { type: 'json_object' } : undefined,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI chat failed: ${res.status}`)
    const data = (await res.json()) as { choices: { message: { content: string } }[] }
    return data.choices[0]?.message.content ?? ''
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.cfg.embedModel, input: texts }),
    })
    if (!res.ok) throw new Error(`OpenAI embed failed: ${res.status}`)
    const data = (await res.json()) as { data: { embedding: number[] }[] }
    return data.data.map((d) => d.embedding)
  }
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  readonly enabled = true
  readonly canEmbed = false // Anthropic has no embeddings API
  constructor(private cfg: HttpProviderConfig) {}

  async complete(opts: CompleteOptions): Promise<string> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.cfg.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.cfg.chatModel,
        system: opts.system,
        messages: opts.messages,
        max_tokens: 1024,
        temperature: opts.temperature ?? 0.2,
      }),
    })
    if (!res.ok) throw new Error(`Anthropic messages failed: ${res.status}`)
    const data = (await res.json()) as { content: { text: string }[] }
    return data.content[0]?.text ?? ''
  }

  async embed(): Promise<number[][]> {
    throw new Error('Anthropic does not provide embeddings; set HEED_AI_EMBED via Ollama/OpenAI.')
  }
}
