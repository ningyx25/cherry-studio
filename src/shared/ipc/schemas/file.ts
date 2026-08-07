import {
  CleanupPolicySchema,
  ContentHashSchema,
  FileEntryIdSchema,
  FileHandleSchema,
  SafeNameSchema
} from '@shared/data/types/file'
import {
  AbsoluteFilePathSchema,
  Base64StringSchema,
  FileVersionSchema,
  PhysicalFileMetadataSchema,
  SafeExtSchema,
  UrlStringSchema
} from '@shared/types/file'
import * as z from 'zod'

import { defineRoute } from '../define'
import { uint8ArraySchema } from './common'

/** Maximum entry ids accepted by one file batch IPC call. */
export const FILE_IPC_MAX_BATCH_IDS = 500
/** Maximum bytes returned by one range-read IPC call. */
export const FILE_IPC_MAX_READ_CHUNK_BYTES = 4 * 1024 * 1024

const fileEntryIdsInputSchema = z.strictObject({
  ids: z.array(FileEntryIdSchema).max(FILE_IPC_MAX_BATCH_IDS)
})

const batchGetMetadataInputSchema = z.strictObject({
  items: z.array(z.strictObject({ key: z.string().min(1), handle: FileHandleSchema })).max(FILE_IPC_MAX_BATCH_IDS)
})

const binaryReadOptionsSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('full'), encoding: z.literal('binary') }),
  z.strictObject({
    mode: z.literal('range'),
    offset: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    length: z.number().int().positive().max(FILE_IPC_MAX_READ_CHUNK_BYTES)
  })
])

const binaryReadInputSchema = z.strictObject({ handle: FileHandleSchema, options: binaryReadOptionsSchema })

const binaryReadResultSchema = z.strictObject({
  content: uint8ArraySchema,
  mime: z.string().min(1),
  version: FileVersionSchema
})

const writeIfUnchangedInputSchema = z.strictObject({
  handle: FileHandleSchema,
  data: uint8ArraySchema,
  expectedVersion: FileVersionSchema,
  expectedContentHash: ContentHashSchema.optional()
})

// Fields common to every create-entry source. `cleanupPolicy` is required at
// all creation surfaces (file-entry-cleanup.md §4.1) — written once here, not
// per union branch. `.extend()` keeps the branches strict.
const createInternalEntryBaseSchema = z.strictObject({ cleanupPolicy: CleanupPolicySchema })

// TODO(file-ipc): Unify these schemas with the transport types in
// `src/shared/types/file/ipc.ts`, which still hand-mirror this union. Every
// branch's payload schema now carries its transport type (`AbsoluteFilePath`,
// `UrlString`, `Base64String`), so the two can finally be collapsed onto one
// source of truth; see the matching TODO there for what remains to check.
//
// Exported: the legacy single-create channel (`File_CreateInternalEntry`,
// registered in FileManager) parses with this same schema — one source of truth.
export const createInternalEntryInputSchema = z.discriminatedUnion('source', [
  createInternalEntryBaseSchema.extend({ source: z.literal('path'), path: AbsoluteFilePathSchema }),
  createInternalEntryBaseSchema.extend({ source: z.literal('url'), url: UrlStringSchema }),
  createInternalEntryBaseSchema.extend({
    source: z.literal('base64'),
    data: Base64StringSchema,
    name: SafeNameSchema.optional()
  }),
  createInternalEntryBaseSchema.extend({
    source: z.literal('bytes'),
    data: uint8ArraySchema,
    name: SafeNameSchema,
    ext: SafeExtSchema.nullable()
  })
])

export type CreateInternalEntryInput = z.infer<typeof createInternalEntryInputSchema>

/**
 * File IPC schemas — filesystem-backed FileManager operations.
 *
 * SQL-only FileEntry reads stay on DataApi (`/files/entries`). These routes cover
 * live FS metadata and mutations / system actions that must run in main.
 */
export const fileRequestSchemas = {
  'file.read': defineRoute({ input: binaryReadInputSchema, output: binaryReadResultSchema }),
  'file.write_if_unchanged': defineRoute({ input: writeIfUnchangedInputSchema, output: FileVersionSchema }),
  'file.batch_get_metadata': defineRoute({
    input: batchGetMetadataInputSchema,
    output: z.record(z.string(), PhysicalFileMetadataSchema.nullable())
  }),
  'file.get_metadata': defineRoute({ input: FileHandleSchema, output: PhysicalFileMetadataSchema.nullable() }),
  'file.batch_get_physical_paths': defineRoute({
    input: fileEntryIdsInputSchema,
    output: z.record(z.string(), AbsoluteFilePathSchema.nullable())
  }),
  'file.open': defineRoute({ input: FileHandleSchema, output: z.void() }),
  'file.show_in_folder': defineRoute({ input: FileHandleSchema, output: z.void() })
}
