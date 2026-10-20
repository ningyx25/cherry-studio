/**
 * Mock for @huatuostudio/ai-sdk-provider
 * This mock is used in tests to avoid importing the actual package
 */

export class OpenAICompatibleRerankingModel {
  readonly specificationVersion = 'v3'

  constructor(
    readonly modelId: string,
    private readonly config: {
      provider: string
    }
  ) {}

  get provider(): string {
    return this.config.provider
  }
}

export const createOpenAICompatibleRerankingModel = (
  modelId: string,
  settings: {
    name: string
    baseURL: string
  }
) => new OpenAICompatibleRerankingModel(modelId, { provider: `${settings.name}.rerank` })
