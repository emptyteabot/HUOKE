import { appendMicroPromptEntry } from '../../../../lib/intelligence/micro-prompt-store';
import { createFollowUpTask, dueAtFromNow, persistFollowUpTask, updateSourceStage } from '../../../../lib/tasks';

type MicroPromptPayload = {
  contactKey?: string;
  sourceKind?: 'design_partner' | 'booking_request' | 'payment_intent';
  sourceId?: string;
  company?: string;
  contactName?: string;
  email?: string;
  budget?: string;
  goal?: string;
  blockers?: string;
  timeframe?: string;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MicroPromptPayload;

    if (!payload.contactKey || !payload.sourceKind || !payload.sourceId) {
      return Response.json({ error: '缺少 contactKey、sourceKind 或 sourceId。' }, { status: 400 });
    }

    const summary = [
      payload.budget ? `预算：${payload.budget}` : '',
      payload.goal ? `目标：${payload.goal}` : '',
      payload.blockers ? `阻碍：${payload.blockers}` : '',
      payload.timeframe ? `周期：${payload.timeframe}` : '',
    ]
      .filter(Boolean)
      .join('；');

    await updateSourceStage(payload.sourceKind, payload.sourceId, {
      stage: '信息补全中',
      priority: 'medium',
      nextAction: summary ? `已补充信息，下一步按这些约束推进：${summary}` : '已补充信息，下一步继续推进成交判断。',
      intelligenceAction: 'open_micro_prompt',
      intelligenceAppliedAt: new Date().toISOString(),
      microPromptBudget: String(payload.budget || '').trim(),
      microPromptGoal: String(payload.goal || '').trim(),
      microPromptBlockers: String(payload.blockers || '').trim(),
      microPromptTimeframe: String(payload.timeframe || '').trim(),
    });

    await appendMicroPromptEntry({
      contactKey: String(payload.contactKey).trim().toLowerCase(),
      sourceKind: payload.sourceKind,
      sourceId: payload.sourceId,
      company: String(payload.company || ''),
      contactName: String(payload.contactName || ''),
      email: String(payload.email || ''),
      budget: String(payload.budget || '').trim() || undefined,
      goal: String(payload.goal || '').trim() || undefined,
      blockers: String(payload.blockers || '').trim() || undefined,
      timeframe: String(payload.timeframe || '').trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    await persistFollowUpTask(
      createFollowUpTask({
        sourceKind: payload.sourceKind,
        sourceId: payload.sourceId,
        key: String(payload.contactKey).trim().toLowerCase(),
        company: String(payload.company || '未命名线索'),
        contactName: String(payload.contactName || payload.company || '未命名线索'),
        email: String(payload.email || ''),
        stage: '信息补全中',
        priority: 'medium',
        channel: '表单 / 邮件',
        owner: 'Founder',
        title: '根据补充信息继续推进',
        detail: summary || '已提交微表单，但仍需人工确认下一步。 ',
        dueAt: dueAtFromNow(12),
        playbookId: payload.sourceKind,
        stepKey: 'intelligence-open_micro_prompt',
        stepOrder: 98,
        stepLabel: '补信息',
      }),
    );

    return Response.json({
      ok: true,
      message: '补充信息已记录，系统会按新的约束继续推进。',
    });
  } catch (error) {
    console.error('LeadPulse micro prompt failed:', error);
    return Response.json({ error: '补信息提交失败。' }, { status: 500 });
  }
}
