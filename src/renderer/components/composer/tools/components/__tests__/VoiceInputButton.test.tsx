import '@testing-library/jest-dom/vitest'

import type { ToolLauncherApi } from '@renderer/components/composer/tools/types'
import type { UseVoiceInputOptions, UseVoiceInputResult } from '@renderer/hooks/useVoiceInput'
import { toast } from '@renderer/services/toast'
import { MockUsePreferenceUtils } from '@test-mocks/renderer/usePreference'
import { render, waitFor } from '@testing-library/react'
import type * as ReactI18next from 'react-i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { VoiceInputToolRuntime } from '../VoiceInputButton'

const mocks = vi.hoisted(() => ({
  voiceInput: {
    isRecording: false,
    isTranscribing: false,
    supported: true,
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn()
  } as UseVoiceInputResult,
  lastOptions: undefined as UseVoiceInputOptions | undefined,
  navigate: vi.fn()
}))

const launcherApi: ToolLauncherApi = { registerLaunchers: vi.fn(() => vi.fn()) }

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactI18next>()
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) }
})

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))

vi.mock('@renderer/hooks/useVoiceInput', () => ({
  useVoiceInput: (options: UseVoiceInputOptions) => {
    mocks.lastOptions = options
    return mocks.voiceInput
  }
}))

vi.mock('@renderer/services/toast', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))

const renderRuntime = (onTextChange = vi.fn()) => {
  const utils = render(<VoiceInputToolRuntime launcher={launcherApi} onTextChange={onTextChange} />)
  return { ...utils, onTextChange }
}

const lastLauncher = () => {
  const calls = vi.mocked(launcherApi.registerLaunchers).mock.calls
  return calls.at(-1)![0][0]
}

describe('VoiceInputToolRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.voiceInput = {
      isRecording: false,
      isTranscribing: false,
      supported: true,
      start: vi.fn(),
      stop: vi.fn(),
      toggle: vi.fn()
    }
    mocks.lastOptions = undefined
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', null)
  })

  it('stays usable without a chat model and hints the missing transcription model', async () => {
    renderRuntime()
    await waitFor(() => expect(launcherApi.registerLaunchers).toHaveBeenCalled())
    expect(lastLauncher()).toMatchObject({
      id: 'voice-input',
      sources: ['popover'],
      availableWithoutModel: true,
      disabled: false,
      tooltip: 'chat.input.voice_input.no_model'
    })
  })

  it('routes to the model settings when clicked with no transcription model configured', async () => {
    renderRuntime()
    await waitFor(() => expect(launcherApi.registerLaunchers).toHaveBeenCalled())

    lastLauncher().action?.({ inputAdapter: undefined, quickPanel: {} as never, source: 'popover' })

    expect(toast.warning).toHaveBeenCalledWith('chat.input.voice_input.no_model')
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/settings/model' })
    expect(mocks.voiceInput.toggle).not.toHaveBeenCalled()
  })

  it('enables recording once a model is configured', async () => {
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', 'openai::whisper-1')
    renderRuntime()
    await waitFor(() => expect(launcherApi.registerLaunchers).toHaveBeenCalled())
    const launcher = lastLauncher()
    expect(launcher.disabled).toBe(false)
    expect(launcher.disabledReason).toBeUndefined()
  })

  it('passes the parsed provider/model to the recorder when the launcher is clicked', async () => {
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', 'openai::whisper-1')
    renderRuntime()
    await waitFor(() => expect(launcherApi.registerLaunchers).toHaveBeenCalled())

    lastLauncher().action?.({ inputAdapter: undefined, quickPanel: {} as never, source: 'popover' })

    expect(mocks.voiceInput.toggle).toHaveBeenCalled()
    expect(mocks.lastOptions).toMatchObject({ providerId: 'openai', modelId: 'whisper-1' })
  })

  it('inserts the transcript at the cursor when an input adapter was seen', async () => {
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', 'openai::whisper-1')
    const onTextChange = vi.fn()
    renderRuntime(onTextChange)
    await waitFor(() => expect(launcherApi.registerLaunchers).toHaveBeenCalled())

    const inputAdapter = { insertText: vi.fn(), focus: vi.fn() } as never
    lastLauncher().action?.({ inputAdapter, quickPanel: {} as never, source: 'popover' })

    mocks.lastOptions!.onTranscript('你好世界')

    expect((inputAdapter as unknown as { insertText: ReturnType<typeof vi.fn> }).insertText).toHaveBeenCalledWith(
      '你好世界'
    )
    expect(onTextChange).not.toHaveBeenCalled()
  })

  it('falls back to appending via onTextChange when no input adapter was seen', async () => {
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', 'openai::whisper-1')
    const onTextChange = vi.fn()
    renderRuntime(onTextChange)
    await waitFor(() => expect(launcherApi.registerLaunchers).toHaveBeenCalled())

    mocks.lastOptions!.onTranscript('hello')

    expect(onTextChange).toHaveBeenCalledTimes(1)
    const updater = onTextChange.mock.calls[0][0] as (prev: string) => string
    expect(updater('prefix ')).toBe('prefix hello')
  })
})
