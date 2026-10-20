import { defineProvider } from './types'

/**
 * Deepgram — speech-to-text only. No chat endpoint: the sole wire surface is
 * the native `/v1/listen` prerecorded API, declared through the dedicated
 * `openai-audio-transcription` endpoint (the main-process transcriber and
 * model-list fetcher speak Deepgram's native dialect for deepgram hosts).
 */
export default defineProvider({
  id: 'deepgram',
  name: 'Deepgram',
  defaultChatEndpoint: null,
  endpointConfigs: {
    'openai-audio-transcription': {
      adapterFamily: 'openai-compatible',
      baseUrl: 'https://api.deepgram.com'
    }
  },
  metadata: {
    website: {
      official: 'https://deepgram.com/',
      docs: 'https://developers.deepgram.com/docs/',
      apiKey: 'https://console.deepgram.com/',
      models: 'https://developers.deepgram.com/docs/models'
    }
  }
})
