'use client';

import { useState } from 'react';

const defaultPayload = {
  posts: [
    {
      id: 'reddit-1',
      source: 'reddit',
      title: 'Need more clients for my AI agency',
      body: 'We build fast, but still struggle with pricing, bookings and paid customers.',
      comments: ['How do you consistently get qualified leads?'],
      metrics: { likes: 12, replies: 6 },
    },
    {
      id: 'xhs-1',
      source: 'xiaohongshu',
      title: '做了产品但没有人买',
      body: '上线了一个 AI 工具，但不会获客，也没有预约和成交，不知道从哪里开始。',
      comments: ['想先知道怎么找到愿意付费的人'],
      metrics: { likes: 20, replies: 4 },
    },
  ],
  runtimeMetrics: {
    bounceRate: 0.38,
    conversionRateDrop: 0.12,
    loopCount: 1,
    abnormalExitRate: 0.14,
  },
};

type WorkflowResponse = {
  ok?: boolean;
  error?: string;
  workflow?: {
    observation: {
      messages: Array<{ postId: string; source: string; captureWeight: number; warnings: string[] }>;
    };
    closedLoop: Array<{
      postId: string;
      judgment: { level: string; probability: number; reasons: string[] };
      feedback: { explanation: string; userFacingMessage: string };
      action: { rankingAction: string; nextStep: string; leadPriority: string };
    }>;
    circuitBreaker: {
      triggered: boolean;
      mode: string;
      reason: string;
    };
    modelTiering: {
      principle: string;
      lightweightModel: string;
      premiumModel: string;
      explanation: string;
    };
  };
};

export function CommunityClosedLoopLab() {
  const [payload, setPayload] = useState(JSON.stringify(defaultPayload, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<WorkflowResponse['workflow'] | null>(null);

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/community/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const data = (await response.json()) as WorkflowResponse;
      if (!response.ok || !data.ok || !data.workflow) {
        throw new Error(data.error || '运行失败。');
      }
      setResult(data.workflow);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : '运行失败。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">输入和信号定义</div>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">先把高价值线索的输入打实</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          这里不是大而全后台，而是最小闭环实验台。粘贴社区帖子样本，直接跑“观察—判断—反馈—动作”。
        </p>

        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="mt-5 min-h-[420px] w-full rounded-[1.5rem] border border-black/10 bg-[#fafaf7] px-4 py-4 font-sans text-sm leading-6 text-slate-900 outline-none transition focus:border-black/20"
          spellCheck={false}
        />

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="interactive-button mt-5 inline-flex rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0062c3] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '运行中...' : '运行闭环'}
        </button>
      </section>

      <section className="space-y-6">
        <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">观察层</div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">先看系统到底观察到了什么</h2>
          <div className="mt-5 space-y-3">
            {result?.observation.messages?.length ? (
              result.observation.messages.map((item) => (
                <div key={item.postId} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm text-slate-700">
                  {item.source} · {item.postId} · capture {item.captureWeight}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#fafaf7] px-4 py-4 text-sm text-slate-500">
                运行后这里会显示被捕获进环境消息池的帖子。
              </div>
            )}
          </div>
        </article>

        <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">判断—反馈—动作</div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">不做黑箱，直接给理由和动作</h2>
          <div className="mt-5 space-y-4">
            {result?.closedLoop?.length ? (
              result.closedLoop.map((item) => (
                <div key={item.postId} className="rounded-[1.5rem] border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-lg font-semibold text-slate-950">{item.postId}</div>
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-700">
                      {item.judgment.level} · {Math.round(item.judgment.probability * 100)}%
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.feedback.userFacingMessage}</p>
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    {item.feedback.explanation}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                      排序动作：{item.action.rankingAction}
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                      线索优先级：{item.action.leadPriority}
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                    下一步：{item.action.nextStep}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#fafaf7] px-4 py-4 text-sm text-slate-500">
                运行后这里会显示每条线索的判断、解释和动作回流。
              </div>
            )}
          </div>
        </article>

        <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">熔断与成本</div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">低置信时暂停，高成本只在必要时触发</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
              熔断状态：{result?.circuitBreaker ? `${result.circuitBreaker.mode} · ${result.circuitBreaker.reason}` : '等待运行'}
            </div>
            <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
              模型分层：{result?.modelTiering ? `${result.modelTiering.lightweightModel} -> ${result.modelTiering.premiumModel}` : '等待运行'}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
