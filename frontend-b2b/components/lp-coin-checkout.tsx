'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { getOrCreateClientUserId } from '@/lib/client_user';
import type { CreditPackage, CreditPackageId } from '@/lib/pricing';

type Props = {
  packages: CreditPackage[];
  defaultPackageId: CreditPackageId;
};

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

  async function startCheckout() {
    if (!selected) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          package_id: selected.packageId,
          user_id: userId,
          email: contactEmail,
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
      setError(checkoutError instanceof Error ? checkoutError.message : 'checkout_failed');
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
                  <div className="text-3xl font-extrabold text-slate-950">￥{item.priceCny}</div>
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
            <div className="mt-2 text-2xl font-extrabold text-slate-950">￥{selected?.priceCny}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">到账积分</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-950">{selected?.credits}</div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">接收通知邮箱</span>
            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="name@company.com"
              className="lead-input mt-2"
            />
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
          disabled={loading}
          className="lead-button lead-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? '正在创建收银台订单' : selected?.ctaLabel}
        </button>

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-extrabold text-slate-950">异常备用扫码</div>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            正常情况下点击上方按钮生成虎皮椒收银台，到账后自动发放 LP Coin。只有自动收银台临时不可用时，才使用这里的备用二维码。
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
            <Image
              src="/payment-qrcode.jpg"
              alt="LeadPulse 备用收款二维码"
              width={220}
              height={220}
              className="mx-auto aspect-square w-full max-w-[220px] object-contain"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
          {['到账以服务端异步通知为准', '浏览器跳转成功不作为发货凭证', '余额不足时系统会停止提取，避免欠账'].map((item) => (
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
