'use client';

import { useMemo, useState } from 'react';
import { CreditCard, LineChart, MessagesSquare, Search, ShieldCheck } from 'lucide-react';

type DemoTabId = 'discover' | 'convert' | 'operate';

type DemoTab = {
  id: DemoTabId;
  label: string;
  title: string;
  summary: string;
  points: string[];
  panelTitle: string;
  panelLines: string[];
};

const demoTabs: DemoTab[] = [
  {
    id: 'discover',
    label: '发现',
    title: '先收拢高意向信号',
    summary: '不是把所有流量都看成一样的线索，而是先找到更接近成交的人。',
    points: ['高意向关键词', '公开需求信号', '更窄但更值钱的目标账户'],
    panelTitle: '发现层',
    panelLines: ['识别真实需求', '缩小目标范围', '把高价值线索放到前面'],
  },
  {
    id: 'convert',
    label: '转化',
    title: '再把预约和付款接起来',
    summary: '演示、预约、付款不是三张独立页面，而是一条更顺的成交路径。',
    points: ['公开演示承接理解', '预约页承接沟通', '付款页承接开通'],
    panelTitle: '转化层',
    panelLines: ['客户看懂产品', '客户留下信息', '客户进入开通动作'],
  },
  {
    id: 'operate',
    label: '经营',
    title: '最后把动作沉淀下来',
    summary: '不是做完一次就结束，而是把有效动作留在系统里继续复用。',
    points: ['消息跟进', 'Guardrails', '经营复盘'],
    panelTitle: '经营层',
    panelLines: ['记录动作结果', '保留确定性边界', '继续复用有效路径'],
  },
];

const tabIcons = {
  discover: Search,
  convert: CreditCard,
  operate: ShieldCheck,
};

export function PublicDemoShowcase() {
  const [activeTab, setActiveTab] = useState<DemoTabId>('discover');

  const current = useMemo(
    () => demoTabs.find((tab) => tab.id === activeTab) || demoTabs[0],
    [activeTab],
  );

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:p-8">
        <div className="max-w-3xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-500">公开演示</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.7rem]">
            一页里看懂这套产品怎么工作
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">点击下面三个层级，直接切换产品逻辑，不看长说明。</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {demoTabs.map((tab) => {
            const Icon = tabIcons[tab.id];
            const active = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`interactive-button inline-flex items-center rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  active
                    ? 'border-black/10 bg-[#eef1f5] text-slate-950 shadow-sm'
                    : 'border-black/10 bg-white text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="space-y-4">
            <div className="interactive-panel rounded-[2rem] border border-black/5 bg-[#f8f8f4] p-6">
              <h3 className="text-3xl font-semibold tracking-tight text-slate-950">{current.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{current.summary}</p>
            </div>

            <div className="space-y-3">
              {current.points.map((point) => (
                <div
                  key={point}
                  className="interactive-panel rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="interactive-panel rounded-[2rem] border border-black/5 bg-[#f8f8f4] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">LeadPulse Console</div>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">{current.panelTitle}</h3>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3">
                {activeTab === 'discover' ? (
                  <Search className="h-5 w-5 text-slate-800" />
                ) : activeTab === 'convert' ? (
                  <MessagesSquare className="h-5 w-5 text-slate-800" />
                ) : (
                  <LineChart className="h-5 w-5 text-slate-800" />
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {current.panelLines.map((line, index) => (
                <div
                  key={line}
                  className="interactive-panel rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Step {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="mt-2 leading-7">{line}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              目标不是让页面看起来复杂，而是让客户更快做出下一步动作。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
