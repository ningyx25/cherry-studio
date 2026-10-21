import '@testing-library/jest-dom/vitest'

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ipcMocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@renderer/ipc', () => ({ ipcApi: { request: ipcMocks.request } }))

import { useVoiceInput } from '../useVoiceInput'

/** Minimal MediaRecorder double: `stop()` emits one chunk then fires `onstop`. */
class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  static isTypeSupported = () => true

  state: RecordingState = 'inactive'
  mimeType = 'audio/webm;codecs=opus'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  /** Allow a test to stop the recorder without emitting any audio chunk. */
  static emitChunkOnStop = true

  constructor(
    readonly stream: MediaStream,
    readonly options?: MediaRecorderOptions
  ) {
    FakeMediaRecorder.instances.push(this)
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    if (FakeMediaRecorder.emitChunkOnStop) {
      this.ondataavailable?.({ data: new Blob(['turn-audio'], { type: this.mimeType }) })
    }
    this.onstop?.()
  }
}

const stopTrack = vi.fn()

function installRecorderEnvironment() {
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  // jsdom's Blob has no arrayBuffer(); the hook reads the turn's bytes through it.
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
      return new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.readAsArrayBuffer(this)
      })
    }
  }
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }) }
  })
}

describe('useVoiceInput (turn-based dictation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    FakeMediaRecorder.instances = []
    FakeMediaRecorder.emitChunkOnStop = true
    installRecorderEnvironment()
    ipcMocks.request.mockResolvedValue({ text: '你好世界' })
  })

  it('runs one turn as one recording, one transcription request, one transcript', async () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() =>
      useVoiceInput({ providerId: 'deepgram', modelId: 'nova-3', onTranscript, onError: vi.fn() })
    )

    await act(async () => {
      await result.current.start()
    })
    expect(result.current.isRecording).toBe(true)
    expect(FakeMediaRecorder.instances).toHaveLength(1)

    await act(async () => {
      result.current.stop()
    })
    await waitFor(() => expect(onTranscript).toHaveBeenCalledTimes(1))

    // The turn ended: recorder released, exactly one request, exactly one insert.
    expect(result.current.isRecording).toBe(false)
    expect(result.current.isTranscribing).toBe(false)
    expect(stopTrack).toHaveBeenCalled()
    expect(ipcMocks.request).toHaveBeenCalledTimes(1)
    expect(ipcMocks.request).toHaveBeenCalledWith(
      'ai.audio.transcribe',
      expect.objectContaining({ providerId: 'deepgram', modelId: 'nova-3', filename: 'audio.webm' })
    )
    expect(onTranscript).toHaveBeenCalledTimes(1)
    expect(onTranscript).toHaveBeenCalledWith('你好世界')
  })

  it('reports an empty transcript instead of silently inserting nothing', async () => {
    ipcMocks.request.mockResolvedValue({ text: '   ' })
    const onTranscript = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useVoiceInput({ providerId: 'deepgram', modelId: 'nova-3', language: 'zh-CN', onTranscript, onError })
    )

    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      result.current.stop()
    })

    // A model whose language does not match the speech answers 200 with "".
    await waitFor(() => expect(onError).toHaveBeenCalledWith('chat.input.voice_input.empty_transcription'))
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('does not start a second recording while one turn is still active', async () => {
    const { result } = renderHook(() =>
      useVoiceInput({ providerId: 'deepgram', modelId: 'nova-3', onTranscript: vi.fn(), onError: vi.fn() })
    )

    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await result.current.start()
    })

    expect(FakeMediaRecorder.instances).toHaveLength(1)
  })

  it('reports a turn that captured no audio instead of silently dropping it', async () => {
    FakeMediaRecorder.emitChunkOnStop = false
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useVoiceInput({ providerId: 'deepgram', modelId: 'nova-3', onTranscript: vi.fn(), onError })
    )

    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      result.current.stop()
    })

    expect(onError).toHaveBeenCalledWith('chat.input.voice_input.no_audio')
    expect(ipcMocks.request).not.toHaveBeenCalled()
  })
})
