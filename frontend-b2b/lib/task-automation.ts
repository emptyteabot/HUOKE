import {
  createFollowUpTask,
  dueAtFromNow,
  type FollowUpTask,
} from './tasks';

type TaskPlaybookStep = {
  key: string;
  order: number;
  label: string;
  defaultStage: string;
  title: string;
  detail: string;
  dueHours: number;
  priority: FollowUpTask['priority'];
  patch: {
    stage: string;
    nextAction: string;
  };
  matchers: string[];
};

type TaskPlaybook = {
  id: FollowUpTask['sourceKind'];
  label: string;
  steps: TaskPlaybookStep[];
};

export type TaskStepSummary = {
  playbookId: FollowUpTask['sourceKind'];
  playbookLabel: string;
  stepKey: string;
  stepOrder: number;
  totalSteps: number;
  stepLabel: string;
  progressLabel: string;
  isFinalStep: boolean;
};

type CompletionPreview = {
  patch: Record<string, string>;
  nextTaskTitle: string | null;
  nextTaskStepLabel: string | null;
  nextTaskProgressLabel: string | null;
};

const PLAYBOOKS: Record<FollowUpTask['sourceKind'], TaskPlaybook> = {
  design_partner: {
    id: 'design_partner',
    label: '设计伙伴推进',
    steps: [
      {
        key: 'qualify',
        order: 1,
        label: '资格判断',
        defaultStage: '待资格判断',
        title: '完成资格判断并决定推预约还是 Pro / Max',
        detail: '围绕 ICP、客单价、支付能力和当前瓶颈判断推进路径。',
        dueHours: 24,
        priority: 'medium',
        patch: {
          stage: '已完成资格判断',
          nextAction: '已完成资格判断，下一步发送预约链接或直接推进 Pro / Max。',
        },
        matchers: ['资格判断', 'Design Partner 申请', '推预约'],
      },
      {
        key: 'push-offer',
        order: 2,
        label: '推进预约 / 方案',
        defaultStage: '资格判断已完成',
        title: '发送预约链接或直接推进 Pro / Max',
        detail: '根据资格判断结果，明确是推诊断预约还是直接给出 credits 方案。',
        dueHours: 12,
        priority: 'medium',
        patch: {
          stage: '已发送预约 / 方案',
          nextAction: '若 72 小时未回复，发送二次跟进并强调 credits、部署和回本路径。',
        },
        matchers: ['预约链接', '推进 Pro / Max', '推进 Pro', '推进 Max'],
      },
      {
        key: 'follow-up-72h',
        order: 3,
        label: '72h 二次跟进',
        defaultStage: '已发送预约 / 方案',
        title: '72 小时未回复则发送二次跟进',
        detail: '强调更快上线、内建支付、credits 回本路径和交付速度，争取拿到回复。',
        dueHours: 72,
        priority: 'medium',
        patch: {
          stage: '已发送 72h 跟进',
          nextAction: '根据回复决定转预约、转收款，或暂时归档等待新的行为信号。',
        },
        matchers: ['72 小时', '二次跟进'],
      },
      {
        key: 'close-loop',
        order: 4,
        label: '本轮收口',
        defaultStage: '已发送 72h 跟进',
        title: '根据回复决定转预约、转收款或暂时归档',
        detail: '完成本轮推进收口，记录是否进入预约、付款或等待后续再激活。',
        dueHours: 72,
        priority: 'low',
        patch: {
          stage: '已完成本轮设计伙伴推进',
          nextAction: '本轮设计伙伴推进已完成，如有新回复、预约或付款意向再重新启动。',
        },
        matchers: ['暂时归档', '本轮收口', '转收款'],
      },
    ],
  },
  booking_request: {
    id: 'booking_request',
    label: '诊断成交推进',
    steps: [
      {
        key: 'confirm-booking',
        order: 1,
        label: '确认诊断',
        defaultStage: '待确认诊断',
        title: '确认预约时间并发送会前准备',
        detail: '锁定时间、沟通渠道和会前材料，确保诊断不聊空话。',
        dueHours: 12,
        priority: 'medium',
        patch: {
          stage: '已确认诊断',
          nextAction: '已确认诊断时间，通话结束后 24 小时内推进付费或直接推 Pro。',
        },
        matchers: ['确认预约时间', '会前准备', '确认诊断'],
      },
      {
        key: 'post-call-push',
        order: 2,
        label: '会后成交推进',
        defaultStage: '诊断已确认',
        title: '会后推进付费或直接推 Pro',
        detail: '围绕诊断结论、ROI 和 credits 方案，在 24 小时内推进成交。',
        dueHours: 24,
        priority: 'medium',
        patch: {
          stage: '已完成诊断',
          nextAction: '若 48 小时仍未付费，发送二次跟进和方案对比，争取锁定决策。',
        },
        matchers: ['会后推进付费', '直接推 Pro', '通话结束后'],
      },
      {
        key: 'follow-up-48h',
        order: 3,
        label: '48h 二次跟进',
        defaultStage: '已完成诊断',
        title: '48 小时未付费则发送二次跟进',
        detail: '补充案例、价格梯度、credits 分配和执行承诺，争取拿到最终决策。',
        dueHours: 48,
        priority: 'medium',
        patch: {
          stage: '已发送 48h 跟进',
          nextAction: '最后确认是否推进 Pro / Max，或先归档进入 nurture 队列。',
        },
        matchers: ['48 小时', '二次跟进'],
      },
      {
        key: 'decision-lock',
        order: 4,
        label: '决策收口',
        defaultStage: '已发送 48h 跟进',
        title: '锁定最终决策或暂时归档',
        detail: '确认是否成交、转介绍或回到 nurture 队列，并记录原因。',
        dueHours: 72,
        priority: 'low',
        patch: {
          stage: '已完成本轮诊断推进',
          nextAction: '本轮诊断成交推进已完成，等待新的预约、付款或转介绍信号。',
        },
        matchers: ['最终决策', '暂时归档', '决策收口'],
      },
    ],
  },
  payment_intent: {
    id: 'payment_intent',
    label: '收款与续费经营',
    steps: [
      {
        key: 'confirm-payment',
        order: 1,
        label: '收款确认',
        defaultStage: '待确认收款',
        title: '确认订阅收款并发放 credits',
        detail: '确认到账、开通 credits、同步订阅，并安排 onboarding。',
        dueHours: 6,
        priority: 'high',
        patch: {
          stage: '已确认收款',
          nextAction: '已确认收款，下一步 24 小时内完成 onboarding 并交付首批结果。',
        },
        matchers: ['确认', '收款', '发放 credits'],
      },
      {
        key: 'onboarding',
        order: 2,
        label: 'Onboarding',
        defaultStage: '已确认收款',
        title: '发放 credits 并安排 onboarding',
        detail: '完成 credits 发放、权限开通、导出代码、部署与首次操作培训。',
        dueHours: 24,
        priority: 'high',
        patch: {
          stage: '已启动 onboarding',
          nextAction: '7 天内复盘激活、首个结果与 credits 使用情况，提前看续费风险。',
        },
        matchers: ['onboarding', '发放 credits'],
      },
      {
        key: 'week-one-review',
        order: 3,
        label: '首周复盘',
        defaultStage: '已启动 onboarding',
        title: '7 天内复盘激活与首个结果',
        detail: '检查 credits 消耗、激活率、是否跑通获客动作，并对齐下一阶段预期。',
        dueHours: 168,
        priority: 'medium',
        patch: {
          stage: '已完成首周复盘',
          nextAction: '继续检查活跃度与续费风险，准备扩容、续费或升级 Max。',
        },
        matchers: ['7 天', '首周', '复盘激活'],
      },
      {
        key: 'renewal-risk',
        order: 4,
        label: '续费风险',
        defaultStage: '已完成首周复盘',
        title: '检查续费风险并准备扩容 / 续费',
        detail: '围绕使用深度、团队 adoption、追加预算和转介绍机会推进续费。',
        dueHours: 336,
        priority: 'medium',
        patch: {
          stage: '已完成续费风险检查',
          nextAction: '客户已进入稳定经营阶段，等待扩容、续费或转介绍信号。',
        },
        matchers: ['续费', '风险', '扩容'],
      },
    ],
  },
};

