import { Button, Tooltip } from '@cherrystudio/ui'
import { usePreference } from '@data/hooks/usePreference'
import type { QuickPanelInputAdapter } from '@renderer/components/QuickPanel'
import { useVoiceInput } from '@renderer/hooks/useVoiceInput'
import { toast } from '@renderer/services/toast'
import { cn } from '@renderer/utils/style'
import { parseUniqueModelId, type UniqueModelId } from '@shared/data/types/model'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Mic } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { COMPOSER_SEND_ACCESSORY_BUTTON_CLASS } from './variants/shared/ComposerControlScaffolding'

interface Props {
  inputAdapter?: QuickPanelInputAdapter
}

/**
 * Microphone dictation button that sits next to the send action. Deliberately
 * NOT a pinnable composer tool: it renders unconditionally in every composer
 * (chat and agent session) and cannot be removed from the toolbar.
 *
 * The transcript is inserted at the editor cursor; the recording itself is
 * owned by {@link useVoiceInput} and transcribed through the
 * `feature.voice_input.model_id` speech-to-text model in main.
 */
export const ComposerVoiceInputButton: FC<Props> = ({ inputAdapter }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [modelIdPref] = usePreference('feature.voice_input.model_id')

  const { providerId, modelId } = useMemo(() => {
    if (!modelIdPref) return { providerId: '', modelId: '' }
    try {
      return parseUniqueModelId(modelIdPref as UniqueModelId)
    } catch {
      return { providerId: '', modelId: '' }
    }
  }, [modelIdPref])

  const noModel = !providerId || !modelId

  const handleTranscript = useCallback(
    (text: string) => {
      inputAdapter?.insertText(text)
      inputAdapter?.focus()
    },
    [inputAdapter]
  )

  const handleError = useCallback(
    (errorKey: string) => {
      toast.error(t(errorKey))
    },
    [t]
  )

  const voice = useVoiceInput({ providerId, modelId, onTranscript: handleTranscript, onError: handleError })
  const { toggle, supported, isRecording, isTranscribing } = voice

  const onClick = useCallback(() => {
    if (noModel) {
      toast.warning(t('chat.input.voice_input.no_model'))
      void navigate({ to: '/settings/model' })
      return
    }
    toggle()
  }, [navigate, noModel, t, toggle])

  const label = isRecording ? t('chat.input.voice_input.stop') : t('chat.input.voice_input.label')
  const tooltip = !supported
    ? t('chat.input.voice_input.not_supported')
    : noModel
      ? t('chat.input.voice_input.no_model')
      : isTranscribing
        ? t('chat.input.voice_input.transcribing')
        : label

  return (
    <Tooltip content={tooltip} placement="top">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-ui="chat.composer.action.voice-input"
        data-active={isRecording || undefined}
        className={cn(COMPOSER_SEND_ACCESSORY_BUTTON_CLASS, isRecording && 'animate-pulse text-error!')}
        aria-label={label}
        aria-pressed={isRecording}
        disabled={isTranscribing || !supported}
        onClick={onClick}>
        {isTranscribing ? <Loader2 className="animate-spin" aria-hidden /> : <Mic aria-hidden />}
      </Button>
    </Tooltip>
  )
}

export default ComposerVoiceInputButton
