'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { withBasePath } from '../lib/base-path';

type Props = {
  contactKey: string;
  sourceKind: 'design_partner' | 'booking_request' | 'payment_intent';
  sourceId: string;
  company: string;
  contactName: string;
  email: string;
};

export function MicroPromptForm(props: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    budget: '',
    goal: '',
    blockers: '',
    timeframe: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(withBasePath('/api/intelligence/micro-prompt'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...props,
          ...form,
        }),
      });

      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(result.error || '提交失败，请稍后再试。');
      }

      setSuccess(result.message || '已记录。');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span>预算范围</span>
          <input
            value={form.budget}
            onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
            className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
            placeholder="例如：¥3k-¥10k / $500-$2k"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>希望达成的目标</span>
          <input
            value={form.goal}
            onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}
            className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
            placeholder="例如：先拿到 10 个预约 / 先跑通付款"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm text-slate-700">
        <span>当前最大的阻碍</span>
        <textarea
          value={form.blockers}
          onChange={(event) => setForm((current) => ({ ...current, blockers: event.target.value }))}
          className="min-h-28 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
          placeholder="例如：不会筛线索 / 预约后不转化 / 支付链路还没接好"
        />
      </label>

      <label className="space-y-2 text-sm text-slate-700">
        <span>希望的推进周期</span>
        <input
          value={form.timeframe}
          onChange={(event) => setForm((current) => ({ ...current, timeframe: event.target.value }))}
          className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
          placeholder="例如：本周内 / 14 天内 / 本月内"
        />
      </label>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? '提交中...' : '提交补充信息'}
      </button>
    </form>
  );
}