function fallbackStep(task: Pick<FollowUpTask, 'sourceKind'>) {
  return PLAYBOOKS[task.sourceKind].steps[0];
}

function isFulfillmentExecutionTask(task: Pick<FollowUpTask, 'stepKey'>) {
  return String(task.stepKey || '').startsWith('fulfillment-');
}

function matchStep(task: Pick<FollowUpTask, 'sourceKind' | 'title' | 'stage' | 'stepKey' | 'stepOrder'>) {
  const playbook = PLAYBOOKS[task.sourceKind];
  if (task.stepKey) {
    const matchedByKey = playbook.steps.find((step) => step.key === task.stepKey);
    if (matchedByKey) {
      return matchedByKey;
    }
  }

  if (typeof task.stepOrder === 'number') {
    const matchedByOrder = playbook.steps.find((step) => step.order === task.stepOrder);
    if (matchedByOrder) {
      return matchedByOrder;
    }
  }

  const haystack = `${task.title} ${task.stage}`.toLowerCase();
  const matchedByText = playbook.steps.find((step) =>
    step.matchers.some((matcher) => haystack.includes(matcher.toLowerCase())),
  );
  return matchedByText || fallbackStep(task);
}

export function taskStepSummary(
  task: Pick<FollowUpTask, 'sourceKind' | 'title' | 'stage' | 'stepKey' | 'stepOrder'>,
): TaskStepSummary {
  if (isFulfillmentExecutionTask(task)) {
    const order = typeof task.stepOrder === 'number' ? task.stepOrder : 1;
    return {
      playbookId: 'payment_intent',
      playbookLabel: '交付执行',
      stepKey: String(task.stepKey || 'fulfillment'),
      stepOrder: order,
      totalSteps: order,
      stepLabel: task.title,
      progressLabel: `执行 ${order}`,
      isFinalStep: false,
    };
  }

  const playbook = PLAYBOOKS[task.sourceKind];
  const step = matchStep(task);
  return {
    playbookId: playbook.id,
    playbookLabel: playbook.label,
    stepKey: step.key,
    stepOrder: step.order,
    totalSteps: playbook.steps.length,
    stepLabel: step.label,
    progressLabel: `P${step.order}/${playbook.steps.length}`,
    isFinalStep: step.order === playbook.steps.length,
  };
}

