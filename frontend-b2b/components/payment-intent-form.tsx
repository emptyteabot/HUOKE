'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { withBasePath } from '../lib/base-path';
import { getPaidPricingPlans, normalizePlanId } from '../lib/pricing';

type Props = {
  defaultPlan: string;
  paymentProvider?: 'wechat' | 'stripe';
};

type SuccessPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  startUrl?: string;
  bookingUrl?: string;
  deliveryUrl?: string;
  proofUrl?: string;
  checkoutUrl?: string;
  redeemUrl?: string;
};

type PaymentState = {
  name: string;
  email: string;
  company: string;
  productUrl: string;
  plan: string;
  amount: string;
  paymentMethod: string;
  notes: string;
};

function amountFromPlan(plan: string) {
  const pricingPlan = getPaidPricingPlans().find((item) => item.id === normalizePlanId(plan));
  return pricingPlan?.price || '';
}

export function PaymentIntentForm({ defaultPlan, paymentProvider = 'wechat' }: Props) {
  const normalizedDefaultPlan = normalizePlanId(defaultPlan) === 'free' ? 'pro' : normalizePlanId(defaultPlan);
  const [formState, setFormState] = useState<PaymentState>({
    name: '',
    email: '',
    company: '',
    productUrl: '',
    plan: normalizedDefaultPlan,
    amount: amountFromPlan(normalizedDefaultPlan),
    paymentMethod: paymentProvider === 'stripe' ? 'Stripe Checkout' : '线下付款 / 启动码',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successLinks, setSuccessLinks] = useState<{
    startUrl?: string;
    bookingUrl?: string;
    deliveryUrl?: string;
    proofUrl?: string;
    redeemUrl?: string;
  }>({});

  const planOptions = useMemo(
    () =>
      getPaidPricingPlans().map((plan) => ({
        value: plan.id,
        label: `${plan.name} / ${plan.price}${plan.period}`,
      })),
    [],
  );

  const updateField = (key: keyof PaymentState, value: string) => {
    setFormState((current) => {
      const nextState = { ...current, [key]: value };
      if (key === 'plan') {
        nextState.amount = amountFromPlan(value);
      }
      return nextState;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setSuccessLinks({});

    try {
      const response = await fetch(withBasePath('/api/payment-intent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formState),
      });
      const payload = (await response.json()) as SuccessPayload;
      if (!response.ok) {
        throw new Error(payload.error || '提交失败，请稍后再试。');
      }
      if (paymentProvider === 'stripe' && payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }
      setSuccess(payload.message || '购买需求已记录。');
      setSuccessLinks({
        startUrl: payload.startUrl,
        bookingUrl: payload.bookingUrl,
        deliveryUrl: payload.deliveryUrl,
        proofUrl: payload.proofUrl,
        redeemUrl: payload.redeemUrl,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  const effectiveBookingUrl = successLinks.bookingUrl || '/book';
  const effectiveRedeemUrl = successLinks.redeemUrl || '/redeem';

  return (
    <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div>
        <p className="font-mono text-[11px] tracking-[0.28em] text-slate-500">
          {paymentProvider === 'stripe' ? '支付信息确认' : '启动码购买登记'}
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {paymentProvider === 'stripe' ? '方案开通确认' : '登记购买并领取启动码'}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {paymentProvider === 'stripe'
            ? '填好信息后会直接跳转到 Stripe 托管支付。支付成功后，系统会自动开通方案并生成启动交付包。'
            : '这一步只负责记录购买需求。你付款后会收到启动码，拿到码再去兑换页开通。'}
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
            />
          </label>
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
          <label className="space-y-2 text-sm text-slate-700">
            <span>方案</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.plan}
              onChange={(event) => updateField('plan', event.target.value)}
            >
              {planOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>首笔金额</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.amount}
              readOnly
              required
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>开通方式</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.paymentMethod}
              readOnly
            />
          </label>
        </div>

        <label className="space-y-2 text-sm text-slate-700">
          <span>备注</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
            value={formState.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="例如：需要发票 / 需要更快发码 / 先开 Pro 再考虑升级"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>{success}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {successLinks.deliveryUrl ? (
                <Link
                  href={successLinks.deliveryUrl}
                  className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100/40"
                >
                  看交付包
                </Link>
              ) : null}
              {successLinks.startUrl ? (
                <Link
                  href={successLinks.startUrl}
                  className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100/40"
                >
                  去启动页
                </Link>
              ) : null}
              <Link
                href={effectiveRedeemUrl}
                className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100/40"
              >
                去兑换启动码
              </Link>
              <Link
                href={effectiveBookingUrl}
                className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100/40"
              >
                预约 onboarding
              </Link>
              {successLinks.proofUrl ? (
                <Link
                  href={successLinks.proofUrl}
                  className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100/40"
                >
                  查看方案说明
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="interactive-button inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? paymentProvider === 'stripe'
              ? '正在跳转支付...'
              : '登记中...'
            : paymentProvider === 'stripe'
              ? '前往安全支付'
              : '登记购买并等待发码'}
        </button>

        <p className="text-xs leading-6 text-slate-500">
          提交即表示你理解 Pro / Max 为月度方案。当前页面默认按“付款后发启动码，再凭码开通”处理；如果你需要自动支付，请先确认 Stripe 已经真实接好。
        </p>
      </form>
    </div>
  );
}
