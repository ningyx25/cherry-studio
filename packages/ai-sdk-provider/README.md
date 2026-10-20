# @huatuostudio/ai-sdk-provider

OpenAI-compatible reranking model for the [Vercel AI SDK](https://ai-sdk.dev/),
used by relay/aggregator providers that expose the OpenAI `POST /rerank` dialect.

## Installation

```bash
npm install ai @huatuostudio/ai-sdk-provider @ai-sdk/openai-compatible
# or
pnpm add ai @huatuostudio/ai-sdk-provider @ai-sdk/openai-compatible
```

## Usage

```ts
import { createOpenAICompatibleRerankingModel } from '@huatuostudio/ai-sdk-provider'

const model = createOpenAICompatibleRerankingModel('jina-reranker', {
  name: 'openai-compatible',
  baseURL: 'https://api.example.com/v1',
  apiKey: process.env.API_KEY,
  headers: { 'x-static': 'yes' },
  queryParams: { route: 'jina' }
})

const { ranking } = await model.doRerank({
  query: 'hello',
  documents: ['alpha', 'beta'],
  topN: 2
})
```

See [AI SDK docs](https://ai-sdk.dev/providers/community-providers/custom-providers) for configuring custom providers.