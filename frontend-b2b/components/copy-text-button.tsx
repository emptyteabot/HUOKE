'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type Props = {
  value: string;
  label?: string;
};

export function CopyTextButton({ value, label = '复制' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-black/15 hover:bg-white hover:text-slate-950"
    >
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? '已复制' : label}
    </button>
  );
}
