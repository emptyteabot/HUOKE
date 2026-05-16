import OpenAI from 'openai';
import { z } from 'zod';

export const leadIntentDecisionSchema = z
  .object({
    is_target_buyer: z.boolean(),
    is_toxic_vendor_or_peer: z.boolean(),
    pain_point_summary: z.string().min(0).max(600),
    lead_score: z.number().min(0).max(100),
    next_action_dm: z.string().min(0).max(600),
  })
  .strict();

export type LeadIntentDecision = z.infer<typeof leadIntentDecisionSchema>;

export type LeadIntentInput = {
  source?: string;
  sourceUrl?: string;
  author?: string;
  keyword?: string;
  content: string;
};

const BRUTAL_SYSTEM_PROMPT =
  "你是一个冷酷的中文B2B商业意图过滤器。你的唯一目标是识别出【正在为获客、买量亏损发愁的B端老板/SaaS创始人/代运营负责人】。必须拦截：微商、卖课镰刀、找工作的大学生、以及发软广的同行（包含'加V'、'私信我'）。";

const OUTPUT_CONTRACT = {
  type: 'object',
  additionalProperties: false,
  required: ['is_target_buyer', 'is_toxic_vendor_or_peer', 'pain_point_summary', 'lead_score', 'next_action_dm'],
  properties: {
    is_target_buyer: {
      type: 'boolean',
      description: 'true only when the author is a real B2B buyer/operator with active acquisition, paid traffic, conversion, or sales pipeline pain.',
    },
    is_toxic_vendor_or_peer: {
      type: 'boolean',
      description: 'true for vendors, agencies selling services, course sellers, job seekers, students, competitors, soft ads, WeChat/DM bait, or peer advice posts.',
    },
    pain_point_summary: {
      type: 'string',
      description: 'One sentence summary of the buyer pain. Empty string when rejected.',
    },
    lead_score: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: '0 for rejected posts. 70+ only for obvious buyers with concrete pain and plausible business role.',
    },
    next_action_dm: {
      type: 'string',
      description: 'Short DM angle for approved buyer. Empty string when rejected.',
    },
  },
} as const;

let clientSingleton: OpenAI | null = null;

function getLlmConfig() {
  const apiKey =
    process.env.LEADPULSE_LLM_API_KEY ||
    process.env.HUNTER_API_KEY ||
    process.env.GEEKSPACE_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error('missing_llm_api_key');
  }

  const baseURL =
    process.env.LEADPULSE_LLM_BASE_URL ||
    process.env.HUNTER_BASE_URL ||
    process.env.GEEKSPACE_BASE_URL ||
    (process.env.GEEKSPACE_API_KEY ? 'https://geekspace.cloud/v1' : '') ||
    process.env.DEEPSEEK_BASE_URL ||
    (process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/v1' : '') ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1';

  const model =
    process.env.LEADPULSE_LLM_MODEL ||
    process.env.HUNTER_MODEL ||
    process.env.GEEKSPACE_MODEL ||
    (process.env.GEEKSPACE_API_KEY ? 'gpt-5.5' : '') ||
    process.env.DEEPSEEK_MODEL ||
    (process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : '') ||
    process.env.OPENAI_MODEL ||
    'gpt-4o-mini';

  return {
    apiKey,
    baseURL,
    model,
    timeoutMs: Number(process.env.LEADPULSE_LLM_TIMEOUT_MS || 18000),
  };
}

function getClient() {
  if (clientSingleton) return clientSingleton;
  const config = getLlmConfig();
  clientSingleton = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
  });
  return clientSingleton;
}

function sanitizeDecision(value: LeadIntentDecision): LeadIntentDecision {
  const score = Math.max(0, Math.min(100, Math.trunc(Number(value.lead_score || 0))));
  const rejected = value.is_toxic_vendor_or_peer || !value.is_target_buyer;
  return {
    is_target_buyer: rejected ? false : value.is_target_buyer,
    is_toxic_vendor_or_peer: value.is_toxic_vendor_or_peer,
    pain_point_summary: rejected ? '' : String(value.pain_point_summary || '').slice(0, 600),
    lead_score: rejected ? 0 : score,
    next_action_dm: rejected ? '' : String(value.next_action_dm || '').slice(0, 600),
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('llm_timeout')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

const fallbackRejected: LeadIntentDecision = {
  is_target_buyer: false,
  is_toxic_vendor_or_peer: true,
  pain_point_summary: '',
  lead_score: 0,
  next_action_dm: '',
};

export function llmProviderSummary() {
  const config = getLlmConfig();
  return {
    baseURL: config.baseURL,
    model: config.model,
    timeoutMs: config.timeoutMs,
  };
}

export async function scoreLeadIntentWithLlm(input: LeadIntentInput): Promise<LeadIntentDecision> {
  if (!String(input.content || '').trim()) {
    return fallbackRejected;
  }

  const config = getLlmConfig();
  const client = getClient();
  const userContent = [
    '请只返回严格 JSON，不要 Markdown。',
    '判定标准：',
    '- 真买家：B端老板、SaaS 创始人、代运营负责人、营销负责人，正在主动寻找获客/广告投放/转化/销售管线解决方案。',
    '- 必须拦截：卖课、代运营广告、同行晒服务、招聘/求职、学生作业、微商、泛经验分享、只是问同行怎么卖的人。',
    '- 如果作者是在卖服务、导流私信/加V、推广课程或寻找客户，而不是买解决方案，is_toxic_vendor_or_peer=true 且 lead_score=0。',
    '',
    `Source: ${input.source || ''}`,
    `URL: ${input.sourceUrl || ''}`,
    `Author: ${input.author || ''}`,
    `Keyword: ${input.keyword || ''}`,
    `Post: ${String(input.content || '').slice(0, 4000)}`,
  ].join('\n');

  async function callWith(responseFormat: Record<string, unknown>) {
    return client.chat.completions.create({
      model: config.model,
      temperature: 0,
      response_format: responseFormat as never,
      messages: [
        { role: 'system', content: BRUTAL_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });
  }

  try {
    let response;
    try {
      response = await withTimeout(
        callWith({
          type: 'json_schema',
          json_schema: {
            name: 'lead_intent_decision',
            strict: true,
            schema: OUTPUT_CONTRACT,
          },
        }),
        config.timeoutMs,
      );
    } catch {
      response = await withTimeout(callWith({ type: 'json_object' }), config.timeoutMs);
    }

    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = leadIntentDecisionSchema.parse(JSON.parse(raw));
    return sanitizeDecision(parsed);
  } catch (error) {
    console.error('LeadPulse LLM scoring failed:', error);
    return fallbackRejected;
  }
}

export async function scoreLeadIntentBatchWithLlm<T extends LeadIntentInput>(
  rows: T[],
  options: { concurrency?: number } = {},
): Promise<Array<T & { llm_decision: LeadIntentDecision }>> {
  const concurrency = Math.max(1, Math.min(12, options.concurrency || Number(process.env.LEADPULSE_LLM_CONCURRENCY || 4)));
  const out: Array<T & { llm_decision: LeadIntentDecision }> = [];
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= rows.length) return;
      const row = rows[index];
      const decision = await scoreLeadIntentWithLlm(row);
      out[index] = {
        ...row,
        llm_decision: decision,
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()));
  return out.filter(Boolean);
}
