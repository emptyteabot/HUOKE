"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MessageSquareText } from "lucide-react";

type Props = {
  leadKey: string;
  author: string;
  sourceUrl: string;
  message: string;
};

const STORAGE_KEY = "leadpulse_self_outreach_status_v1";

type StatusMap = Record<string, { copied?: string; opened?: string; sent?: string }>;

function readStatus(): StatusMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatusMap) : {};
  } catch {
    return {};
  }
}

function writeStatus(next: StatusMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function redditComposeUrl(author: string, message: string) {
  const cleanAuthor = author.replace(/^\/u\//i, "").trim();
  const params = new URLSearchParams();
  if (cleanAuthor) params.set("to", cleanAuthor);
  params.set("message", message);
  return `https://www.reddit.com/message/compose/?${params.toString()}`;
}

export function SelfOutreachActions({ leadKey, author, sourceUrl, message }: Props) {
  const [status, setStatus] = useState<StatusMap>({});

  useEffect(() => {
    setStatus(readStatus());
  }, []);

  const current = status[leadKey] || {};
  const composeUrl = useMemo(() => redditComposeUrl(author, message), [author, message]);

  const update = (field: keyof StatusMap[string]) => {
    const next = {
      ...status,
      [leadKey]: {
        ...(status[leadKey] || {}),
        [field]: new Date().toISOString(),
      },
    };
    setStatus(next);
    writeStatus(next);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    update("copied");
  };

  const openCompose = () => {
    update("opened");
    window.open(composeUrl, "_blank", "noopener,noreferrer");
  };

  const markSent = () => {
    update("sent");
  };

  return (
    <div className="lp-action-row">
      <button type="button" className="lp-btn lp-btn-secondary" onClick={copy}>
        {current.copied ? <Check size={16} /> : <Copy size={16} />}
        {current.copied ? "已复制" : "复制私信"}
      </button>
      <a className="lp-btn lp-btn-secondary" href={sourceUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={16} />
        打开原帖
      </a>
      <button type="button" className="lp-btn" onClick={openCompose}>
        <MessageSquareText size={16} />
        打开私信窗口
      </button>
      <button type="button" className="lp-btn lp-btn-secondary" onClick={markSent}>
        {current.sent ? <Check size={16} /> : null}
        {current.sent ? "已记录" : "我已手动发送"}
      </button>
    </div>
  );
}
