import {
  ENDPOINT_TYPE,
  endpointImpliedCapability,
  type EndpointType,
  MODALITY,
  type Modality,
  MODEL_CAPABILITY,
  type ModelCapability
} from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'
import { matchesPreset } from '@shared/utils/provider'
import { isSystemProviderId } from '@shared/utils/systemProviderId'

import type { ModelDrawerMode } from './types'

export type ModelPurpose = 'chat' | 'image-generation' | 'image-edit' | 'transcription'

export const MODEL_CHAT_ENDPOINT_TYPES = [
  ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS,
  ENDPOINT_TYPE.OPENAI_RESPONSES,
  ENDPOINT_TYPE.ANTHROPIC_MESSAGES,
  ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT
] as const

export type ModelChatEndpointType = (typeof MODEL_CHAT_ENDPOINT_TYPES)[number]

export interface ModelPurposeFields {
  endpointTypes?: readonly EndpointType[]
  capabilities?: readonly ModelCapability[]
  inputModalities?: readonly Modality[]
  outputModalities?: readonly Modality[]
}

export interface AppliedModelPurposeFields {
  endpointTypes: EndpointType[]
  capabilities: ModelCapability[]
  inputModalities?: Modality[]
  outputModalities?: Modality[]
}

export interface ApplyModelPurposeOptions {
  chatEndpointType?: ModelChatEndpointType
  previousPurpose?: ModelPurpose
}

type ModelDrawerProvider = Pick<Provider, 'id' | 'presetProviderId'>
type ProviderChatEndpoints = Pick<Provider, 'defaultChatEndpoint' | 'endpointConfigs'>

function isModelChatEndpointType(endpointType: string | undefined): endpointType is ModelChatEndpointType {
  return MODEL_CHAT_ENDPOINT_TYPES.some((candidate) => candidate === endpointType)
}

function addUnique<T>(items: readonly T[] | undefined, item: T): T[] {
  const next = [...(items ?? [])]
  if (!next.includes(item)) {
    next.push(item)
  }
  return next
}

function removeItem<T>(items: readonly T[] | undefined, item: T): T[] | undefined {
  return items?.filter((candidate) => candidate !== item)
}

export function getModelDrawerMode(provider: ModelDrawerProvider): ModelDrawerMode {
  if (matchesPreset(provider, 'new-api') || matchesPreset(provider, 'aionly')) {
    return 'endpoint-types'
  }
  if (provider.presetProviderId == null && !isSystemProviderId(provider.id)) {
    return 'purpose'
  }
  return 'legacy'
}

export function getProviderChatEndpointTypes(provider: ProviderChatEndpoints): ModelChatEndpointType[] {
  const endpointTypes: ModelChatEndpointType[] = []

  if (isModelChatEndpointType(provider.defaultChatEndpoint)) {
    endpointTypes.push(provider.defaultChatEndpoint)
  }

  for (const endpointType of Object.keys(provider.endpointConfigs ?? {})) {
    if (isModelChatEndpointType(endpointType) && !endpointTypes.includes(endpointType)) {
      endpointTypes.push(endpointType)
    }
  }

  return endpointTypes
}

export function inferModelPurpose(fields: ModelPurposeFields): ModelPurpose {
  const primaryEndpointType = fields.endpointTypes?.[0]

  if (primaryEndpointType === ENDPOINT_TYPE.OPENAI_IMAGE_EDIT) {
    return 'image-edit'
  }
  if (primaryEndpointType === ENDPOINT_TYPE.OPENAI_IMAGE_GENERATION) {
    return 'image-generation'
  }
  if (isSpeechToTextEndpointType(primaryEndpointType)) {
    return 'transcription'
  }
  if (!primaryEndpointType && fields.capabilities?.includes(MODEL_CAPABILITY.IMAGE_GENERATION)) {
    return 'image-generation'
  }
  if (!primaryEndpointType && fields.capabilities?.includes(MODEL_CAPABILITY.AUDIO_TRANSCRIPT)) {
    return 'transcription'
  }
  return 'chat'
}

/**
 * The model's primary endpoint is a dedicated speech-to-text one. The
 * registry-implied capability is the authority — only endpoints that exclusively
 * serve transcription count, so chat endpoints never match.
 */
function isSpeechToTextEndpointType(endpointType: EndpointType | undefined): boolean {
  return endpointType != null && endpointImpliedCapability(endpointType) === MODEL_CAPABILITY.AUDIO_TRANSCRIPT
}

export function getInitialChatEndpointType(
  fields: ModelPurposeFields,
  fallback: ModelChatEndpointType = ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS
): ModelChatEndpointType {
  return fields.endpointTypes?.find(isModelChatEndpointType) ?? fallback
}

export function applyModelPurpose(
  fields: ModelPurposeFields,
  purpose: ModelPurpose,
  options: ApplyModelPurposeOptions = {}
): AppliedModelPurposeFields {
  const previousPurpose = options.previousPurpose ?? inferModelPurpose(fields)
  let capabilities = [...(fields.capabilities ?? [])]
  let inputModalities = fields.inputModalities ? [...fields.inputModalities] : undefined
  let outputModalities = fields.outputModalities ? [...fields.outputModalities] : undefined

  // Strip the previous purpose's owned fields before applying the new one, so a
  // switch never leaves the model claiming two mutually-exclusive tasks.
  if (previousPurpose === 'image-generation' || previousPurpose === 'image-edit') {
    capabilities = capabilities.filter((capability) => capability !== MODEL_CAPABILITY.IMAGE_GENERATION)
    outputModalities = removeItem(outputModalities, MODALITY.IMAGE)

    if (previousPurpose === 'image-edit' && !capabilities.includes(MODEL_CAPABILITY.IMAGE_RECOGNITION)) {
      inputModalities = removeItem(inputModalities, MODALITY.IMAGE)
    }
  } else if (previousPurpose === 'transcription') {
    capabilities = capabilities.filter((capability) => capability !== MODEL_CAPABILITY.AUDIO_TRANSCRIPT)
    inputModalities = removeItem(inputModalities, MODALITY.AUDIO)
  }

  if (purpose === 'chat') {
    return {
      endpointTypes: [
        options.chatEndpointType ?? getInitialChatEndpointType(fields, ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS)
      ],
      capabilities,
      inputModalities,
      outputModalities
    }
  }

  if (purpose === 'transcription') {
    capabilities = addUnique(capabilities, MODEL_CAPABILITY.AUDIO_TRANSCRIPT)
    inputModalities = addUnique(inputModalities, MODALITY.AUDIO)
    outputModalities = addUnique(outputModalities, MODALITY.TEXT)

    return {
      endpointTypes: [ENDPOINT_TYPE.OPENAI_AUDIO_TRANSCRIPTION],
      capabilities,
      inputModalities,
      outputModalities
    }
  }

  capabilities = addUnique(capabilities, MODEL_CAPABILITY.IMAGE_GENERATION)
  outputModalities = addUnique(outputModalities, MODALITY.IMAGE)

  if (purpose === 'image-edit') {
    inputModalities = addUnique(inputModalities, MODALITY.IMAGE)
  }

  return {
    endpointTypes: [purpose === 'image-edit' ? ENDPOINT_TYPE.OPENAI_IMAGE_EDIT : ENDPOINT_TYPE.OPENAI_IMAGE_GENERATION],
    capabilities,
    inputModalities,
    outputModalities
  }
}
