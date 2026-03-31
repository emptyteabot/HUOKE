import { applyDeterministicIntelligenceAction, type IntelligenceActionType } from '../../../../lib/intelligence/action-engine';
import { createCommunicationDraft, persistCommunicationDraft } from '../../../../lib/communications';
import { upsertRerankOverride } from '../../../../lib/intelligence/rerank-store';

type ActionPayload = {
  contactKey?: string;
  action?: IntelligenceActionType;
};

const allowedActions: IntelligenceActionType[] = ['handoff_to_closer', 'rerank_catalog', 'open_micro_prompt'];

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ActionPayload;
    const contactKey = String(payload.contactKey || '').trim().toLowerCase();
    const action = payload.action;

    if (!contactKey || !action) {
      return Response.json({ error: '缺少 contactKey 或 action。' }, { status: 400 });
    }

    if (!allowedActions.includes(action)) {
      return Response.json({ error: '不支持的 action。' }, { status: 400 });
    }

    const result = await applyDeterministicIntelligenceAction({
      contactKey,
      action,
    });

    if (action === 'rerank_catalog') {
      await upsertRerankOverride({
        contactKey,
        sourceKind: result.sourceKind,
        sourceId: result.sourceId,
        company: result.company,
        boost: 35,
        reason: '已由确定性动作确认进入高优先推荐队列。',
        updatedAt: new Date().toISOString(),
      });
    }

    if (action === 'handoff_to_closer') {
      await persistCommunicationDraft(
        createCommunicationDraft({
          sourceKind: result.sourceKind,
          sourceId: result.sourceId,
          key: result.contactKey,
          company: result.company,
          contactName: result.contactName,
          email: result.email,
          stage: result.stage,
          priority: 'high',
          channel: 'email',
          templateKey: 'intelligence-closer-email',
          templateLabel: 'Closer 成交推进邮件',
          objective: '把高意向线索尽快推进到预约、报价或收款',
          subject: `${result.company}：今天把预约、报价或收款定下来`,
          body: [
            `Hi ${result.contactName}，`,
            '',
            `我这边已经把 ${result.company} 标记为高意向优先线索。`,
            '现在最值钱的不是继续泛聊，而是直接把下一步定下来：预约、报价，或者确认收款。',
            '',
            `当前建议：${result.nextAction}`,
            '',
            '— LeadPulse',
          ].join('\n'),
          readyAt: new Date().toISOString(),
        }),
      );

      await persistCommunicationDraft(
        createCommunicationDraft({
          sourceKind: result.sourceKind,
          sourceId: result.sourceId,
          key: result.contactKey,
          company: result.company,
          contactName: result.contactName,
          email: result.email,
          stage: result.stage,
          priority: 'high',
          channel: 'dm',
          templateKey: 'intelligence-closer-dm',
          templateLabel: 'Closer 成交推进私信',
          objective: '快速拿到回复并锁定成交下一步',
          subject: 'Closer 跟进',
          body: `${result.contactName}，我这边已经把你标成高意向优先线索。下一步别再泛聊了，直接把预约、报价或收款中的一个定下来。当前建议：${result.nextAction}`,
          readyAt: new Date().toISOString(),
        }),
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error('LeadPulse intelligence apply action failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : '执行智能动作失败。' },
      { status: 500 },
    );
  }
}
