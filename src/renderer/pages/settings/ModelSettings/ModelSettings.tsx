import { Button, InfoTooltip, PageSidePanel } from '@cherrystudio/ui'
import { loggerService } from '@logger'
import {
  SettingContainer,
  SettingDescription,
  SettingDivider,
  SettingGroup,
  SettingRow,
  SettingRowTitle,
  SettingsContentColumn,
  SettingTitle
} from '@renderer/components/SettingsPrimitives'
import { useDefaultModel } from '@renderer/hooks/useModel'
import { useProviders } from '@renderer/hooks/useProvider'
import { useTheme } from '@renderer/hooks/useTheme'
import { toast } from '@renderer/services/toast'
import { cn } from '@renderer/utils/style'
import { type Model } from '@shared/data/types/model'
import { isNonChatModel } from '@shared/utils/model'
import { MessageSquareMore, Rocket, Settings2 } from 'lucide-react'
import type { FC, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DefaultModelSelector } from './DefaultModelSelector'
import { TopicNamingSettings } from './TopicNamingSettings'

const logger = loggerService.withContext('ModelSettings')

interface ModelSettingsProps {
  showSettingsButton?: boolean
  showDescription?: boolean
  showDividers?: boolean
  modelFilter?: (model: Model) => boolean
  autoFillEmptyModels?: boolean
  onDefaultModelSelected?: (model: Model) => void | Promise<void>
  compact?: boolean
  className?: string
}

interface ModelSettingRowProps {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  compact?: boolean
  children: ReactNode
}

const ModelSettingRow: FC<ModelSettingRowProps> = ({ icon, title, description, compact, children }) => (
  <SettingRow className={cn(compact ? 'flex-col items-stretch gap-3 py-1' : 'items-start gap-6 py-1.5')}>
    <div className="min-w-0 flex-1">
      <SettingRowTitle className="gap-2">
        {icon}
        {title}
      </SettingRowTitle>
      {description && <SettingDescription className="mt-1.5 leading-5">{description}</SettingDescription>}
    </div>
    <div className={compact ? 'flex w-full items-center gap-2' : 'flex w-[340px] shrink-0 items-center gap-2'}>
      {children}
    </div>
  </SettingRow>
)

type ModelSettingsPanel = 'quick-model' | null

const MODEL_SETTINGS_DRAWER_WIDTH_CLASS = '!w-[min(31.25rem,calc(100%-1rem))]'
const SETTINGS_DRAWER_BODY_CLASS = 'space-y-0 px-6 py-5'

const drawerTitleClassName = 'truncate font-semibold text-foreground text-sm leading-4'

const ModelSettings: FC<ModelSettingsProps> = ({
  showSettingsButton = true,
  showDescription = true,
  showDividers = true,
  modelFilter,
  autoFillEmptyModels = false,
  onDefaultModelSelected,
  compact = false,
  className
}) => {
  const { defaultModel, quickModel, setDefaultModel, setQuickModel } = useDefaultModel()
  const { providers } = useProviders({ enabled: true })
  const [activePanel, setActivePanel] = useState<ModelSettingsPanel>(null)
  const { theme } = useTheme()
  const { t } = useTranslation()

  const chatModelFilter = useCallback(
    (model: Model) => !isNonChatModel(model) && (modelFilter?.(model) ?? true),
    [modelFilter]
  )
  const selectableDefaultModel = defaultModel && chatModelFilter(defaultModel) ? defaultModel : undefined
  const selectableQuickModel = quickModel && chatModelFilter(quickModel) ? quickModel : undefined
  const shouldAutoFillEmptyModels = autoFillEmptyModels && !selectableDefaultModel && !selectableQuickModel

  const onSelectDefault = useCallback(
    (selected: Model | undefined) => {
      if (!selected) return

      const updatePromise = shouldAutoFillEmptyModels
        ? setDefaultModel(selected, { forceCascade: true })
        : setDefaultModel(selected)
      void updatePromise
        .then(() => onDefaultModelSelected?.(selected))
        .catch((error) => {
          logger.error('Failed to handle default model selection', { modelId: selected.id, error })
          toast.error(t('settings.models.manage.operation_failed'))
        })
    },
    [onDefaultModelSelected, setDefaultModel, shouldAutoFillEmptyModels, t]
  )

  const onSelectQuick = useCallback(
    (selected: Model | undefined) => {
      if (!selected) return
      void setQuickModel(selected)
    },
    [setQuickModel]
  )

  const closePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  const groupStyle = compact ? { padding: 0, border: 'none', background: 'transparent' } : undefined

  const ContainerComponent = compact ? SettingContainer : SettingsContentColumn
  const containerProps = compact ? { style: { padding: 0, background: 'transparent' } } : {}

  return (
    <div className={cn('relative flex min-h-0 flex-1', className)}>
      <ContainerComponent theme={theme} {...containerProps}>
        <SettingGroup theme={theme} style={groupStyle} className={compact ? 'space-y-3' : undefined}>
          {!compact && (
            <>
              <SettingTitle>{t('settings.model')}</SettingTitle>
              <SettingDivider />
            </>
          )}
          <ModelSettingRow
            compact={compact}
            icon={<MessageSquareMore size={16} className="lucide-custom shrink-0 text-foreground" />}
            title={t('settings.models.default_assistant_model')}
            description={showDescription ? t('settings.models.default_assistant_model_description') : undefined}>
            <DefaultModelSelector
              model={selectableDefaultModel}
              providers={providers}
              filter={chatModelFilter}
              compact={compact}
              onSelect={onSelectDefault}
              placeholder={t('settings.models.empty')}
            />
          </ModelSettingRow>
          {showDividers && <SettingDivider />}
          <ModelSettingRow
            compact={compact}
            icon={<Rocket size={16} className="lucide-custom shrink-0 text-foreground" />}
            title={
              <>
                {t('settings.models.quick_model.label')}
                <InfoTooltip content={t('settings.models.quick_model.tooltip')} />
              </>
            }
            description={showDescription ? t('settings.models.quick_model.description') : undefined}>
            <DefaultModelSelector
              model={selectableQuickModel}
              providers={providers}
              filter={chatModelFilter}
              compact={compact}
              onSelect={onSelectQuick}
              placeholder={t('settings.models.empty')}
            />
            {showSettingsButton && (
              <Button
                aria-label={t('settings.models.quick_model.setting_title')}
                className="shrink-0"
                onClick={() => setActivePanel('quick-model')}
                size="icon-sm"
                variant="outline">
                <Settings2 size={16} />
              </Button>
            )}
          </ModelSettingRow>
          {showDividers && <SettingDivider />}
        </SettingGroup>
      </ContainerComponent>
      {showSettingsButton && (
        <>
          <PageSidePanel
            open={activePanel === 'quick-model'}
            onClose={closePanel}
            closeLabel={t('common.close')}
            header={<h2 className={drawerTitleClassName}>{t('settings.models.quick_model.setting_title')}</h2>}
            contentClassName={MODEL_SETTINGS_DRAWER_WIDTH_CLASS}
            bodyClassName={SETTINGS_DRAWER_BODY_CLASS}>
            <TopicNamingSettings />
          </PageSidePanel>
        </>
      )}
    </div>
  )
}

export default ModelSettings
