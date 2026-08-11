import '@testing-library/jest-dom/vitest'

import type { QuestionnaireDefinition } from '@shared/questionnaire/types'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuestionnairePage from '../QuestionnairePage'

const mocks = vi.hoisted(() => ({
  listDefinitions: vi.fn(),
  getDefinition: vi.fn(),
  sessions: [] as Array<{
    id: string
    flowQuestionnaireId: string
    status: string
    updatedAt: string
    answers: Record<string, unknown>
    report?: unknown
  }>,
  deleteSession: vi.fn()
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

vi.mock('@data/DataApiService', () => ({
  dataApiService: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ id: 'new-session' }),
    patch: vi.fn().mockResolvedValue({}),
    delete: mocks.deleteSession
  }
}))

vi.mock('@renderer/data/hooks/useDataApi', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useQuery: () => ({
      data: mocks.sessions,
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

const basicInfoDef: QuestionnaireDefinition = {
  questionnaireId: 'BASIC_INFO',
  title: '患者基本信息',
  description: '基础信息采集',
  questions: [
    { id: 'name', text: '姓名', type: 'text' },
    {
      id: 'sex',
      text: '性别',
      type: 'single_choice',
      options: [
        { label: '男', value: '男' },
        { label: '女', value: '女' }
      ]
    }
  ],
  scoring: { expression: { kind: 'sum', items: [] } }
}

describe('QuestionnairePage', () => {
  beforeEach(() => {
    mocks.sessions = []
    mocks.deleteSession.mockReset().mockResolvedValue({})
    mocks.listDefinitions.mockReset().mockResolvedValue([
      { questionnaireId: 'BASIC_INFO', title: '患者基本信息', description: '基础信息采集' },
      { questionnaireId: 'CHINA_DRY_EYE', title: '中国干眼', description: '评估干眼' }
    ])
    mocks.getDefinition
      .mockReset()
      .mockImplementation((input: { questionnaireId: string }) =>
        input.questionnaireId === 'BASIC_INFO' ? basicInfoDef : chDef
      )
  })

  it('renders the questionnaire card on the home view (basic-info not a standalone card)', async () => {
    render(<QuestionnairePage />)
    expect(await screen.findByText('中国干眼')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始作答' })).toBeInTheDocument()
    // 患者基本信息不作为独立卡片出现
    expect(screen.queryByText('患者基本信息')).not.toBeInTheDocument()
  })

  it('starts a questionnaire with basic-info first, 上一题 disabled and 下一题 available', async () => {
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '开始作答' }))

    // 流程从患者基本信息开始
    expect(await screen.findByText('姓名')).toBeInTheDocument()
    // 第 1 题 → 上一题禁用，下一题可点（但未答时禁用）
    expect(screen.getByRole('button', { name: '上一题' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一题' })).toBeDisabled()
    expect(screen.getByText('第 1/2 题')).toBeInTheDocument()
  })

  it('fills basic-info, advances, and reaches the actual questionnaire', async () => {
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '开始作答' }))
    await screen.findByText('姓名')

    // 填姓名（text，不自动前进）
    fireEvent.change(screen.getByPlaceholderText('请输入'), { target: { value: '张三' } })
    // text 题不自动前进，点下一题
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))
    await screen.findByText('性别')
    // 选性别
    fireEvent.click(screen.getByText('男'))
    // auto-advance 到下一题（BASIC_INFO 完成 → CHINA_DRY_EYE 第 1 题）
    expect(await screen.findByText('隐形眼镜')).toBeInTheDocument()
  })

  it('answers a question, advances, and shows the next question', async () => {
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '开始作答' }))
    await screen.findByText('姓名')
    fireEvent.change(screen.getByPlaceholderText('请输入'), { target: { value: '张三' } })
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))
    await screen.findByText('性别')
    fireEvent.click(screen.getByText('男'))
    await screen.findByText('隐形眼镜')

    // 答 CHINA_DRY_EYE Q1
    fireEvent.click(screen.getByText('无'))
    // auto-advance 到第 2 题
    expect(await screen.findByText('睡眠')).toBeInTheDocument()
    // 上一题可点
    expect(screen.getByRole('button', { name: '上一题' })).toBeEnabled()
    // 末题 → 完成按钮
    expect(screen.getByRole('button', { name: '完成并生成报告' })).toBeDisabled()
  })

  it('goes back with 上一题 and revisits the first question', async () => {
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '开始作答' }))
    await screen.findByText('姓名')
    fireEvent.change(screen.getByPlaceholderText('请输入'), { target: { value: '张三' } })
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))
    await screen.findByText('性别')
    fireEvent.click(screen.getByText('男'))
    await screen.findByText('隐形眼镜')
    fireEvent.click(screen.getByText('无'))
    await screen.findByText('睡眠')

    fireEvent.click(screen.getByRole('button', { name: '上一题' }))
    expect(await screen.findByText('隐形眼镜')).toBeInTheDocument()
    expect(screen.getByText('第 1/2 题')).toBeInTheDocument()
  })

  it('shows patient info and questionnaire title in the history list', async () => {
    mocks.sessions = [
      {
        id: 's1',
        flowQuestionnaireId: 'CHINA_DRY_EYE',
        status: 'completed',
        updatedAt: '2026-08-10T10:00:00Z',
        answers: {},
        report: {
          patientInfo: [
            { label: '姓名', value: '张三' },
            { label: '年龄', value: '45岁' }
          ]
        }
      }
    ]
    render(<QuestionnairePage />)
    // 首页卡片 + 历史列表都显示"中国干眼"
    await waitFor(() => expect(screen.getAllByText('中国干眼').length).toBeGreaterThan(0))
    expect(screen.getByText('张三 · 45岁')).toBeInTheDocument()
  })

  it('disables 清空全部历史 when there are no records', async () => {
    render(<QuestionnairePage />)
    expect(await screen.findByText('暂无历史记录')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空全部历史' })).toBeDisabled()
  })

  it('deletes a single history record after confirmation', async () => {
    mocks.sessions = [
      { id: 's1', flowQuestionnaireId: 'CHINA_DRY_EYE', status: 'completed', updatedAt: 'x', answers: {}, report: null }
    ]
    render(<QuestionnairePage />)
    // 行内删除图标按钮（aria-label="删除"）
    fireEvent.click(await screen.findByLabelText('删除'))
    // ConfirmDialog 的确认按钮：行内图标 + 对话框按钮都叫"删除"，取最后一个（对话框内）
    await waitFor(() => {
      const btns = screen.getAllByRole('button', { name: '删除' })
      expect(btns.length).toBeGreaterThan(1)
      return btns
    })
    const btns = screen.getAllByRole('button', { name: '删除' })
    fireEvent.click(btns[btns.length - 1])
    expect(mocks.deleteSession).toHaveBeenCalledWith('/questionnaire-sessions/s1')
  })

  it('clears all history after confirmation', async () => {
    mocks.sessions = [
      {
        id: 's1',
        flowQuestionnaireId: 'CHINA_DRY_EYE',
        status: 'completed',
        updatedAt: 'x',
        answers: {},
        report: null
      },
      { id: 's2', flowQuestionnaireId: 'CHINA_DRY_EYE', status: 'completed', updatedAt: 'y', answers: {}, report: null }
    ]
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '清空全部历史' }))
    fireEvent.click(screen.getByRole('button', { name: '清空' }))
    expect(mocks.deleteSession).toHaveBeenCalledTimes(2)
    expect(mocks.deleteSession).toHaveBeenCalledWith('/questionnaire-sessions/s1')
    expect(mocks.deleteSession).toHaveBeenCalledWith('/questionnaire-sessions/s2')
  })

  it('re-answers a questionnaire seeded with the old answers', async () => {
    mocks.sessions = [
      {
        id: 's1',
        flowQuestionnaireId: 'CHINA_DRY_EYE',
        status: 'completed',
        updatedAt: 'x',
        answers: { BASIC_INFO: { name: '张三' }, CHINA_DRY_EYE: { Q1: 'A' } },
        report: null
      }
    ]
    render(<QuestionnairePage />)
    fireEvent.click(await screen.findByRole('button', { name: '重新作答' }))
    // 进入表单，从患者基本信息开始，预填姓名
    expect(await screen.findByText('姓名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入')).toHaveValue('张三')
  })
})
