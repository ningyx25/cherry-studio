import '@testing-library/jest-dom/vitest'

import type { QuestionnaireDefinition } from '@shared/questionnaire/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuestionnairePage from '../QuestionnairePage'

const mocks = vi.hoisted(() => ({
  listDefinitions: vi.fn(),
  getDefinition: vi.fn()
}))

vi.mock('@renderer/ipc', () => ({
  ipcApi: {
    request: (route: string, input?: unknown) => {
      if (route === 'questionnaire.list_definitions') return mocks.listDefinitions()
      if (route === 'questionnaire.get_definition') return mocks.getDefinition(input as { questionnaireId: string })
      return Promise.resolve(undefined)
    }
  },
  useIpcOn: vi.fn()
}))

vi.mock('@renderer/data/hooks/useDataApi', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useQuery: () => ({
      data: [],
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      mutate: vi.fn()
    })
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

const chDef: QuestionnaireDefinition = {
  questionnaireId: 'CHINA_DRY_EYE',
  title: '中国干眼',
  description: '评估干眼',
  questions: [
    {
      id: 'Q1',
      text: '隐形眼镜',
      type: 'single_choice',
      options: [
        { label: '无', value: 'A' },
        { label: '有', value: 'B' }
      ]
    },
    {
      id: 'Q2',
      text: '睡眠',
      type: 'single_choice',
      options: [
        { label: '好', value: 'A' },
        { label: '差', value: 'B' }
      ]
    }
  ],
  branchingRules: [
    {
      ruleId: 'RULE_CLDEQ8',
      triggerQuestion: 'Q1',
      condition: 'not_equal',
      value: 'A',
      targetQuestionnaireId: 'CLDEQ8',
      promptMessage: '继续 CLDEQ8？'
    }
  ],
  scoring: { expression: { kind: 'score', question: 'Q1' } }
}

describe('QuestionnairePage', () => {
  beforeEach(() => {
    mocks.listDefinitions
      .mockReset()
      .mockResolvedValue([{ questionnaireId: 'CHINA_DRY_EYE', title: '中国干眼', description: '评估干眼' }])
    mocks.getDefinition.mockReset().mockResolvedValue(chDef)
  })

  it('renders the questionnaire card on the home view', async () => {
    render(<QuestionnairePage />)
    expect(await screen.findByText('中国干眼')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始作答' })).toBeInTheDocument()
  })

  it('starts a questionnaire with 上一题 disabled and 下一题 available', async () => {
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '开始作答' }))

    expect(await screen.findByText('隐形眼镜')).toBeInTheDocument()
    // 第 1 题 → 上一题禁用，下一题可点（但未答时禁用）
    expect(screen.getByRole('button', { name: '上一题' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一题' })).toBeDisabled()
    expect(screen.getByText('第 1/2 题')).toBeInTheDocument()
  })

  it('answers a question, advances, and shows the next question', async () => {
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '开始作答' }))
    await screen.findByText('隐形眼镜')

    // 答第 1 题
    fireEvent.click(screen.getByText('无'))
    // auto-advance 到第 2 题
    expect(await screen.findByText('睡眠')).toBeInTheDocument()
    expect(screen.getByText('第 2/2 题')).toBeInTheDocument()
    // 上一题可点
    expect(screen.getByRole('button', { name: '上一题' })).toBeEnabled()
    // 末题 → 完成按钮
    expect(screen.getByRole('button', { name: '完成并生成报告' })).toBeDisabled()
  })

  it('goes back with 上一题 and revisits the first question', async () => {
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '开始作答' }))
    await screen.findByText('隐形眼镜')
    fireEvent.click(screen.getByText('无'))
    await screen.findByText('睡眠')

    fireEvent.click(screen.getByRole('button', { name: '上一题' }))
    expect(await screen.findByText('隐形眼镜')).toBeInTheDocument()
    expect(screen.getByText('第 1/2 题')).toBeInTheDocument()
  })
})
