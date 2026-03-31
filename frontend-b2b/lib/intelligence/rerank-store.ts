import path from 'path';

import { readNamespace, upsertNamespaceRecord } from '../storage';

export type RerankOverride = {
  contactKey: string;
  sourceKind: string;
  sourceId: string;
  company?: string;
  boost: number;
  reason: string;
  updatedAt: string;
};

const filePath = path.join(process.cwd(), '..', 'data', 'intelligence', 'rerank_overrides.json');
const RERANK_NAMESPACE = 'intelligence:rerank_overrides';

export async function readRerankOverrides(): Promise<RerankOverride[]> {
  return readNamespace<RerankOverride>(RERANK_NAMESPACE, {
    legacyFilePath: filePath,
    legacyIdResolver: (item) => String(item.contactKey || ''),
  });
}

export async function upsertRerankOverride(override: RerankOverride) {
  const existing = await readRerankOverrides();
  const next = existing.filter((item) => item.contactKey !== override.contactKey);
  const recordId = override.contactKey || `${override.sourceKind}:${override.sourceId}`;
  await upsertNamespaceRecord(
    RERANK_NAMESPACE,
    {
      id: recordId,
      ...override,
    },
    {
      legacyFilePath: filePath,
      legacyIdResolver: (item) => String(item.contactKey || ''),
    },
  );
}
