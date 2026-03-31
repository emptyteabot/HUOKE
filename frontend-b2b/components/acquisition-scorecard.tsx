'use client';

import { useMemo, useState } from 'react';

type AuditState = {
  offerMaturity: number;
  customerSource: number;
  followUp: number;
  founderDependency: number;
  dealSize: number;
};

const initialState: AuditState = {
  offerMaturity: 18,
  customerSource: 15,
  followUp: 10,
  founderDependency: 10,
  dealSize: 10,
};

const optionGroups = [
  {
    key: 'offerMaturity',
    label: '你现在卖的东西成熟度',
    options: [
      { label: '还在验证', value: 10 },
      { label: '已有 MVP', value: 18 },
      { label: '已经有人付费', value: 25 },
    ],
  },
  {
    key: 'customerSource',
    label: '客户主要来自哪里',
    options: [
      { label: '主要靠转介绍', value: 8 },
      { label: '内容 + 转介绍混合', value: 15 },
      { label: '已有主动获客渠道', value: 20 },
    ],
  },
  {
    key: 'followUp',
    label: '跟进节奏是否固定',
    options: [
      { label: '几乎没有', value: 5 },
      { label: '纯手动跟', value: 10 },
      { label: '已有明确 SOP', value: 15 },
    ],
  },
  {
    key: 'founderDependency',
    label: '是否过度依赖创始人',
    options: [
      { label: '几乎全靠我', value: 5 },
      { label: '一半靠我', value: 10 },
      { label: '团队能分担', value: 15 },
    ],
  },
  {
    key: 'dealSize',
    label: '平均客单价',
    options: [
      { label: '3 千以下', value: 5 },
      { label: '3 千 - 2 万', value: 10 },
      { label: '2 万以上', value: 15 },
    ],
  },
] as const;

function recommendationFromScore(score: number) {
  if (score >= 80) {
    return {
      title: '可以直接上主力版',
      summary: '你已经不是“有没有需求”的问题，而是需要把目标池、触达节奏和复盘系统跑顺。',
      nextSteps: ['锁定 1-2 个 ICP', '补齐预约前资格判断', '把跟进从临时发挥改成固定 SOP'],
    };
  }

  if (score >= 60) {
    return {
      title: '适合先从入门版切',
      summary: '你已经有付费可能性，但获客流程还没稳定。先跑一个细分切口和一条成交链路最划算。',
      nextSteps: ['先选最容易回款的人群', '优先修正外联与跟进节奏', '把内容和销售异议连接起来'],
    };
  }

  return {
    title: '先别加功能，先把卖法理顺',
    summary: '你的问题更像定位和获客动作分散，而不是功能不够多。先做体检，再决定要不要立刻放大。',
    nextSteps: ['收敛一个最痛的用户场景', '先拿到 3 次真实销售对话', '减少泛流量，增加高意向触达'],
  };
}

export function AcquisitionScorecard() {
  const [auditState, setAuditState] = useState<AuditState>(initialState);
  const [copied, setCopied] = useState(false);

  const score = useMemo(
    () => Object.values(auditState).reduce((sum, value) => sum + value, 0),
    [auditState],
  );

  const recommendation = useMemo(() => recommendationFromScore(score), [score]);
  const template = useMemo(
    () =>
      [
        'LeadPulse 免费获客体检结果',
        `当前得分：${score}/90`,
        `判断：${recommendation.title}`,
        `建议：${recommendation.summary}`,
        ...recommendation.nextSteps.map((item, index) => `${index + 1}. ${item}`),
      ].join('\n'),
    [recommendation, score],
  );

  const updateField = (key: keyof AuditState, value: number) => {
    setAuditState((current) => ({ ...current, [key]: value }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Free Tool
          </p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-950">免费获客体检器</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            2 分钟打个分，看你现在更适合先做定位、入门版试点，还是直接上主力版。
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {optionGroups.map((group) => (
            <div key={group.key}>
              <p className="text-sm font-medium text-slate-700">{group.label}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {group.options.map((option) => {
                  const active = auditState[group.key] === option.value;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => updateField(group.key, option.value)}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        active
                          ? 'border-black/15 bg-[#f6f7f4] text-slate-950'
                          : 'border-black/10 bg-white text-slate-600 hover:border-black/15 hover:bg-[#fbfbf8]'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Score
            </p>
            <h4 className="mt-3 text-5xl font-semibold text-slate-950">{score}</h4>
            <p className="mt-2 text-sm text-slate-600">90 分制，越高越适合立刻放大。</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-[#f6f7f4] px-4 py-3 text-sm text-slate-700">
            {recommendation.title}
          </div>
        </div>

        <p className="mt-6 text-base leading-7 text-slate-700">{recommendation.summary}</p>

        <ul className="mt-6 space-y-3 text-sm text-slate-700">
          {recommendation.nextSteps.map((step) => (
            <li key={step} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
              {step}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-2xl border border-black/5 bg-[#f8f8f4] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">内容模板</p>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{template}</pre>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
          >
            {copied ? '已复制模板' : '复制体检模板'}
          </button>
          <a
            href="/book"
            className="inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
          >
            预约诊断通话
          </a>
        </div>
      </div>
    </div>
  );
}
