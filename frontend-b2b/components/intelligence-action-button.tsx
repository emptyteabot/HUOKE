'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { withBasePath } from '../lib/base-path';

type Props = {
  contactKey: string;
  action: 'handoff_to_closer' | 'rerank_catalog' | 'open_micro_prompt';
};

function actionLabel(action: Props['action']) {
  if (action === 'handoff_to_closer') return '执行成交动作';
  if (action === 'rerank_catalog') return '执行推荐重排';
  return '执行补信息动作';
}

export function IntelligenceActionButton({ contactKey, action }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(withBasePath('/api/intelligence/apply-action'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactKey,
          action,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || '执行失败，请稍后再试。');
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '执行失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleApply}
        className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {loading ? '执行中...' : actionLabel(action)}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
