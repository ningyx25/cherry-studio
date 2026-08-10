import { application } from '@application'
import { loggerService } from '@logger'
import { parseQuestionnaireDefinition } from '@shared/questionnaire/schemas'
import type { QuestionnaireDefinition } from '@shared/questionnaire/types'
import fs from 'fs'
import path from 'path'

const logger = loggerService.withContext('QuestionnaireDefinitionService')

/**
 * 加载打包的问卷定义（只读）。非生命周期单例——无长生命周期资源，
 * 仅在访问时读取文件系统并缓存。非法定义跳过并记录，不崩溃。
 */
export class QuestionnaireDefinitionService {
  private cache = new Map<string, QuestionnaireDefinition>()

  private get definitionsDir(): string {
    return application.getPath('feature.questionnaire.definitions')
  }

  /** 全部定义摘要（id/title/description），供列表页。 */
  list(): Array<{ questionnaireId: string; title: string; description: string }> {
    return this.loadAll().map((d) => ({
      questionnaireId: d.questionnaireId,
      title: d.title,
      description: d.description
    }))
  }

  get(questionnaireId: string): QuestionnaireDefinition | undefined {
    return this.loadAll().find((d) => d.questionnaireId === questionnaireId)
  }

  private loadAll(): QuestionnaireDefinition[] {
    if (this.cache.size > 0) return Array.from(this.cache.values())
    const dir = this.definitionsDir
    if (!fs.existsSync(dir)) {
      logger.warn('Questionnaire definitions directory missing', { dir })
      return []
    }
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
        const def = parseQuestionnaireDefinition(raw)
        this.cache.set(def.questionnaireId, def)
      } catch (error) {
        logger.error('Failed to load questionnaire definition', error as Error, { file })
      }
    }
    logger.info('Loaded questionnaire definitions', { count: this.cache.size })
    return Array.from(this.cache.values())
  }
}

export const questionnaireDefinitionService = new QuestionnaireDefinitionService()