export function isTaskOverdue(task: Pick<FollowUpTask, 'dueAt' | 'status'>, now = new Date()) {
  if (task.status === 'completed') {
    return false;
  }

  const dueAt = new Date(task.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    return false;
  }

  return dueAt.getTime() < now.getTime();
}

export function completionPreviewForTask(task: FollowUpTask): CompletionPreview {
  if (isFulfillmentExecutionTask(task)) {
    return {
      patch: {
        stage: task.stage,
        nextAction: `已完成交付执行任务：${task.title}`,
        lastCompletedTaskTitle: task.title,
        lastCompletedStepLabel: task.stepLabel || task.title,
        lastCompletedStepOrder: String(task.stepOrder || 1),
        taskPlaybookLabel: '交付执行',
      },
      nextTaskTitle: null,
      nextTaskStepLabel: null,
      nextTaskProgressLabel: null,
    };
  }

  const playbook = PLAYBOOKS[task.sourceKind];
  const step = matchStep(task);
  const nextStep = playbook.steps.find((item) => item.order === step.order + 1) || null;

  return {
    patch: {
      stage: step.patch.stage,
      nextAction: step.patch.nextAction,
      lastCompletedTaskTitle: task.title,
      lastCompletedStepLabel: step.label,
      lastCompletedStepOrder: String(step.order),
      taskPlaybookLabel: playbook.label,
    },
    nextTaskTitle: nextStep?.title || null,
    nextTaskStepLabel: nextStep?.label || null,
    nextTaskProgressLabel: nextStep ? `P${nextStep.order}/${playbook.steps.length}` : null,
  };
}

export function completionPlanForTask(task: FollowUpTask) {
  if (isFulfillmentExecutionTask(task)) {
    return {
      patch: completionPreviewForTask(task).patch,
      nextTask: null,
    };
  }

  const playbook = PLAYBOOKS[task.sourceKind];
  const step = matchStep(task);
  const preview = completionPreviewForTask(task);
  const nextStep = playbook.steps.find((item) => item.order === step.order + 1) || null;

  return {
    patch: preview.patch,
    nextTask: nextStep
      ? createFollowUpTask({
          sourceKind: task.sourceKind,
          sourceId: task.sourceId,
          key: task.key,
          company: task.company,
          contactName: task.contactName,
          email: task.email,
          stage: nextStep.defaultStage,
          priority: nextStep.priority,
          channel: task.channel,
          owner: task.owner,
          title: nextStep.title,
          detail: nextStep.detail,
          dueAt: dueAtFromNow(nextStep.dueHours),
          playbookId: playbook.id,
          stepKey: nextStep.key,
          stepOrder: nextStep.order,
          stepLabel: nextStep.label,
        })
      : null,
  };
}

export function initialTaskFieldsForSource(sourceKind: FollowUpTask['sourceKind']) {
  const playbook = PLAYBOOKS[sourceKind];
  const step = playbook.steps[0];
  return {
    playbookId: playbook.id,
    stepKey: step.key,
    stepOrder: step.order,
    stepLabel: step.label,
    stage: step.defaultStage,
    title: step.title,
    detail: step.detail,
    priority: step.priority,
    dueHours: step.dueHours,
  };
}
