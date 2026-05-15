'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Filter,
  Globe2,
  Menu,
  MessageSquareText,
  Play,
  Radio,
  ShieldCheck,
  Target,
  X,
  Zap,
} from 'lucide-react';

const navItems = [
  { href: '#workflow', label: '工作流' },
  { href: '#mcp', label: 'MCP 入口' },
  { href: '/pricing', label: '定价' },
];

const quietSignals = [
  {
    source: 'Reddit / SaaS',
    text: 'Anyone used a lightweight CRM for a 6-person agency? We are still comparing options.',
    score: 42,
    status: '观察',
  },
  {
    source: '技术社区',
    text: '我们想把线索从飞书表格迁到 CRM，但现在预算和采购时间还没定。',
    score: 58,
    status: '培育',
  },
];

const signalTags = ['明确预算', 'Q3 采购', '团队扩张', '私有部署'];

const pipelineSteps = [
  {
    icon: MessageSquareText,
    title: '动态访谈',
    detail: 'AI 根据回答继续追问预算、采购窗口、决策人和业务约束，不再走固定树状表单。',
  },
  {
    icon: ShieldCheck,
    title: '严格评分',
    detail: 'Pydantic 模式锁住输出结构，预算判定、fit 分数和 recommendedService 必须完整返回。',
  },
  {
    icon: CalendarDays,
    title: '获取空闲',
    detail: '线索达标后才调用 availability，把可约时间交给 Agent 或前端继续确认。',
  },
  {
    icon: BellRing,
    title: '锁定电话',
    detail: 'booking 提交后直接生成高净值 Discovery Call，把意图转成日历上的确定动作。',
  },
];

