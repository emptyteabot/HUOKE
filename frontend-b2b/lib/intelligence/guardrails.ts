import { randomUUID } from 'crypto';

import type { DeterministicOperation, GuardrailReport, LeadContext, RouterDecision } from './types';

function operation(
  type: DeterministicOperation['type'],
  summary: string,
  requiredFields: string[],
  approved: boolean,
  owner: DeterministicOperation['owner'],
): DeterministicOperation {
  return {
    id: randomUUID(),
    type,
    summary,
    requiredFields,
    approved,
    owner,
  };
}

export function buildGuardrailReport(args: {
  lead?: LeadContext;
  route: RouterDecision;
}): GuardrailReport {
  const lead = args.lead || {};
  const blockedReasons: string[] = [];

  const hasEmail = Boolean(lead.email);
  const hasCompany = Boolean(lead.company);
  const hasPlan = Boolean(lead.selectedPlan);

  const operations: DeterministicOperation[] = [
    operation(
      'neon_lead_upsert',
      '把当前线索写入 Lead / visitor profile 表，供后续跟进和编排使用。',
      ['sessionId or email'],
      hasEmail || hasCompany,
      'sql_transaction',
    ),
    operation(
      'followup_task_create',
      '根据路由结果创建后续任务，而不是让大模型直接改核心任务表。',
      ['company or email', 'route'],
      hasEmail || hasCompany,
      'sql_transaction',
    ),
  ];

  if (args.route.destination === 'recommendation_agent') {
    operations.push(
      operation(
        'recommendation_rerank_apply',
        '以硬编码过滤条件 + 结构化字段对推荐结果应用重排，不让模型直接改价格或结算逻辑。',
        ['route', 'catalog ids'],
        true,
        'hardcoded_api',
      ),
    );
  }

  if (args.route.destination === 'closer_agent') {
    const stripeApproved = hasEmail && hasPlan;
    const ledgerApproved = hasEmail && hasPlan;

    if (!stripeApproved) {
      blockedReasons.push('缺少 email 或 selectedPlan，禁止生成 Stripe 订阅动作。');
    }

    if (!ledgerApproved) {
      blockedReasons.push('缺少 email 或 selectedPlan，禁止写入计费台账。');
    }

    operations.push(
      operation(
        'stripe_subscription_prepare',
        '通过硬编码套餐映射创建 Stripe checkout / subscription 准备动作。',
        ['email', 'selectedPlan'],
        stripeApproved,
        'payment_gateway',
      ),
    );
    operations.push(
      operation(
        'billing_ledger_write',
        '把订阅动作写入计费台账；金额只能来自套餐映射，不能来自模型自由输出。',
        ['email', 'selectedPlan'],
        ledgerApproved,
        'sql_transaction',
      ),
    );
  }

  const deniedOps = operations.filter((item) => !item.approved);
  if (deniedOps.length === 0 && blockedReasons.length === 0) {
    return {
      approved: true,
      blockedReasons: [],
      operations,
    };
  }

  return {
    approved: false,
    blockedReasons,
    operations,
  };
}
