import { randomUUID } from 'crypto';
import path from 'path';

import { intakeFileForKind, readIntakeRecords, persistIntakeRecord } from './intake';
import { readNamespace, upsertNamespaceRecord } from './storage';

export type FollowUpTask = {
  id: string;
  sourceKind: 'design_partner' | 'booking_request' | 'payment_intent';
  sourceId: string;
  key: string;
  company: string;
  contactName: string;
  email: string;
  stage: string;
  priority: 'high' | 'medium' | 'low';
  channel: string;
  owner: string;
  title: string;
  detail: string;
  actionUrl?: string;
  actionLabel?: string;
  successHint?: string;
  dueAt: string;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt?: string;
  playbookId?: 'design_partner' | 'booking_request' | 'payment_intent';
  stepKey?: string;
  stepOrder?: number;
  stepLabel?: string;
};

type CreateTaskArgs = Omit<FollowUpTask, 'id' | 'createdAt' | 'status'> & {
  status?: FollowUpTask['status'];
};

const TASK_NAMESPACE = 'ops:follow_up_tasks';
const LEGACY_TASK_PATH = path.join(process.cwd(), '..', 'data', 'ops', 'follow_up_tasks.json');

function taskKey(sourceKind: string, sourceId: string, stepKey?: string) {
  return `${sourceKind}:${sourceId}:${String(stepKey || 'default').trim() || 'default'}`;
}

export function createFollowUpTask(args: CreateTaskArgs): FollowUpTask {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: args.status || 'pending',
    ...args,
  };
}

export function dueAtFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function readFollowUpTasks(): Promise<FollowUpTask[]> {
  return readNamespace<FollowUpTask>(TASK_NAMESPACE, { legacyFilePath: LEGACY_TASK_PATH });
}

export async function persistFollowUpTask(task: FollowUpTask) {
  const existing = await readFollowUpTasks();
  const existingIndex = existing.findIndex(
    (item) =>
      taskKey(item.sourceKind, item.sourceId, item.stepKey) === taskKey(task.sourceKind, task.sourceId, task.stepKey) &&
      item.status === 'pending',
  );

  if (existingIndex >= 0) {
    existing[existingIndex] = {
      ...existing[existingIndex],
      ...task,
      id: existing[existingIndex].id,
      createdAt: existing[existingIndex].createdAt,
    };
    await upsertNamespaceRecord(TASK_NAMESPACE, existing[existingIndex], {
      legacyFilePath: LEGACY_TASK_PATH,
    });
    return;
  }

  await upsertNamespaceRecord(TASK_NAMESPACE, task, { legacyFilePath: LEGACY_TASK_PATH });
}

export async function persistFollowUpTasks(tasks: FollowUpTask[]) {
  for (const task of tasks) {
    await persistFollowUpTask(task);
  }
}

export async function markTaskCompleted(taskId: string) {
  await updateTaskStatus(taskId, 'completed');
}

export async function getTaskById(taskId: string) {
  const tasks = await readFollowUpTasks();
  return tasks.find((item) => item.id === taskId) || null;
}

export async function getTasksByIds(taskIds: string[]) {
  const taskIdSet = new Set(taskIds);
  const tasks = await readFollowUpTasks();
  return tasks.filter((item) => taskIdSet.has(item.id));
}

export async function updateTaskStatus(
  taskId: string,
  status: FollowUpTask['status'],
) {
  const existing = await readFollowUpTasks();
  const updated = existing.map((item) =>
    item.id === taskId
      ? {
          ...item,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        }
      : item,
  );

  const target = updated.find((item) => item.id === taskId) || null;
  if (target) {
    await upsertNamespaceRecord(TASK_NAMESPACE, target, { legacyFilePath: LEGACY_TASK_PATH });
  }
  return target;
}

export async function updateTaskStatuses(
  taskIds: string[],
  status: FollowUpTask['status'],
) {
  const taskIdSet = new Set(taskIds);
  const existing = await readFollowUpTasks();
  const updated = existing.map((item) =>
    taskIdSet.has(item.id)
      ? {
          ...item,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        }
      : item,
  );

  const changed = updated.filter((item) => taskIdSet.has(item.id));
  for (const item of changed) {
    await upsertNamespaceRecord(TASK_NAMESPACE, item, { legacyFilePath: LEGACY_TASK_PATH });
  }
  return changed;
}

export async function updateSourceStage(
  sourceKind: FollowUpTask['sourceKind'],
  sourceId: string,
  patch: Record<string, string>,
) {
  const fileName = intakeFileForKind(sourceKind);
  const existingRecords = await readIntakeRecords<Record<string, string>>(fileName);
  const updatedRecord = existingRecords.find((record) => record.id === sourceId);
  if (!updatedRecord) {
    return;
  }
  await persistIntakeRecord(fileName, {
    ...updatedRecord,
    ...patch,
  });
}

export async function updateSourceStages(
  updates: Array<{
    sourceKind: FollowUpTask['sourceKind'];
    sourceId: string;
    patch: Record<string, string>;
  }>,
) {
  for (const item of updates) {
    await updateSourceStage(item.sourceKind, item.sourceId, item.patch);
  }
}
