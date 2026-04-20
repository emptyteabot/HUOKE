import Link from 'next/link';
import { BadgeCheck, MessageSquareText, ShieldCheck } from 'lucide-react';

import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';

const fitFor = [
  '留学咨询、服务工作室、代运营、小型服务团队',
  '独立开发者、出海小团队、需要自己找客户的人',
  '不想一开始就买很多工具，只想先看样本的人',
];

const valueRows = [
  {
    title: '先找正在问问题的人',
    detail: '重点不是看热闹，而是先把那些已经在公开讨论里问价格、问推荐、问怎么选的人整理出来。',
  },
  {
    title: '先筛一遍再交给你',
    detail: '我们会尽量先筛掉明显的同行、机构号和噪声样本，不拿一堆没用的内容充数。',
  },
  {
    title: '先看样本再决定',
    detail: '你可以先看样本，如果方向不对，就没必要继续付费。',
  },
];

const startRows = [
  '免费样本：先看一小批真实样本，判断方向对不对。',
  '软件版：适合你自己筛名单、导名单、自己联系。',
  '代跑版：适合你先想拿一轮整理好的结果。',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f5ef] text-slate-900">
      <SiteHeader ctaHref="/book" ctaLabel="免费拿样本" />

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16 lg:px-8">
        <div className="grid gap-10 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="apple-pill inline-flex px-4 py-2 text-[11px] tracking-[0.18em] text-[#86868b]">
              评论区、帖子、公开讨论里的真实找客需求
            </div>
            <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-slate-950 md:text-[4rem] md:leading-[1.02]">
              帮你从公开平台里
              <br />
              找到正在找方案的人。
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              如果有人已经在问“找谁做、多少钱、哪个好、怎么避坑”，这类人通常比普通流量更值得跟进。LeadPulse 做的就是先把这批人整理出来。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                免费看样本
              </Link>
              <Link
                href="/pricing"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
              >
                看收费方式
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
              >
                先聊 15 分钟
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <div className="text-sm font-semibold text-slate-950">这更适合谁</div>
              <div className="mt-4 space-y-3">
                {fitFor.map((item) => (
                  <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="text-sm font-semibold text-slate-950">你会怎么开始</div>
              <div className="mt-4 space-y-3">
                {startRows.map((item) => (
                  <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-3">
          {valueRows.map((item, index) => {
            const Icon = index === 0 ? MessageSquareText : index === 1 ? ShieldCheck : BadgeCheck;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="w-fit rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                  <Icon className="h-5 w-5 text-slate-900" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold text-slate-950">这不是又一个看板工具</div>
            <div className="mt-6 space-y-3">
              {[
                '不是给你更多图表，而是先给你一批更值得联系的人。',
                '不是替你做品牌监控，而是尽量帮你找到更接近成交的问题表达。',
                '不是逼你先买长期方案，而是先让你看一轮样本。',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold text-slate-950">为什么先试一轮更合理</div>
            <div className="mt-6 space-y-3">
              {[
                '如果样本不对，你不用继续买。',
                '如果样本对了，你可以自己跑，也可以交给我们代跑。',
                '先把第一轮做小、做实，比先讲大而全更适合现在的阶段。',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
