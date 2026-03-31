import { randomUUID } from 'crypto';
import path from 'path';

import { readNamespace, upsertNamespaceRecord } from './storage';

export const segmentLabels: Record<string, string> = {
  study_abroad_agency: '留学机构',
  immigration_consulting: '移民咨询',
  job_search_service: '求职服务',
  b2b_consulting: 'B2B 咨询',
  premium_training: '高客单培训',
  ai_agency: 'AI Agency',
  micro_saas_founder: 'AI Builder Founder',
};

type IntakeKind = 'design_partner' | 'booking_request' | 'payment_intent';

type CreateRecordArgs = {
  kind: IntakeKind;
  payload: Record<string, string>;
};

const intakeDir = path.join(process.cwd(), '..', 'data', 'intake');
const intakeFileMap: Record<IntakeKind, string> = {
  design_partner: 'design_partner_applications.json',
  booking_request: 'booking_requests.json',
  payment_intent: 'payment_intents.json',
};

const intakeNamespaceMap: Record<IntakeKind, string> = {
  design_partner: 'intake:design_partner',
  booking_request: 'intake:booking_request',
  payment_intent: 'intake:payment_intent',
};

function kindFromFileName(fileName: string): IntakeKind {
  const normalized = String(fileName || '').trim();
  if (normalized === intakeFileMap.design_partner) return 'design_partner';
  if (normalized === intakeFileMap.booking_request) return 'booking_request';
  return 'payment_intent';
}

function namespaceForFileName(fileName: string) {
  const kind = kindFromFileName(fileName);
  return {
    kind,
    namespace: intakeNamespaceMap[kind],
    legacyFilePath: path.join(intakeDir, intakeFileMap[kind]),
  };
}

export function createIntakeRecord<TPayload extends Record<string, string>>({
  kind,
  payload,
}: {
  kind: IntakeKind;
  payload: TPayload;
}) {
  return {
    id: randomUUID(),
    kind,
    createdAt: new Date().toISOString(),
    ...payload,
  } as {
    id: string;
    kind: IntakeKind;
    createdAt: string;
  } & TPayload;
}

export async function persistIntakeRecord(fileName: string, record: Record<string, string>) {
  const { namespace, legacyFilePath } = namespaceForFileName(fileName);
  await upsertNamespaceRecord(namespace, record as { id: string }, { legacyFilePath });
}

export async function readIntakeRecords<T>(fileName: string) {
  const { namespace, legacyFilePath } = namespaceForFileName(fileName);
  return readNamespace<T>(namespace, { legacyFilePath });
}

export function intakeFileForKind(kind: IntakeKind) {
  return intakeFileMap[kind];
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }
}

export async function fanOutNotifications(summaryText: string, record: Record<string, string>) {
  const tasks: Promise<void>[] = [];

  const genericWebhook = process.env.LEADPULSE_INTAKE_WEBHOOK_URL;
  if (genericWebhook) {
    tasks.push(postJson(genericWebhook, record));
  }

  const slackWebhook = process.env.LEADPULSE_SLACK_WEBHOOK_URL;
  if (slackWebhook) {
    tasks.push(postJson(slackWebhook, { text: summaryText }));
  }

  const feishuWebhook = process.env.LEADPULSE_FEISHU_WEBHOOK_URL;
  if (feishuWebhook) {
    tasks.push(
      postJson(feishuWebhook, {
        msg_type: 'text',
        content: {
          text: summaryText,
        },
      }),
    );
  }

  const gasWebhook = process.env.LEADPULSE_GOOGLE_APPS_SCRIPT_URL;
  if (gasWebhook) {
    tasks.push(postJson(gasWebhook, record));
  }

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length > 0) {
    console.error('LeadPulse intake fan-out failures:', failures);
  }
}
