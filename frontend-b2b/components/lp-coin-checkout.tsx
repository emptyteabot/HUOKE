'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { getOrCreateClientUserId } from '@/lib/client_user';
import type { CreditPackage, CreditPackageId } from '@/lib/pricing';

type Props = {
  packages: CreditPackage[];
  defaultPackageId: CreditPackageId;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CheckoutResponse = {
  ok?: boolean;
  checkoutUrl?: string;
  order?: {
    order_id?: string;
    package_name?: string;
    price_cny?: string;
    credits?: number;
  };
  error?: string;
  message?: string;
};

function checkoutErrorMessage(message: string) {
  if (message === 'valid_contact_email_required') return '请先填写有效的接收通知邮箱。';
  if (message === 'free_trial_does_not_require_payment') return '免费体验额度不需要创建付款订单。';
  if (message === 'checkout_failed') return '收银台创建失败，请稍后再试。';
  if (message === 'billing_order_failed') return '订单创建失败，请稍后再试。';
  return message || '收银台创建失败，请稍后再试。';
}

export function LpCoinCheckout({ packages, defaultPackageId }: Props) {
  const [selectedId, setSelectedId] = useState<CreditPackageId>(defaultPackageId);
  const [userId, setUserId] = useState('guest_demo');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUserId(getOrCreateClientUserId());
  }, []);

  const selected = packages.find((item) => item.id === selectedId) || packages[0];
  const normalizedEmail = contactEmail.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(normalizedEmail);
  const canCheckout = Boolean(selected && emailValid && !loading);

  async function startCheckout() {
    if (!selected) return;
    if (!emailValid) {
      setError('请先填写有效的接收通知邮箱。付款订单、到账积分和售后核对都会绑定到这个邮箱。');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          package_id: selected.packageId,
          user_id: userId,
          email: normalizedEmail,
          company: contactCompany,
        }),
      });
      const payload = (await response.json()) as CheckoutResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || 'checkout_failed');
      }
      if (!payload.checkoutUrl) {
        throw new Error('收银台参数还没配置，暂时无法生成付款链接。');
      }
      window.location.assign(payload.checkoutUrl);
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : 'checkout_failed';
      setError(checkoutErrorMessage(message));
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr]">
      <section className="grid gap-4">
        {packages.map((item) => {
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={[
                'lead-card p-5 text-left transition',
                active ? 'border-slate-950 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.1)]' : 'hover:bg-white',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-lg font-extrabold text-slate-950">
                    {item.name}
                    {item.highlight ? (
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-white">推荐</span>
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{item.description}</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-3xl font-extrabold text-slate-950">¥{item.priceCny}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">{item.credits} LP Coin</div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-4 py-3">1 LP Coin = 1 元</div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">高优线索扣 50</div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">噪声线索扣 1</div>
              </div>
            </button>
          );
        })}
      </section>

      <section className="lead-card p-6">
        <div className="text-sm font-bold text-slate-500">当前选择</div>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{selected?.name}</h2>
        <div className="mt-2 text-sm leading-7 text-slate-600">{selected?.bestFor}</div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">应付金额</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-950">¥{selected?.priceCny}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">到账积分</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-950">{selected?.credits}</div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              接收通知邮箱 <span className="text-rose-500">*</span>
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="name@company.com"
              aria-invalid={contactEmail.length > 0 && !emailValid}
              className="lead-input mt-2"
            />
            <span className="mt-2 block text-xs leading-6 text-slate-500">
              必填。充值订单、LP Coin 到账和异常补单都会绑定这个邮箱。
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">公司或项目名</span>
            <input
              value={contactCompany}
              onChange={(event) => setContactCompany(event.target.value)}
              placeholder="用于区分订单，可不填"
              className="lead-input mt-2"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void startCheckout()}
          disabled={!canCheckout}
          className="lead-button lead-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? '正在创建收银台订单' : selected?.ctaLabel}
        </button>

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-extrabold text-slate-950">异常补单规则</div>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            只允许通过上方按钮生成绑定邮箱的收银台订单。备用收款不会直接展示二维码，必须先生成订单号，避免收钱后无法归属。
          </p>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
          {['到账以服务端异步通知为准', '浏览器跳转成功不作为发货凭证', '余额不足时系统会停止提取，避免欠费'].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
