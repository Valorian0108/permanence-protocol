export const RECORD_TYPES = ['question', 'observation', 'hypothesis', 'finding', 'proposal', 'other', 'not-sure'] as const;
export const MAX_CONTEXT_FIELD_LENGTH = 4000;
export const MAX_RECORD_CONTENT_LENGTH = 10000;

export type RecordType = (typeof RECORD_TYPES)[number];

export type RecordContext = {
  recordType?: RecordType | null;
  sources?: string | null;
  method?: string | null;
  limitations?: string | null;
};

/** Fixed-order, versioned serialization shared by browser hashing and server verification. */
export function serializeRecordV2(content: string, context: RecordContext = {}) {
  return JSON.stringify([
    'permanence-record-v2',
    content,
    context.recordType || null,
    context.sources || null,
    context.method || null,
    context.limitations || null,
  ]);
}
