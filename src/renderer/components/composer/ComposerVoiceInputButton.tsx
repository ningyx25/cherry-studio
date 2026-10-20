import { usePreference } from '@data/hooks/usePreference'
import { Button, Tooltip } from '@huatuostudio/ui'
import type { QuickPanelInputAdapter } from '@renderer/components/QuickPanel'
import { useVoiceInput } from '@renderer/hooks/useVoiceInput'
import { toast } from '@renderer/services/toast'
import { cn } from '@renderer/utils/style'
import { parseUniqueModelId, type UniqueModelId } from '@shared/data/types/model'
import { useNavigate } from '@tanstack/react-router'
import { Keyboard, Loader2, Mic } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { COMPOSER_SEND_ACCESSORY_BUTTON_CLASS } from './variants/shared/ComposerControlScaffolding'

interface Props {
  inputAdapter?: QuickPanelInputAdapter
}

/**
 * Input-mode switch button that sits next to the send action: typing ⇄ voice.
 * Deliberately NOT a pinnable composer tool — it renders unconditionally in
 * every composer (chat and agent session) and cannot be removed from the toolbar.
 *
 * One click switches from typing to voice mode and starts a dictation turn
 * (mic icon); a second click ends the turn — the recording is transcribed as a
 * whole through the `feature.voice_input.model_id` speech-to-text model in main
 * and the transcript is inserted at the editor cursor, then the composer returns
 * to typing mode (keyboard icon). Recording itself is owned by {@link useVoiceInput}.
 */
export const ComposerVoiceInputButton: FC<Props> = ({ inputAdapter }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [modelIdPref] = usePreference('feature.voice_input.model_id')
  const [languagePref] = usePreference('feature.voice_input.language')

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

  const voice = useVoiceInput({
    providerId,
    modelId,
    language: languagePref ?? undefined,
    onTranscript: handleTranscript,
    onError: handleError
  })
  const { supported, isRecording, isTranscribing } = voice

  // The button IS the mode switch: voice mode is active for the whole turn —
  // while recording and while the finished audio is being transcribed.
  const voiceModeActive = isRecording || isTranscribing

  const onClick = useCallback(() => {
    if (noModel) {
      toast.warning(t('chat.input.voice_input.no_model'))
      void navigate({ to: '/settings/model' })
      return
    }
    voice.toggle()
  }, [navigate, noModel, t, voice])

  const label = isRecording ? t('chat.input.voice_input.stop') : t('chat.input.voice_input.label')
  const tooltip = !supported
    ? t('chat.input.voice_input.not_supported')
    : noModel
      ? t('chat.input.voice_input.no_model')
      : isTranscribing
        ? t('chat.input.voice_input.transcribing')
        : voiceModeActive
          ? t('chat.input.voice_input.stop')
          : t('chat.input.voice_input.switch_hint')

  return (
    <Tooltip content={tooltip} placement="top">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-ui="chat.composer.action.voice-input"
        data-active={voiceModeActive || undefined}
        className={cn(COMPOSER_SEND_ACCESSORY_BUTTON_CLASS, isRecording && 'animate-pulse text-error!')}
        aria-label={label}
        aria-pressed={voiceModeActive}
        disabled={isTranscribing || !supported}
        onClick={onClick}>
        {isTranscribing ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : voiceModeActive ? (
          <Keyboard aria-hidden />
        ) : (
          <Mic aria-hidden />
        )}
      </Button>
    </Tooltip>
  )
}

export default ComposerVoiceInputButton
