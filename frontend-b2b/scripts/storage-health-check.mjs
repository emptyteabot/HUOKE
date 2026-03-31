import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.join(process.cwd(), '..', 'data', 'leadpulse_state.sqlite');
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

const db = new DatabaseSync(dbPath);

const rows = namespaces.map((namespace) => {
  const row = db.prepare('SELECT COUNT(*) AS count FROM documents WHERE namespace = ?').get(namespace);
  return {
    namespace,
    count: row.count,
  };
});

console.table(rows);
