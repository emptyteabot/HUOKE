'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';

import { withBasePath } from '../lib/base-path';

type Props = {
  taskIds: string[];
};

export function BulkTaskCompleteButton({ taskIds }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    if (!taskIds.length) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(withBasePath('/api/tasks/complete-batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || '批量完成失败，请稍后再试。');
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '批量完成失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={loading || taskIds.length === 0}
        onClick={handleComplete}
        className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CheckCheck className="mr-2 h-4 w-4" />
        {loading ? '处理中...' : `批量完成 ${taskIds.length} 条`}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
