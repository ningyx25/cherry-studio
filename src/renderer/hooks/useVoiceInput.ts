import { ipcApi } from '@renderer/ipc'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Pick the first MediaRecorder mime the runtime supports, with a matching filename. */
function pickRecorderMime(): { mimeType?: string; filename: string } {
  const candidates: Array<{ mimeType?: string; filename: string }> = [
    { mimeType: 'audio/webm;codecs=opus', filename: 'audio.webm' },
    { mimeType: 'audio/webm', filename: 'audio.webm' },
    { mimeType: 'audio/mp4', filename: 'audio.m4a' },
    { filename: 'audio.webm' }
  ]
  for (const candidate of candidates) {
    if (!candidate.mimeType || MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate
  }
  return candidates[candidates.length - 1]
}

const MAX_RECORDING_MS = 120_000

export interface UseVoiceInputOptions {
  providerId: string
  modelId: string
  language?: string
  onTranscript: (text: string) => void
  onError: (errorKey: string) => void
}

export interface UseVoiceInputResult {
  isRecording: boolean
  isTranscribing: boolean
  supported: boolean
  start: () => Promise<void>
  stop: () => void
  toggle: () => void
}

/**
 * Turn-based dictation: one turn is exactly one `MediaRecorder` session ended
 * by `stop()` (or the auto-stop cap), sent as one `ai.audio.transcribe` request
 * through the configured speech-to-text model, whose transcript is delivered
 * once via `onTranscript`. The turn then ends — no auto-restart, no streaming
 * partials, and never auto-send: the user edits/inserts then submits manually.
 * Recording state is local to this hook.
 */
export function useVoiceInput({
  providerId,
  modelId,
  language,
  onTranscript,
  onError
}: UseVoiceInputOptions): UseVoiceInputResult {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest callbacks without re-arming the MediaRecorder handlers.
  const callbacksRef = useRef({ onTranscript, onError, providerId, modelId, language })
  callbacksRef.current = { onTranscript, onError, providerId, modelId, language }

  const supported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

  const cleanupCapture = useCallback(() => {
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current)
    autoStopTimerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const transcribe = useCallback(async (blob: Blob) => {
    const { onTranscript, onError, providerId, modelId, language } = callbacksRef.current
    const { filename } = pickRecorderMime()
    try {
      setIsTranscribing(true)
      const audio = new Uint8Array(await blob.arrayBuffer())
      const { text } = await ipcApi.request('ai.audio.transcribe', {
        providerId,
        modelId,
        audio,
        filename,
        ...(language ? { language } : {})
      })
      if (text) onTranscript(text)
    } catch (error) {
      window.console.error('voice input transcription failed', error)
      onError('chat.input.voice_input.transcription_failed')
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    recorder.stop()
  }, [])

  const start = useCallback(async () => {
    if (recorderRef.current || !supported) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const { mimeType } = pickRecorderMime()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const chunks = chunksRef.current
        cleanupCapture()
        setIsRecording(false)
        const blob = new Blob(chunks, { type: recorder.mimeType })
        if (blob.size > 0) void transcribe(blob)
      }
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
      autoStopTimerRef.current = setTimeout(stop, MAX_RECORDING_MS)
    } catch (error) {
      cleanupCapture()
      setIsRecording(false)
      window.console.error('voice input recording failed', error)
      const { onError } = callbacksRef.current
      onError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'chat.input.voice_input.permission_denied'
          : 'chat.input.voice_input.recording_failed'
      )
    }
  }, [cleanupCapture, stop, supported, transcribe])

  const toggle = useCallback(() => {
    if (isRecording) stop()
    else void start()
  }, [isRecording, start, stop])

  useEffect(() => cleanupCapture, [cleanupCapture])

  return { isRecording, isTranscribing, supported, start, stop, toggle }
}
