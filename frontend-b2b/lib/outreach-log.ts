import { randomUUID } from 'crypto';
import path from 'path';

import type { OutreachStageBucket } from './outreach';
import { readNamespace, upsertNamespaceRecord } from './storage';

export type OutreachEvent = {
  id: string;
  contactKey: string;
  contactName: string;
  company: string;
  stageBucket: OutreachStageBucket;
  stepKey: string;
  stepLabel: string;
  channel: string;
  subject: string;
  body: string;
  sentAt: string;
  operator: string;
};

type CreateOutreachEventArgs = Omit<OutreachEvent, 'id' | 'sentAt'> & {
  sentAt?: string;
};

const outreachLogPath = path.join(process.cwd(), '..', 'data', 'ops', 'outreach_log.json');
const OUTREACH_NAMESPACE = 'ops:outreach_events';

export function createOutreachEvent(args: CreateOutreachEventArgs): OutreachEvent {
  return {
    id: randomUUID(),
    sentAt: args.sentAt || new Date().toISOString(),
    ...args,
  };
}

export async function readOutreachEvents(): Promise<OutreachEvent[]> {
  return readNamespace<OutreachEvent>(OUTREACH_NAMESPACE, { legacyFilePath: outreachLogPath });
}

function uniqueKey(contactKey: string, stepKey: string) {
  return `${contactKey}::${stepKey}`;
}

export async function getOutreachEvent(contactKey: string, stepKey: string) {
  const events = await readOutreachEvents();
  return (
    events.find(
      (item) => uniqueKey(item.contactKey, item.stepKey) === uniqueKey(contactKey, stepKey),
    ) || null
  );
}

export async function persistOutreachEvent(event: OutreachEvent) {
  const existing = await readOutreachEvents();
  const existingIndex = existing.findIndex(
    (item) => uniqueKey(item.contactKey, item.stepKey) === uniqueKey(event.contactKey, event.stepKey),
  );

  if (existingIndex >= 0) {
    const next = {
      ...existing[existingIndex],
      ...event,
      id: existing[existingIndex].id,
      sentAt: existing[existingIndex].sentAt,
    };
    await upsertNamespaceRecord(OUTREACH_NAMESPACE, next, { legacyFilePath: outreachLogPath });
    return;
  }

  await upsertNamespaceRecord(OUTREACH_NAMESPACE, event, { legacyFilePath: outreachLogPath });
}
