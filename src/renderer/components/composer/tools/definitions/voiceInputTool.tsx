import { VoiceInputToolRuntime } from '@renderer/components/composer/tools/components/VoiceInputButton'
import { VOICE_INPUT_TOOLBAR_MANIFEST } from '@renderer/components/composer/tools/toolbarManifests'
import { defineTool } from '@renderer/components/composer/tools/types'

/**
 * Voice Input Tool
 *
 * Click-to-toggle microphone dictation: records audio, transcribes it through
 * the `feature.voice_input.model_id` speech-to-text model in main
 * (`ai.audio.transcribe`), and inserts the text at the composer cursor.
 */
const voiceInputTool = defineTool({
  key: 'voice_input',
  label: VOICE_INPUT_TOOLBAR_MANIFEST.label,

  visibleInScopes: VOICE_INPUT_TOOLBAR_MANIFEST.visibleInScopes,

  dependencies: {
    actions: ['onTextChange'] as const
  },

  composer: {
    runtime: ({ context }) => {
      const { actions, launcher } = context
      return <VoiceInputToolRuntime launcher={launcher} onTextChange={actions.onTextChange} />
    }
  }
})

export default voiceInputTool
