'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { OpsSeriesPoint } from '../lib/ops';

type Props = {
  series: OpsSeriesPoint[];
};

function labelFromDate(value: string) {
  return value.slice(5);
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.98)',
  border: '1px solid rgba(15,23,42,0.08)',
  borderRadius: 24,
  boxShadow: '0 16px 40px rgba(15,23,42,0.08)',
};

export function RevenueDashboard({ series }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Lead Flow</div>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">新增线索</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">由设计伙伴申请、预约请求和付款意向汇总而成。</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="newLeadFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0071e3" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0071e3" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={labelFromDate} stroke="#86868b" tickLine={false} axisLine={false} />
              <YAxis stroke="#86868b" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `日期：${label}`} />
              <Area type="monotone" dataKey="newLeads" stroke="#0071e3" fill="url(#newLeadFill)" strokeWidth={2.5} name="新增" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Operating Metrics</div>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">回本 / 留存 / 退款</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">先看经营结果，再看功能有没有意义。</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={labelFromDate} stroke="#86868b" tickLine={false} axisLine={false} />
              <YAxis stroke="#86868b" tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [`${value}%`, name]}
                labelFormatter={(label) => `日期：${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="paybackRate" stroke="#0071e3" strokeWidth={2.2} name="回本" />
              <Line type="monotone" dataKey="retentionRate" stroke="#34a853" strokeWidth={2.2} name="留存" />
              <Line type="monotone" dataKey="refundRate" stroke="#d93025" strokeWidth={2.2} name="退款" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
