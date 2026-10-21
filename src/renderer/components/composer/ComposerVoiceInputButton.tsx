import { usePreference } from '@data/hooks/usePreference'
import { Button, Tooltip } from '@huatuostudio/ui'
import type { QuickPanelInputAdapter } from '@renderer/components/QuickPanel'
import { useVoiceInput } from '@renderer/hooks/useVoiceInput'
import { toast } from '@renderer/services/toast'
import { cn } from '@renderer/utils/style'
import { parseUniqueModelId, type UniqueModelId } from '@shared/data/types/model'
import { useNavigate } from '@tanstack/react-router'
import { Keyboard, Loader2, Mic } from 'lucide-react'
import type { FC, PointerEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { COMPOSER_SEND_ACCESSORY_BUTTON_CLASS } from './variants/shared/ComposerControlScaffolding'

interface Props {
  inputAdapter?: QuickPanelInputAdapter
}

type InputMode = 'text' | 'voice'

/**
 * Input-mode switch button next to the send action: typing ⇄ voice (push-to-talk).
 * Deliberately NOT a pinnable composer tool — it renders unconditionally in every
 * composer (chat and agent session) and cannot be removed from the toolbar.
 *
 * Clicking the mic switches from typing to voice mode. In voice mode the button
 * is push-to-talk: press and hold to record, release to end the turn — the
 * recording is transcribed as a whole through the `feature.voice_input.model_id`
 * speech-to-text model in main and the transcript is inserted at the editor
 * cursor (see {@link useVoiceInput}), where it can be edited or sent. A keyboard
 * button next to it returns to typing mode.
 */
export const ComposerVoiceInputButton: FC<Props> = ({ inputAdapter }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<InputMode>('text')
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
  const { supported, isRecording, isTranscribing, start, stop } = voice

  const enterVoiceMode = useCallback(() => {
    if (noModel) {
      toast.warning(t('chat.input.voice_input.no_model'))
      void navigate({ to: '/settings/model' })
      return
    }
    setMode('voice')
  }, [navigate, noModel, t])

  const handlePressDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (isTranscribing || noModel) return
      event.currentTarget.setPointerCapture?.(event.pointerId)
      void start()
    },
    [isTranscribing, noModel, start]
  )

  const handleRelease = useCallback(() => {
    if (isRecording) stop()
  }, [isRecording, stop])

  const label = isRecording ? t('chat.input.voice_input.release_to_stop') : t('chat.input.voice_input.hold_to_talk')
  const tooltip = !supported
    ? t('chat.input.voice_input.not_supported')
    : noModel
      ? t('chat.input.voice_input.no_model')
      : isTranscribing
        ? t('chat.input.voice_input.transcribing')
        : label

  return (
    <div className="flex items-center gap-1">
      {mode === 'voice' ? (
        <>
          <Tooltip content={tooltip} placement="top">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-ui="chat.composer.action.voice-input"
              data-active={isRecording || undefined}
              className={cn(
                COMPOSER_SEND_ACCESSORY_BUTTON_CLASS,
                'min-w-14 px-2',
                isRecording && 'animate-pulse text-error!'
              )}
              aria-label={label}
              aria-pressed={isRecording}
              disabled={isTranscribing || !supported}
              onPointerDown={handlePressDown}
              onPointerUp={handleRelease}
              onPointerLeave={handleRelease}
              onContextMenu={(event) => event.preventDefault()}>
              {isTranscribing ? <Loader2 className="animate-spin" aria-hidden /> : <Mic aria-hidden />}
              <span className="text-xs">
                {isTranscribing ? t('chat.input.voice_input.transcribing') : t('chat.input.voice_input.hold_to_talk')}
              </span>
            </Button>
          </Tooltip>
          <Tooltip content={t('chat.input.voice_input.back_to_text')} placement="top">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('chat.input.voice_input.back_to_text')}
              className={cn(COMPOSER_SEND_ACCESSORY_BUTTON_CLASS, 'shrink-0')}
              disabled={isTranscribing}
              onClick={() => setMode('text')}>
              <Keyboard aria-hidden />
            </Button>
          </Tooltip>
        </>
      ) : (
        <Tooltip content={t('chat.input.voice_input.switch_hint')} placement="top">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-ui="chat.composer.action.voice-input"
            className={COMPOSER_SEND_ACCESSORY_BUTTON_CLASS}
            aria-label={t('chat.input.voice_input.switch_hint')}
            disabled={!supported}
            onClick={enterVoiceMode}>
            <Mic aria-hidden />
          </Button>
        </Tooltip>
      )}
    </div>
  )
}

export default ComposerVoiceInputButton
