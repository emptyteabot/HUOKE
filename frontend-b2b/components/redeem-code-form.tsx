'use client';

import { useState } from 'react';

import { withBasePath } from '../lib/base-path';

type Props = {
  defaultCompany?: string;
  defaultPlan?: string;
  initialCode?: string;
};

type RedeemState = {
  code: string;
  email: string;
  company: string;
  productUrl: string;
};

type RedeemResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  startUrl?: string;
};

export function RedeemCodeForm({ defaultCompany = '', initialCode = '' }: Props) {
  const [formState, setFormState] = useState<RedeemState>({
    code: String(initialCode || '').trim().toUpperCase(),
    email: '',
    company: defaultCompany,
    productUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(key: keyof RedeemState, value: string) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(withBasePath('/api/redeem-code'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formState),
      });
      const payload = (await response.json()) as RedeemResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || '兑换失败，请稍后再试。');
      }

      setSuccess(payload.message || '兑换成功，正在跳转。');
      if (payload.startUrl) {
        window.location.assign(payload.startUrl);
        return;
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '兑换失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div>
        <p className="font-mono text-[11px] tracking-[0.28em] text-slate-500">兑换开通</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">已经买到兑换码，直接在这里开通</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          LeadPulse 不再假装自动收款。你先付款拿到兑换码，再在这里兑换，系统才会生成启动交付包。
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-2 text-sm text-slate-700">
          <span>兑换码</span>
          <input
            className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
            value={formState.code}
            onChange={(event) => updateField('code', event.target.value.toUpperCase())}
            placeholder="例如：ABCD-EFGH-JKLM"
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>邮箱</span>
            <input
              type="email"
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>公司 / 项目</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.company}
              onChange={(event) => updateField('company', event.target.value)}
              required
            />
          </label>
        </div>

        <label className="space-y-2 text-sm text-slate-700">
          <span>产品链接</span>
          <input
            type="url"
            placeholder="https://..."
            className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
            value={formState.productUrl}
            onChange={(event) => updateField('productUrl', event.target.value)}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="interactive-button inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '正在兑换...' : '兑换并开通'}
        </button>
      </form>
    </div>
  );
}
