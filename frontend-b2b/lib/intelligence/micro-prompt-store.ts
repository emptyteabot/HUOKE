import path from 'path';

import { readNamespace, upsertNamespaceRecord } from '../storage';

export type MicroPromptEntry = {
  id?: string;
  contactKey: string;
  sourceKind: string;
  sourceId: string;
  company: string;
  contactName: string;
  email: string;
  budget?: string;
  goal?: string;
  blockers?: string;
  timeframe?: string;
  createdAt: string;
};

const filePath = path.join(process.cwd(), '..', 'data', 'intelligence', 'micro_prompts.json');
const MICRO_PROMPT_NAMESPACE = 'intelligence:micro_prompts';

async function readEntries(): Promise<MicroPromptEntry[]> {
  return readNamespace<MicroPromptEntry>(MICRO_PROMPT_NAMESPACE, {
    legacyFilePath: filePath,
    legacyIdResolver: (item) =>
      `${item.contactKey || ''}:${item.sourceKind || ''}:${item.sourceId || ''}:${item.createdAt || ''}`,
  });
}

export async function appendMicroPromptEntry(entry: MicroPromptEntry) {
  const recordId =
    entry.id ||
    `${entry.contactKey}:${entry.sourceKind}:${entry.sourceId}:${entry.createdAt || new Date().toISOString()}`;
  await upsertNamespaceRecord(
    MICRO_PROMPT_NAMESPACE,
    {
      id: recordId,
      ...entry,
    },
    {
      legacyFilePath: filePath,
      legacyIdResolver: (item) =>
        `${item.contactKey || ''}:${item.sourceKind || ''}:${item.sourceId || ''}:${item.createdAt || ''}`,
    },
  );
}
