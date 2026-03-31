'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';

import { withBasePath } from '../lib/base-path';

type Props = {
  draftId: string;
};

export function CommunicationSentButton({ draftId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(withBasePath('/api/communications/mark-sent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftId }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || '记录失败，请稍后再试。');
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '记录失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="mr-2 h-4 w-4" />
        {loading ? '记录中...' : '标记已发'}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
