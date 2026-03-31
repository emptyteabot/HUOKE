import { completionPlanForTask } from '../../../../lib/task-automation';
import { markDealWon } from '../../../../lib/intelligence/action-engine';
import {
  getTaskById,
  persistFollowUpTask,
  updateSourceStage,
  updateTaskStatus,
} from '../../../../lib/tasks';

type CompleteTaskPayload = {
  taskId?: string;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CompleteTaskPayload;
    const taskId = String(payload.taskId || '').trim();

    if (!taskId) {
      return Response.json({ error: '缺少 taskId。' }, { status: 400 });
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return Response.json({ error: '任务不存在。' }, { status: 404 });
    }

    if (task.status === 'completed') {
      return Response.json({ error: '任务已经完成。' }, { status: 409 });
    }

    if (task.sourceKind === 'payment_intent' && task.stepKey === 'confirm-payment') {
      await updateTaskStatus(taskId, 'completed');
      const result = await markDealWon({ contactKey: task.key });
      return Response.json({
        ...result,
        message: '已确认到账，并已生成启动交付包与后续 onboarding 任务。',
      });
    }

    const { patch, nextTask } = completionPlanForTask(task);
    await updateTaskStatus(taskId, 'completed');
    await updateSourceStage(task.sourceKind, task.sourceId, patch);
    if (nextTask) {
      await persistFollowUpTask(nextTask);
    }

    return Response.json({
      ok: true,
      message: nextTask
        ? '任务已完成，来源阶段已同步更新，并自动生成了下一步任务。'
        : '任务已完成，来源阶段已同步更新。',
      patch,
      nextTaskTitle: nextTask?.title || null,
    });
  } catch (error) {
    console.error('LeadPulse task completion failed:', error);
    return Response.json({ error: '系统繁忙，请稍后再试。' }, { status: 500 });
  }
}
