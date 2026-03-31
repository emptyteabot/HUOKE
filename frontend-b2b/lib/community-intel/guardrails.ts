import type { CommunityDeterministicGuardrail, CommunityOutreachDraft, CommunityRouterDecision } from './types';

function byId<T extends { postId: string }>(items: T[], postId: string) {
  return items.find((item) => item.postId === postId);
}

export function runCommunityDeterministicGuardrails(args: {
  routes: CommunityRouterDecision[];
  drafts: CommunityOutreachDraft[];
}): CommunityDeterministicGuardrail[] {
  return args.routes.map((route) => {
    const draft = byId(args.drafts, route.postId);
    const blockedReasons: string[] = [];

    if (!draft) {
      blockedReasons.push('当前没有形成有效触达草稿。');
    }

    if (draft?.requiresHumanReview) {
      blockedReasons.push('触达草稿仍需人工复核，不能直接由 LLM 发送。');
    }

    if (route.route === 'tool_call_collect_more') {
      blockedReasons.push('当前阶段只允许补信息，不允许直接发送确定性触达。');
    }

    return {
      postId: route.postId,
      allowSend: blockedReasons.length === 0,
      allowBilling: false,
      blockedReasons,
      executionOwner: 'hardcoded_api',
    };
  });
}
