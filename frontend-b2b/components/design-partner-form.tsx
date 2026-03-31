'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { withBasePath } from '../lib/base-path';
import { getPlanById } from '../lib/pricing';

type FormState = {
  name: string;
  email: string;
  company: string;
  website: string;
  segment: string;
  monthlyRevenue: string;
  bottleneck: string;
};

type SuccessPayload = {
  bookingUrl?: string;
  paymentUrl?: string;
  proofUrl?: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  company: '',
  website: '',
  segment: 'study_abroad_agency',
  monthlyRevenue: '',
  bottleneck: '',
};

type Props = {
  variant?: 'embedded' | 'page';
};

export function DesignPartnerForm({ variant = 'embedded' }: Props) {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successPayload, setSuccessPayload] = useState<SuccessPayload>({});
  const isPage = variant === 'page';

  const fallbackBookingUrl = useMemo(() => process.env.NEXT_PUBLIC_BOOKING_URL || '/book', []);
  const fallbackPaymentUrl = useMemo(() => getPlanById('pro').paymentUrl, []);

  const updateField = (key: keyof FormState, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    setSuccessPayload({});

    try {
      const response = await fetch(withBasePath('/api/design-partner'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formState),
      });

      const payload = (await response.json()) as SuccessPayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || '提交失败，请稍后再试。');
      }

      setSuccessMessage('已收到。下一步建议先预约 15 分钟诊断通话；如果你已经确定，也可以直接支付 Pro 先开跑。');
      setSuccessPayload(payload);
      setFormState(initialState);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : '提交失败，请稍后再试。');
    } finally {
      setSubmitting(false);
    }
  };

  const bookingUrl = successPayload.bookingUrl || fallbackBookingUrl;
  const paymentUrl = successPayload.paymentUrl || fallbackPaymentUrl;
  const proofUrl = successPayload.proofUrl || '/compare';

  return (
    <div
      className={`rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)] ${
        isPage ? 'w-full max-w-2xl' : ''
      }`}
    >
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Design Partner Intake</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">申请 LeadPulse 14 天设计伙伴</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          这不是泛泛报名表，而是 founder 用来判断你现在该先跑 Free、直接上 Pro，还是应该先把漏斗和支付准备度补齐。
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>姓名</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </label>
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>公司 / 项目</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.company}
              onChange={(event) => updateField('company', event.target.value)}
              required
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>网站</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.website}
              onChange={(event) => updateField('website', event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>行业</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.segment}
              onChange={(event) => updateField('segment', event.target.value)}
            >
              <option value="study_abroad_agency">留学机构</option>
              <option value="immigration_consulting">移民咨询</option>
              <option value="job_search_service">求职服务</option>
              <option value="b2b_consulting">B2B 咨询</option>
              <option value="premium_training">高客单培训</option>
              <option value="ai_agency">AI Agency</option>
              <option value="micro_saas_founder">AI Builder Founder</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>当前月收入区间</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.monthlyRevenue}
              onChange={(event) => updateField('monthlyRevenue', event.target.value)}
              required
            >
              <option value="">请选择</option>
              <option value="0-3w">0 - 3 万</option>
              <option value="3w-10w">3 - 10 万</option>
              <option value="10w-30w">10 - 30 万</option>
              <option value="30w+">30 万以上</option>
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm text-slate-700">
          <span>现在最大的获客瓶颈</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
            value={formState.bottleneck}
            onChange={(event) => updateField('bottleneck', event.target.value)}
            placeholder="例如：线索主要靠转介绍；销售依赖创始人；内容有流量但没有预约。"
            required
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>{successMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
              >
                预约诊断通话
              </a>
              {paymentUrl ? (
                <a
                  className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  直接支付 Pro
                </a>
              ) : null}
              <a
                className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
              >
                看产品详情
              </a>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '提交中...' : '申请设计伙伴'}
        </button>

        <p className="text-xs leading-6 text-slate-500">
          提交即表示你理解 LeadPulse 会基于你提交的信息进行跟进与服务判断。详情可查看
          <Link href="/privacy" className="mx-1 underline underline-offset-4 hover:text-slate-900">
            隐私说明
          </Link>
          和
          <Link href="/terms" className="ml-1 underline underline-offset-4 hover:text-slate-900">
            服务条款
          </Link>
          。
        </p>
      </form>
    </div>
  );
}
