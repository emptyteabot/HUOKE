import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, MessageCircle, ScanLine } from 'lucide-react';

import { CopyTextButton } from '../../components/copy-text-button';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

const wechatId = 'chen13398500812';

const sampleScopes = ['雅思机构找学生', '留学中介找申请咨询', '跨境/出海 B2B 找买家', 'AI 初创和独立开发者找早期用户'];

export default function BookPage() {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/book" ctaLabel="联系方式" />

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_420px]">
          <div className="lead-fade-up max-w-3xl">
            <p className="lead-pill">联系方式</p>
            <h1 className="mt-5 text-[2.7rem] font-extrabold leading-[1.05] tracking-tight text-slate-950 md:text-[4.2rem]">
              加微信，
              <br />
              直接看真实线索样本。
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              不用排队，不用填长表单。你发一句自己卖什么、想找哪类客户，我先给你看能不能跑出高意向样本。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {sampleScopes.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <CopyTextButton value={wechatId} label="复制微信号" />
              <Link href="/pricing" className="lead-button lead-button-secondary text-sm">
                看方案价格
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="lead-glass rounded-[24px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-500">微信号</div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-950">{wechatId}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <ScanLine className="h-4 w-4 text-slate-500" />
                扫码或复制微信号
              </div>
              <Image
                src="/wechat-contact-chen13398500812.png"
                alt="微信号 chen13398500812 二维码"
                width={224}
                height={224}
                className="mx-auto mt-4 h-56 w-56 rounded-lg border border-slate-100 bg-white p-2"
              />
              <p className="mt-3 text-center text-xs leading-6 text-slate-500">二维码内容是微信号，微信里搜索同样可以添加。</p>
            </div>

            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              建议开场直接发：你的行业 + 想找的客户 + 目前最大获客痛点。我会先按小红书、抖音、推特、Reddit 判断样本质量。
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
