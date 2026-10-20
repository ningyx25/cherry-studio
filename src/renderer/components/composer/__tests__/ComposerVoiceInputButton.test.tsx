import '@testing-library/jest-dom/vitest'

import type { QuickPanelInputAdapter } from '@renderer/components/QuickPanel'
import type { UseVoiceInputOptions, UseVoiceInputResult } from '@renderer/hooks/useVoiceInput'
import { toast } from '@renderer/services/toast'
import { MockUsePreferenceUtils } from '@test-mocks/renderer/usePreference'
import { fireEvent, render, screen } from '@testing-library/react'
import type * as ReactI18next from 'react-i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ComposerVoiceInputButton } from '../ComposerVoiceInputButton'

const mocks = vi.hoisted(() => ({
  voice: {
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

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactI18next>()
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) }
})

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))

// The class constant comes from the tool-runtime scaffolding module; stub it so this
// leaf component's test does not pull the whole composer tool graph in.
vi.mock('../variants/shared/ComposerControlScaffolding', () => ({
  COMPOSER_SEND_ACCESSORY_BUTTON_CLASS: 'accessory-button'
}))

vi.mock('@huatuostudio/ui', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content?: React.ReactNode }) => (
    <div data-testid="tooltip" data-content={String(content)}>
      {children}
    </div>
  ),
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  )
}))

vi.mock('@renderer/hooks/useVoiceInput', () => ({
  useVoiceInput: (options: UseVoiceInputOptions) => {
    mocks.lastOptions = options
    return mocks.voice
  }
}))

vi.mock('@renderer/services/toast', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))

const makeAdapter = () => ({ insertText: vi.fn(), focus: vi.fn() }) as unknown as QuickPanelInputAdapter

describe('ComposerVoiceInputButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.voice = {
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

  it('renders an always-visible mic button', () => {
    render(<ComposerVoiceInputButton />)
    expect(screen.getByRole('button', { name: 'chat.input.voice_input.label' })).toBeEnabled()
  })

  it('warns and routes to the model settings when no transcription model is configured', () => {
    render(<ComposerVoiceInputButton />)

    fireEvent.click(screen.getByRole('button', { name: 'chat.input.voice_input.label' }))

    expect(toast.warning).toHaveBeenCalledWith('chat.input.voice_input.no_model')
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/settings/model' })
    expect(mocks.voice.toggle).not.toHaveBeenCalled()
  })

  it('toggles dictation once a model is configured', () => {
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', 'openai::whisper-1')
    render(<ComposerVoiceInputButton />)

    fireEvent.click(screen.getByRole('button', { name: 'chat.input.voice_input.label' }))

    expect(mocks.voice.toggle).toHaveBeenCalled()
    expect(mocks.lastOptions).toMatchObject({ providerId: 'openai', modelId: 'whisper-1' })
  })

  it('inserts the transcript at the cursor and refocuses the editor', () => {
    const inputAdapter = makeAdapter()
    render(<ComposerVoiceInputButton inputAdapter={inputAdapter} />)

    mocks.lastOptions!.onTranscript('你好世界')

    expect(inputAdapter.insertText).toHaveBeenCalledWith('你好世界')
    expect(inputAdapter.focus).toHaveBeenCalled()
  })

  it('reflects the recording state and stops on a second click', () => {
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', 'openai::whisper-1')
    mocks.voice = { ...mocks.voice, isRecording: true }
    render(<ComposerVoiceInputButton />)

    const button = screen.getByRole('button', { name: 'chat.input.voice_input.stop' })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)
    expect(mocks.voice.toggle).toHaveBeenCalled()
  })

  it('disables the button while transcribing', () => {
    mocks.voice = { ...mocks.voice, isTranscribing: true }
    render(<ComposerVoiceInputButton />)

    expect(screen.getByRole('button', { name: 'chat.input.voice_input.label' })).toBeDisabled()
  })

  it('keeps voice mode active through the transcribing leg of the dictation turn', () => {
    MockUsePreferenceUtils.setPreferenceValue('feature.voice_input.model_id', 'openai::whisper-1')
    mocks.voice = { ...mocks.voice, isTranscribing: true }
    render(<ComposerVoiceInputButton />)

    // Turn-based: recording ended but the turn is not over until the transcript
    // is inserted — the switch stays in voice mode (data-active) while disabled.
    expect(screen.getByRole('button', { name: 'chat.input.voice_input.label' })).toHaveAttribute('aria-pressed', 'true')
  })
})