const capabilityCards = [
  {
    icon: Globe2,
    title: '外部 Agent 可发现',
    detail: '/.well-known/mcp.json 暴露 LeadPulse 的 M2M 能力，让 Agent 能主动把合格需求路由进来。',
  },
  {
    icon: Target,
    title: '只看高意向线索',
    detail: '系统只处理预算、时间和服务匹配度达标的对话，把低意图、模板和泛行业噪声挡在外面。',
  },
  {
    icon: Database,
    title: '单一成交闭环',
    detail: '动态对话测预算 -> 评分达标 -> 查日历 -> 预约发现电话，首页和产品都围绕这条管线。',
  },
];

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveCount, setLiveCount] = useState(1284);
  const [incomingVisible, setIncomingVisible] = useState(false);

  useEffect(() => {
    const countTimer = window.setInterval(() => {
      setLiveCount((current) => current + 1 + Math.floor(Math.random() * 3));
    }, 3200);

    const signalTimer = window.setTimeout(() => {
      setIncomingVisible(true);
    }, 900);

    return () => {
      window.clearInterval(countTimer);
      window.clearTimeout(signalTimer);
    };
  }, []);

  return (
    <main className="lp-home relative min-h-screen overflow-hidden bg-[#fbfbf8] text-slate-950">
      <style>{`
        .lp-home {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        }

        .lp-home-grid {
          background-image:
            linear-gradient(to right, rgba(15, 23, 42, 0.045) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.045) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: linear-gradient(to bottom, black 0%, black 56%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 56%, transparent 100%);
        }

        .lp-home-sheen {
          background:
            linear-gradient(120deg, rgba(20, 184, 166, 0.12), transparent 32%),
            linear-gradient(245deg, rgba(37, 99, 235, 0.11), transparent 38%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(251, 251, 248, 0.9));
        }

        .lp-glass {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(226, 232, 240, 0.82);
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.04),
            0 24px 70px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
        }

        .lp-fade-up {
          animation: lpFadeUp 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .lp-fade-up-delay {
          animation: lpFadeUp 860ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;
        }

        .lp-slide-in {
          animation: lpSlideIn 680ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .lp-highlight {
          animation: lpHighlight 2600ms ease-out both;
        }

        .lp-soft-pulse {
          animation: lpSoftPulse 2.8s ease-in-out infinite;
        }

        @keyframes lpFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes lpSlideIn {
          from {
            opacity: 0;
            transform: translateX(18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes lpHighlight {
          0% {
            box-shadow:
              0 0 0 0 rgba(37, 99, 235, 0.24),
              0 18px 45px rgba(15, 23, 42, 0.07);
          }
          42% {
            box-shadow:
              0 0 0 7px rgba(37, 99, 235, 0.08),
              0 18px 45px rgba(15, 23, 42, 0.07);
          }
          100% {
            box-shadow:
              0 0 0 0 rgba(37, 99, 235, 0),
              0 18px 45px rgba(15, 23, 42, 0.07);
          }
        }

        @keyframes lpSoftPulse {
          0%, 100% {
            opacity: 0.72;
          }
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-fade-up,
          .lp-fade-up-delay,
          .lp-slide-in,
          .lp-highlight,
          .lp-soft-pulse {
            animation: none;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 lp-home-sheen" />
      <div className="pointer-events-none absolute inset-0 lp-home-grid" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/72 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-base font-semibold leading-none text-slate-950">LeadPulse</span>
              <span className="mt-1 text-xs leading-none text-slate-500">M2M acquisition gateway</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              登录
            </Link>
            <Link
              href="/book"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              锁定发现电话
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 md:hidden"
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/book"
                className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                锁定发现电话
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-28 text-center sm:px-6 lg:px-8 lg:pb-24 lg:pt-32">
        <div className="lp-fade-up max-w-5xl">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 lp-soft-pulse" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            MCP 入口在线 · 18 个工具已暴露 · {liveCount.toLocaleString('zh-CN')} 次意图扫描
          </div>

          <h1 className="mt-7 text-5xl font-semibold leading-[1.08] text-slate-950 sm:text-6xl lg:text-7xl">
            把外部 AI Agent 的购买意图，直接结算成你的发现电话。
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
            LeadPulse 不再做泛行业表单。它只保留一条垂直管线：动态访谈测预算，评分达标后查询日历，并自动提交高净值 Discovery Call。
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/book"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-base font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
            >
              接入发现电话管线
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#workflow"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/78 px-6 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-white sm:w-auto"
            >
              <Play className="h-4 w-4" />
              查看工作流
            </Link>
          </div>
        </div>

        <div id="mcp" className="lp-fade-up-delay mt-16 w-full max-w-6xl">
          <div className="lp-glass overflow-hidden rounded-lg text-left">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/52 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="h-5 w-px bg-slate-200" />
                <div>
                  <div className="text-sm font-semibold text-slate-950">LeadPulse Agent Intake</div>
                  <div className="mt-0.5 text-xs text-slate-500">/.well-known/mcp.json · /api/v2/tools</div>
                </div>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <Radio className="h-3.5 w-3.5" />
                streamable HTTP ready
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="border-b border-slate-200/80 bg-white/40 p-3 sm:p-5 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">实时意图流</div>
                    <div className="mt-1 text-xs text-slate-500">只展示需要销售动作的信号</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
                    <Zap className="h-3.5 w-3.5 text-cyan-300" />
                    fit threshold 82
                  </div>
                </div>

                <div className="space-y-3">
                  {quietSignals.map((signal) => (
                    <article key={signal.text} className="rounded-lg border border-slate-200 bg-white/66 p-4 opacity-70">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                          <MessageSquareText className="h-3.5 w-3.5" />
                          {signal.source}
                        </div>
                        <span className="font-mono text-xs text-slate-400">score {signal.score} · {signal.status}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-500">{signal.text}</p>
                    </article>
                  ))}

                  {incomingVisible ? (
                    <article className="rounded-lg border border-blue-200 bg-white p-4 lp-highlight lp-slide-in">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          <Globe2 className="h-3.5 w-3.5 text-blue-600" />
                          技术问答社区 · 刚刚
                        </div>
                        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          <Zap className="h-3.5 w-3.5" />
                          极高意向 96
                        </div>
                      </div>

                      <p className="mt-4 text-[15px] leading-7 text-slate-800">
                        “我们团队从 12 人涨到 80 人，CRM 权限和线索分配已经乱了。Q3 要换系统，
                        <span className="rounded bg-blue-50 px-1 font-semibold text-blue-800">预算 20 万以内，最好支持私有部署</span>
                        ，有没有可靠方案可以直接约演示？”
                      </p>

                      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          {signalTags.map((tag) => (
                            <span key={tag} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Link
                          href="/book"
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          <BellRing className="h-3.5 w-3.5" />
                          锁定 Discovery Call
                        </Link>
                      </div>
                    </article>
                  ) : (
                    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/55 text-center text-slate-500">
                      <Activity className="mb-3 h-5 w-5 lp-soft-pulse" />
                      <span className="text-sm font-medium">正在等待高意向信号进入队列</span>
                    </div>
                  )}
                </div>
              </div>

              <aside className="bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Deterministic fit result</div>
                    <div className="mt-1 text-xs text-slate-400">Pydantic schema validated</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    ['tool', 'leadpulse.score_lead'],
                    ['budgetFit', 'true'],
                    ['fitScore', '96'],
                    ['recommendedService', 'Discovery Call'],
                    ['nextAction', 'get_availability'],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="truncate font-mono text-xs text-slate-100">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                    <Clock3 className="h-4 w-4" />
                    next available slot
                  </div>
                  <div className="mt-3 font-mono text-2xl font-semibold text-white">Tue 10:30</div>
                  <div className="mt-1 text-xs text-cyan-100/70">45 min · Asia/Shanghai · discovery-call</div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 border-y border-slate-200/70 bg-white/82 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-700">LeadPulse V2.0 管线</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              把“表单”降级为通信协议，把预约变成唯一终点。
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {pipelineSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-lg border border-slate-200 bg-[#fbfbf8] p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-sm text-slate-400">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {capabilityCards.map((card, index) => {
              const Icon = card.icon;
              const dark = index === 1;
              return (
                <article
                  key={card.title}
                  className={[
                    'rounded-lg border p-6 shadow-sm',
                    dark
                      ? 'border-slate-800 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white/82 text-slate-950',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex h-11 w-11 items-center justify-center rounded-lg border',
                      dark ? 'border-white/10 bg-white/10 text-cyan-200' : 'border-slate-200 bg-[#fbfbf8] text-slate-950',
                    ].join(' ')}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>
                  <p className={['mt-3 text-sm leading-7', dark ? 'text-slate-300' : 'text-slate-600'].join(' ')}>
                    {card.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white/86 p-6 shadow-sm sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-emerald-700">Ready for qualified intent</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">让合格线索自己进入日历。</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              首页、MCP discovery、评分接口和预约接口都围绕同一个动作：过滤掉低价值对话，把预算达标的人送进 Discovery Call。
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              预约接入
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/.well-known/mcp.json"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              查看 MCP JSON
              <Filter className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200/70 bg-white/72 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-white">
              <Activity className="h-3.5 w-3.5" />
            </span>
            LeadPulse
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="transition hover:text-slate-950">
              隐私
            </Link>
            <Link href="/terms" className="transition hover:text-slate-950">
              条款
            </Link>
            <Link href="/api/v2/tools" className="transition hover:text-slate-950">
              Tools
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
