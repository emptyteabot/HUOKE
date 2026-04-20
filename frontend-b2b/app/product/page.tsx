import type { Metadata } from 'next';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品介绍',
  description: 'LeadPulse 帮你从公开平台里先找到正在找方案的人，再决定自己做还是交给我们代跑。',
};

const sections = [
  {
    title: '我们帮你做什么',
    rows: [
      '先从公开平台里找出已经在问价格、推荐、怎么选的人。',
      '尽量筛掉明显的同行、机构号和噪声样本。',
      '把结果整理成你能继续联系的名单。',
    ],
  },
  {
    title: '更适合哪些人',
    rows: [
      '自己在做服务，想找更直接的客户来源。',
      '预算有限，不想一上来就买很多工具。',
      '愿意先看样本，再决定要不要继续。',
    ],
  },
  {
    title: '不太适合哪些情况',
    rows: [
      '只想看品牌提及量和舆情走势的人。',
      '已经有成熟销售团队，只缺一个小插件的人。',
      '期待完全自动化神话的人。',
    ],
  },
];

export default function ProductPage() {
  return (
    <MarketingPageShell
      eyebrow="产品介绍"
      title="先把值得联系的人找出来，再谈后面的事"
      description="LeadPulse 不是拿来讲概念的。它更像一个轻量入口，先帮你看到一批更值得联系的人，再决定自己做还是交给我们代跑。"
      typeLine="先看样本，觉得对，再继续。"
      primaryCta={{ href: '/register?plan=free', label: '免费拿样本' }}
      secondaryCta={{ href: '/pricing', label: '看收费方式' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {sections.map((section) => (
            <section
              key={section.title}
              className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
              <div className="mt-5 space-y-3">
                {section.rows.map((row) => (
                  <div key={row} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                    {row}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
