import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const statePath = path.join(process.cwd(), '..', 'data', 'leadpulse_state.json');
const namespaces = [
  'intake:design_partner',
  'intake:booking_request',
  'intake:payment_intent',
  'ops:follow_up_tasks',
  'ops:communication_drafts',
  'ops:fulfillment_packages',
  'intelligence:rerank_overrides',
  'ops:outreach_events',
  'self-growth:summary.json',
  'ops:agent_runtime_snapshot',
];

function readDocuments() {
  if (!existsSync(statePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf-8'));
    return Array.isArray(parsed?.documents) ? parsed.documents : [];
  } catch {
    return [];
  }
}

const documents = readDocuments();
const rows = namespaces.map((namespace) => ({
  namespace,
  count: documents.filter((item) => item.namespace === namespace).length,
}));

console.table(rows);
