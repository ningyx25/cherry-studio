# @huatuostudio/ai-sdk-provider

HuaTuoIN provider bundle for the [Vercel AI SDK](https://ai-sdk.dev/).  
It exposes the HuaTuoIN OpenAI-compatible entrypoints and dynamically routes Anthropic and Gemini model ids to their HuaTuoIN upstream equivalents.

## Installation

```bash
npm install ai @huatuostudio/ai-sdk-provider @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai
# or
pnpm add ai @huatuostudio/ai-sdk-provider @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai
```

> **Note**: This package requires peer dependencies `ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, and `@ai-sdk/openai` to be installed.

## Usage

```ts
import { createHuaTuoIn, huatuoIn } from '@huatuostudio/ai-sdk-provider'

const huatuoInProvider = createHuaTuoIn({
  apiKey: process.env.HUATUOIN_API_KEY,
  // optional overrides:
  // baseURL: 'https://open.cherryin.net/v1',
  // anthropicBaseURL: 'https://open.cherryin.net/anthropic',
  // geminiBaseURL: 'https://open.cherryin.net/gemini/v1beta',
})

// Chat models will auto-route based on the model id prefix:
const openaiModel = huatuoInProvider.chat('gpt-4o-mini')
const anthropicModel = huatuoInProvider.chat('claude-3-5-sonnet-latest')
const geminiModel = huatuoInProvider.chat('gemini-2.0-pro-exp')

const { text } = await openaiModel.invoke('Hello HuaTuoIN!')
```

The provider also exposes `completion`, `responses`, `embedding`, `image`, `transcription`, and `speech` helpers aligned with the upstream APIs.

See [AI SDK docs](https://ai-sdk.dev/providers/community-providers/custom-providers) for configuring custom providers.
