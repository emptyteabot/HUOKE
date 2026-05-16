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

const ONSITE_INTELLIGENCE_SYSTEM_PROMPT =
  '你是一个冷酷的B2B站内转化意图评估器。你的任务是读取网站访问行为、预约表单和线索字段，只批准真实可能购买LeadPulse获客/转化解决方案的B端访客。必须拦截：空表单、学生调研、求职、供应商推销、同行套情报、低信息量浏览。对于已经提交预约、留下公司/邮箱、表达获客成本上涨/广告亏损/转化差/销售管线不足/想购买AI获客方案的访客，必须按商业语义给出0-100分。';

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

function responseText(response: unknown): string {
  const data = response as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string; type?: string }> } }>;
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };
  const chatContent = data.choices?.[0]?.message?.content;
  if (typeof chatContent === 'string') return chatContent;
  if (Array.isArray(chatContent)) {
    return chatContent.map((item) => item.text || '').join('').trim();
  }
  if (typeof data.output_text === 'string') return data.output_text;
  if (Array.isArray(data.output)) {
    return data.output
      .flatMap((item) => item.content || [])
      .map((item) => item.text || '')
      .join('')
      .trim();
  }
  return '';
}

function parseJsonObject(raw: string): unknown {
  const text = String(raw || '').trim();
  if (!text) throw new Error('empty_llm_response');
  if (text.startsWith('{') && text.endsWith('}')) return JSON.parse(text);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error('llm_response_not_json');
}

function parseDecisionPayload(raw: string): LeadIntentDecision {
  const parsed = leadIntentDecisionSchema.parse(parseJsonObject(raw));
  return sanitizeDecision(parsed);
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
  const isOnsiteIntelligence = input.source === 'leadpulse_onsite_intelligence';
  const userContent = [
    '请只返回严格 JSON，不要 Markdown。必须使用且只能使用这些字段名：is_target_buyer, is_toxic_vendor_or_peer, pain_point_summary, lead_score, next_action_dm。',
    '判定标准：',
    isOnsiteIntelligence
      ? '- 真买家：留下邮箱/公司/预算/预约动作，并表达获客、广告投放、转化、营收、销售管线或AI获客方案需求的B端访客。'
      : '- 真买家：B端老板、SaaS 创始人、代运营负责人、营销负责人，正在主动寻找获客/广告投放/转化/销售管线解决方案。',
    isOnsiteIntelligence
      ? '- 必须拦截：空泛浏览、无公司/无联系方式、学生调研、招聘求职、供应商推销、同行套情报、低信息量表单。'
      : '- 必须拦截：卖课、代运营广告、同行晒服务、招聘/求职、学生作业、微商、泛经验分享、只是问同行怎么卖的人。',
    isOnsiteIntelligence
      ? '- 如果访客没有明确商业身份或没有表达购买/预约/解决业务痛点的动作，is_toxic_vendor_or_peer=true 且 lead_score=0。'
      : '- 如果作者是在卖服务、导流私信/加V、推广课程或寻找客户，而不是买解决方案，is_toxic_vendor_or_peer=true 且 lead_score=0。',
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
        { role: 'system', content: isOnsiteIntelligence ? ONSITE_INTELLIGENCE_SYSTEM_PROMPT : BRUTAL_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });
  }

  async function repairMalformedJson(raw: string) {
    const response = await withTimeout(
      client.chat.completions.create({
        model: config.model,
        temperature: 0,
        response_format: { type: 'json_object' } as never,
        messages: [
          {
            role: 'system',
            content:
              '你是 JSON 结构化修复器。只把上游 LLM 的商业意图判定转换成指定 schema，不要重新解释业务，不要输出 Markdown。',
          },
          {
            role: 'user',
            content: [
              '必须输出且只能输出 JSON：',
              '{"is_target_buyer":boolean,"is_toxic_vendor_or_peer":boolean,"pain_point_summary":string,"lead_score":number,"next_action_dm":string}',
              '字段规则：被拒绝时 is_target_buyer=false, is_toxic_vendor_or_peer=true, lead_score=0, pain_point_summary="", next_action_dm=""。',
              '原始输入：',
              userContent.slice(0, 3000),
              '上游 LLM 输出：',
              String(raw || '').slice(0, 3000),
            ].join('\n'),
          },
        ],
      }),
      config.timeoutMs,
    );
    return parseDecisionPayload(responseText(response));
  }

  try {
    let lastRaw = '';
    let lastError: unknown;
    const responseFormats = [
      {
        type: 'json_schema',
        json_schema: {
          name: 'lead_intent_decision',
          strict: true,
          schema: OUTPUT_CONTRACT,
        },
      },
      { type: 'json_object' },
    ];

    for (const responseFormat of responseFormats) {
      try {
        const response = await withTimeout(callWith(responseFormat), config.timeoutMs);
        lastRaw = responseText(response);
        return parseDecisionPayload(lastRaw);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastRaw) {
      return await repairMalformedJson(lastRaw);
    }
    throw lastError || new Error('llm_scoring_failed');
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
