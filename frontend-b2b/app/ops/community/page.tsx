import { CommunityClosedLoopLab } from '../../../components/community-closed-loop-lab';
import { SiteHeader } from '../../../components/site-header';

export const dynamic = 'force-dynamic';

export default function CommunityOpsPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref="/ops" ctaLabel="返回经营看板" />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-4xl fade-up">
          <div className="apple-pill breathing-pill px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
            Community Closed Loop
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            先把“观察—判断—反馈—动作”打通
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            这页不做大而全平台，只验证最值钱的闭环：什么输入会被当成高价值线索、系统为什么这样判断、以及判断怎样回流到动作。
          </p>
        </div>

        <div className="mt-10">
          <CommunityClosedLoopLab />
        </div>
      </section>
    </main>
  );
}
