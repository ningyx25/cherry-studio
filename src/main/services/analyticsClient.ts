/**
 * Minimal analytics client for the main process.
 *
 * Owned by this repo rather than an external package: the app only needs event
 * batching plus a `/api/track` ping, and keeping it local means the transport,
 * retry policy, and endpoint stay under our control.
 */

const DEFAULT_BASE_URL = 'https://analytics.huatuo.ai'

export type EventType = 'token_usage' | 'app_launch' | string

export type TokenUsageSource = 'chat' | 'agent'

export interface TokenUsageData {
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  source?: TokenUsageSource
}

export interface AppLaunchData {
  version: string
  os: string
}

interface EventItem<T = unknown> {
  event_type: EventType
  data: T
}

interface EventsRequest {
  client_id: string
  channel: string
  events: EventItem[]
}

interface EventsResponse {
  success: boolean
  count: number
}

interface TrackRequest {
  client_id: string
}

interface TrackResponse {
  success: boolean
}

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryAllErrors?: boolean
}

export interface AnalyticsClientOptions {
  baseUrl?: string
  clientId: string
  channel: string
  autoBatch?: boolean
  batchSize?: number
  flushInterval?: number
  timeout?: number
  fetch?: typeof fetch
  onError?: (error: Error) => void
  retry?: RetryOptions
  headers?: Record<string, string>
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30_000,
  backoffMultiplier: 2,
  retryAllErrors: false
}

const RETRIABLE_ERROR_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN']

export class AnalyticsClient {
  private readonly baseUrl: string
  private clientId: string
  private readonly channel: string
  private readonly autoBatch: boolean
  private readonly batchSize: number
  private readonly flushInterval: number
  private readonly timeout: number
  private readonly fetchFn: typeof fetch
  private readonly onError?: (error: Error) => void
  private readonly retryOptions: Required<RetryOptions>
  private readonly headers: Record<string, string>

  private eventQueue: EventItem[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private isFlushing = false

  constructor(options: AnalyticsClientOptions) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.clientId = options.clientId
    this.channel = options.channel
    this.autoBatch = options.autoBatch ?? true
    this.batchSize = options.batchSize ?? 10
    this.flushInterval = options.flushInterval ?? 5000
    this.timeout = options.timeout ?? 10_000
    this.onError = options.onError
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options.retry }
    this.headers = options.headers ?? {}

    if (options.fetch) {
      this.fetchFn = options.fetch
    } else if (typeof globalThis.fetch !== 'undefined') {
      this.fetchFn = globalThis.fetch.bind(globalThis)
    } else {
      throw new Error('fetch is not available. Please provide a fetch function in options.')
    }

    if (this.autoBatch) {
      this.startFlushTimer()
    }
  }

  trackTokenUsage(data: TokenUsageData): void {
    this.track('token_usage', data)
  }

  trackAppLaunch(data: AppLaunchData): void {
    this.track('app_launch', data)
  }

  /** Ping `/api/track` so the backend can record DAU/WAU/MAU. */
  async trackAppUpdate(): Promise<TrackResponse> {
    const payload: TrackRequest = { client_id: this.clientId }
    return this.request<TrackResponse>(`${this.baseUrl}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  track<T = unknown>(eventType: EventType, data: T): void {
    this.eventQueue.push({ event_type: eventType, data })
    if (this.autoBatch && this.eventQueue.length >= this.batchSize) {
      this.flush().catch(this.handleError.bind(this))
    }
  }

  async flush(): Promise<EventsResponse | null> {
    if (this.isFlushing || this.eventQueue.length === 0) {
      return null
    }
    this.isFlushing = true
    const events = [...this.eventQueue]
    this.eventQueue = []
    try {
      return await this.sendEvents(events)
    } catch (error) {
      // Keep the failed batch at the head so the next flush retries it.
      this.eventQueue = [...events, ...this.eventQueue]
      throw error
    } finally {
      this.isFlushing = false
    }
  }

  async sendImmediate<T = unknown>(eventType: EventType, data: T): Promise<EventsResponse> {
    return this.sendEvents([{ event_type: eventType, data }])
  }

  setClientId(clientId: string): void {
    this.clientId = clientId
  }

  getQueueSize(): number {
    return this.eventQueue.length
  }

  async destroy(): Promise<void> {
    this.stopFlushTimer()
    await this.flush().catch(this.handleError.bind(this))
  }

  private async sendEvents(events: EventItem[]): Promise<EventsResponse> {
    const payload: EventsRequest = { client_id: this.clientId, channel: this.channel, events }
    return this.request<EventsResponse>(`${this.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const { maxRetries, initialDelay, maxDelay, backoffMultiplier, retryAllErrors } = this.retryOptions
    const mergedHeaders = { ...this.headers, ...(options.headers as Record<string, string> | undefined) }
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      try {
        const response = await this.fetchFn(url, { ...options, headers: mergedHeaders, signal: controller.signal })
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          const error = new Error(`HTTP ${response.status}: ${errorText}`)
          if (attempt < maxRetries && this.isRetriableError(response.status, retryAllErrors)) {
            throw error
          }
          throw error
        }
        return (await response.json()) as T
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const shouldRetry = attempt < maxRetries && (retryAllErrors || this.isRetriableException(lastError))
        if (!shouldRetry) {
          throw lastError
        }
        await this.sleep(Math.min(initialDelay * backoffMultiplier ** attempt, maxDelay))
      } finally {
        clearTimeout(timeoutId)
      }
    }

    throw lastError ?? new Error('Max retries exceeded')
  }

  private isRetriableError(status: number, retryAllErrors: boolean): boolean {
    if (retryAllErrors) return true
    return (status >= 500 && status < 600) || status === 429 || status === 408
  }

  private isRetriableException(error: Error): boolean {
    if (error.name === 'TypeError' && error.message.includes('fetch')) return true
    if (error.name === 'AbortError') return true
    return RETRIABLE_ERROR_CODES.some((code) => error.message.includes(code))
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return
    this.flushTimer = setInterval(() => {
      this.flush().catch(this.handleError.bind(this))
    }, this.flushInterval)
    this.flushTimer.unref?.()
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  private handleError(error: unknown): void {
    if (this.onError && error instanceof Error) {
      this.onError(error)
    }
  }
}
