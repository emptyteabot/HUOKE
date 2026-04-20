'use client';

import Link from 'next/link';
import { useState } from 'react';

import { withBasePath } from '../lib/base-path';

type BookingState = {
  name: string;
  email: string;
  company: string;
  preferredTime: string;
  timezone: string;
  channel: string;
  context: string;
};

const initialState: BookingState = {
  name: '',
  email: '',
  company: '',
  preferredTime: '',
  timezone: 'Asia/Shanghai',
  channel: '微信 / 飞书',
  context: '',
};

const channelOptions = ['微信 / 飞书', '邮箱', '平台私信', '电话 / 语音'];

type SuccessPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  paymentUrl?: string;
  proofUrl?: string;
};

export function BookingRequestForm() {
  const [formState, setFormState] = useState<BookingState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successPayload, setSuccessPayload] = useState<SuccessPayload>({});

  const updateField = (key: keyof BookingState, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setSuccessPayload({});

    try {
      const response = await fetch(withBasePath('/api/booking-request'), {
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

      setSuccess(payload.message || '预约请求已提交。');
      setSuccessPayload(payload);
      setFormState(initialState);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <h3 className="text-2xl font-semibold text-slate-950">提交预约请求</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        留一个你方便的时间段。我们会先看你的情况合不合适，不会一上来就硬推方案。
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>姓名</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="创始人 / 负责人"
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
              placeholder="you@company.com"
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
              placeholder="产品名或团队名"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>希望时间</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.preferredTime}
              onChange={(event) => updateField('preferredTime', event.target.value)}
              placeholder="例如：3 月 19 日 20:00 - 22:00"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>时区</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.timezone}
              onChange={(event) => updateField('timezone', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>偏好联系渠道</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
              value={formState.channel}
              onChange={(event) => updateField('channel', event.target.value)}
            >
              {channelOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm text-slate-700">
          <span>背景补充</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-slate-900 outline-none transition focus:border-black/20"
            value={formState.context}
            onChange={(event) => updateField('context', event.target.value)}
            placeholder="简单说一下你是做什么的、最想找到哪类客户、现在最大的难点是什么。"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>{success}</p>
            <p className="mt-2 text-emerald-700/90">
              如果你已经想先自己试，也可以直接去看软件版。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {successPayload.paymentUrl ? (
                <a
                  href={successPayload.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100/40"
                >
                  去看软件版
                </a>
              ) : null}
              {successPayload.proofUrl ? (
                <a
                  href={successPayload.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100/40"
                >
                  看产品详情
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="interactive-button inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb] disabled:opacity-60"
        >
          {loading ? '提交中...' : '提交预约请求'}
        </button>

        <p className="text-xs leading-5 text-slate-500">
          提交后会进入预约队列并触发通知。详情可查看
          <Link href="/privacy" className="mx-1 underline hover:text-slate-900">
            隐私说明
          </Link>
          和
          <Link href="/terms" className="ml-1 underline hover:text-slate-900">
            服务条款
          </Link>
          。
        </p>
      </form>
    </div>
  );
}
