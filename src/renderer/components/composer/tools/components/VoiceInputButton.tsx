import { usePreference } from '@data/hooks/usePreference'
import { getQuickPanelSearchAliases } from '@renderer/components/composer/quickPanel'
import { VOICE_INPUT_TOOLBAR_MANIFEST } from '@renderer/components/composer/tools/toolbarManifests'
import type { ToolLauncherApi } from '@renderer/components/composer/tools/types'
import type { QuickPanelInputAdapter } from '@renderer/components/QuickPanel'
import { useVoiceInput } from '@renderer/hooks/useVoiceInput'
import { toast } from '@renderer/services/toast'
import { parseUniqueModelId, type UniqueModelId } from '@shared/data/types/model'
import { useNavigate } from '@tanstack/react-router'
import type { Dispatch, FC, SetStateAction } from 'react'
import { memo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  launcher: ToolLauncherApi
  onTextChange: Dispatch<SetStateAction<string>>
}

const useVoiceInputToolController = ({ launcher, onTextChange }: Props) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [modelIdPref] = usePreference('feature.voice_input.model_id')
  const { providerId, modelId } = (() => {
    if (!modelIdPref) return { providerId: '', modelId: '' }
    try {
      const parsed = parseUniqueModelId(modelIdPref as UniqueModelId)
      return { providerId: parsed.providerId, modelId: parsed.modelId }
    } catch {
      return { providerId: '', modelId: '' }
    }
  })()

  // The transcript arrives long after the click that started recording, when the
  // launcher's `inputAdapter` is gone — keep the last one seen at click time.
  const inputAdapterRef = useRef<QuickPanelInputAdapter | null>(null)

  const handleTranscript = useCallback(
    (text: string) => {
      const inputAdapter = inputAdapterRef.current
      if (inputAdapter) {
        inputAdapter.insertText(text)
        inputAdapter.focus()
        return
      }
      onTextChange((prev) => `${prev}${text}`)
    },
    [onTextChange]
  )

  const handleError = useCallback(
    (errorKey: string) => {
      toast.error(t(errorKey))
    },
    [t]
  )

  const voice = useVoiceInput({
    providerId,
    modelId,
    onTranscript: handleTranscript,
    onError: handleError
  })

  const noModel = !providerId || !modelId
  // Recording without a microphone is a hard stop; a missing transcription model is
  // recoverable, so the button stays clickable and routes to the settings selector.
  const disabled = !voice.supported
  const disabledReason = !voice.supported ? t('chat.input.voice_input.not_supported') : undefined

  const onClick = useCallback(
    (inputAdapter?: QuickPanelInputAdapter) => {
      if (noModel) {
        toast.warning(t('chat.input.voice_input.no_model'))
        void navigate({ to: '/settings/model' })
        return
      }
      if (inputAdapter) inputAdapterRef.current = inputAdapter
      voice.toggle()
    },
    [navigate, noModel, t, voice]
  )

  const label = voice.isRecording
    ? t('chat.input.voice_input.stop')
    : voice.isTranscribing
      ? t('chat.input.voice_input.transcribing')
      : t('chat.input.voice_input.label')
  const tooltip = disabledReason ?? (noModel ? t('chat.input.voice_input.no_model') : label)

  useEffect(() => {
    return launcher.registerLaunchers([
      {
        ...VOICE_INPUT_TOOLBAR_MANIFEST.toolbar,
        sources: ['popover'],
        label,
        description: '',
        searchAliases: getQuickPanelSearchAliases(t, 'chat.input.voice_input.label', ['voice', 'mic']),
        tooltip,
        active: voice.isRecording,
        // Voice input is served by its own transcription model, not the composer's
        // chat model, so it stays usable before a chat model is selected.
        availableWithoutModel: true,
        disabled,
        disabledReason,
        action: ({ inputAdapter }) => onClick(inputAdapter ?? undefined)
      }
    ])
  }, [disabled, disabledReason, label, launcher, onClick, t, tooltip, voice.isRecording])

  return null
}

export const VoiceInputToolRuntime: FC<Props> = memo((props) => {
  useVoiceInputToolController(props)
  return null
})

export default VoiceInputToolRuntime
