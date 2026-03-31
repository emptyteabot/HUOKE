import {
  getTasksByIds,
  persistFollowUpTask,
  updateSourceStages,
  updateTaskStatuses,
} from '../../../../lib/tasks';
import { completionPlanForTask } from '../../../../lib/task-automation';
import { markDealWon } from '../../../../lib/intelligence/action-engine';

type CompleteBatchPayload = {
  taskIds?: string[];
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CompleteBatchPayload;
    const taskIds = Array.isArray(payload.taskIds)
      ? payload.taskIds.map((item) => String(item).trim()).filter(Boolean)
      : [];

    if (taskIds.length === 0) {
      return Response.json({ error: '缺少 taskIds。' }, { status: 400 });
    }

    const tasks = (await getTasksByIds(taskIds)).filter((task) => task.status !== 'completed');
    if (tasks.length === 0) {
      return Response.json({ error: '没有可完成的待办任务。' }, { status: 404 });
    }

    const paymentConfirmationTasks = tasks.filter(
      (task) => task.sourceKind === 'payment_intent' && task.stepKey === 'confirm-payment',
    );
    const regularTasks = tasks.filter(
      (task) => !(task.sourceKind === 'payment_intent' && task.stepKey === 'confirm-payment'),
    );

    const completionPlans = regularTasks.map((task) => ({
      task,
      ...completionPlanForTask(task),
    }));

    if (regularTasks.length) {
      await updateTaskStatuses(
        regularTasks.map((item) => item.id),
        'completed',
      );

      await updateSourceStages(
        completionPlans.map((item) => ({
          sourceKind: item.task.sourceKind,
          sourceId: item.task.sourceId,
          patch: item.patch,
        })),
      );

      await Promise.all(
        completionPlans
          .map((item) => item.nextTask)
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => persistFollowUpTask(item)),
      );
    }

    if (paymentConfirmationTasks.length) {
      await updateTaskStatuses(
        paymentConfirmationTasks.map((item) => item.id),
        'completed',
      );
      await Promise.all(
        paymentConfirmationTasks.map((task) => markDealWon({ contactKey: task.key })),
      );
    }

    return Response.json({
      ok: true,
      message: `已完成 ${tasks.length} 个任务，并同步更新来源阶段与下一步任务。`,
      count: tasks.length,
    });
  } catch (error) {
    console.error('LeadPulse task batch completion failed:', error);
    return Response.json({ error: '系统繁忙，请稍后再试。' }, { status: 500 });
  }
}
