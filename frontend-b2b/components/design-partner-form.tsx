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
  segment: 'b2b_service',
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

      setSuccessMessage('已收到。下一步建议先预约 15 分钟诊断；如果你已经确定，也可以直接充值 LP Coin 开始试跑。');
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
  const proofUrl = successPayload.proofUrl || '/product';

  return (
    <div className={`lead-card p-6 ${isPage ? 'w-full max-w-2xl' : ''}`}>
      <div className="mb-6">
        <p className="lead-pill">免费体验</p>
        <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">先看一批与你业务相关的线索样本</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          这不是泛报名表。告诉我们你卖什么、想找谁，LeadPulse 会根据你的业务方向整理一批可追溯的公开讨论线索。
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>姓名</span>
            <input className="lead-input" value={formState.name} onChange={(event) => updateField('name', event.target.value)} required />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>邮箱</span>
            <input
              type="email"
              className="lead-input"
              value={formState.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>公司 / 项目</span>
            <input className="lead-input" value={formState.company} onChange={(event) => updateField('company', event.target.value)} required />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>网站</span>
            <input
              className="lead-input"
              value={formState.website}
              onChange={(event) => updateField('website', event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>行业</span>
            <select className="lead-input" value={formState.segment} onChange={(event) => updateField('segment', event.target.value)}>
              <option value="b2b_service">B2B 服务</option>
              <option value="local_agency">本地生活 / 代运营</option>
              <option value="education_service">教育 / 咨询</option>
              <option value="ai_agency">AI Agency</option>
              <option value="saas">SaaS / 软件</option>
              <option value="outsourcing">外包获客团队</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>当前月收入区间</span>
            <select
              className="lead-input"
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

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>现在最大的获客瓶颈</span>
          <textarea
            className="lead-input lead-textarea"
            value={formState.bottleneck}
            onChange={(event) => updateField('bottleneck', event.target.value)}
            placeholder="例如：线索主要靠转介绍；销售每天被垃圾链接淹没；内容有流量但没有预约。"
            required
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>{successMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a className="rounded-full border border-black/10 bg-white px-4 py-2 font-bold text-slate-900" href={bookingUrl}>
                预约诊断电话
              </a>
              {paymentUrl ? (
                <a className="rounded-full border border-black/10 bg-white px-4 py-2 font-bold text-slate-900" href={paymentUrl}>
                  直接充值
                </a>
              ) : null}
              <a className="rounded-full border border-black/10 bg-white px-4 py-2 font-bold text-slate-900" href={proofUrl}>
                看工作流
              </a>
            </div>
          </div>
        ) : null}

        <button type="submit" disabled={submitting} className="lead-button lead-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? '提交中...' : '提交并等待样本'}
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
