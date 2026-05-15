'use client';

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
    <div className="lead-glass rounded-[24px] border border-white/80 p-6 shadow-xl shadow-slate-200/20 md:p-8">
      <h3 className="text-xl font-bold text-slate-950">提交预约请求</h3>
      <p className="mt-2 text-sm font-light leading-7 text-slate-600">
        留一个方便沟通的时间段。我们先判断你的业务是否适合从公开讨论里提取高意向线索。
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>姓名</span>
            <input
              className="lead-input"
              value={formState.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="您的称呼"
              required
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>邮箱 / 微信号</span>
            <input
              type="email"
              className="lead-input"
              value={formState.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="方便联系的方式"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>公司 / 项目名称</span>
            <input
              className="lead-input"
              value={formState.company}
              onChange={(event) => updateField('company', event.target.value)}
              placeholder="您代表的业务"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>希望时间</span>
            <input
              className="lead-input"
              value={formState.preferredTime}
              onChange={(event) => updateField('preferredTime', event.target.value)}
              placeholder="例如：5 月 19 日 20:00 - 22:00"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>时区</span>
            <input
              className="lead-input"
              value={formState.timezone}
              onChange={(event) => updateField('timezone', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>偏好联系渠道</span>
            <select className="lead-input" value={formState.channel} onChange={(event) => updateField('channel', event.target.value)}>
              {channelOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>背景补充（选填）</span>
          <textarea
            className="lead-input lead-textarea"
            value={formState.context}
            onChange={(event) => updateField('context', event.target.value)}
            placeholder="简单说明一下您想解决的问题，让我们的沟通更高效。"
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>{success}</p>
            <p className="mt-2 text-emerald-700/90">如果你已经想先自己试，也可以直接去看充值包和线索池。</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {successPayload.paymentUrl ? (
                <a
                  href={successPayload.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 font-bold text-emerald-700 transition hover:bg-emerald-100/40"
                >
                  查看充值包
                </a>
              ) : null}
              {successPayload.proofUrl ? (
                <a
                  href={successPayload.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 font-bold text-emerald-700 transition hover:bg-emerald-100/40"
                >
                  查看样本说明
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="lead-button lead-button-primary w-full disabled:opacity-60">
          {loading ? '提交中...' : '提交预约请求'}
        </button>

        <p className="text-xs leading-6 text-slate-500">
          提交后会进入预约队列。我们只用这些信息判断是否适合继续，不做无关打扰。
        </p>
      </form>
    </div>
  );
}
