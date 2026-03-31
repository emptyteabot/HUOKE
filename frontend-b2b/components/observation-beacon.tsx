'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import type { ObservationEvent, ObservationEventType } from '../lib/intelligence';

const SESSION_KEY = 'leadpulse_observation_session';
const ignoredPrefixes = ['/dashboard', '/internal-login', '/proof', '/agents', '/cases', '/investors', '/ops'];

function createSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `lp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readSessionId() {
  if (typeof window === 'undefined') return 'server-session';
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = createSessionId();
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

function sendObservationBatch(events: ObservationEvent[]) {
  if (!events.length) return;

  fetch('/api/observations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => undefined);
}

function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim().slice(0, 120);
}

function targetLabel(target: Element | null) {
  if (!target) return '';
  const html = target as HTMLElement;
  return normalizeText(
    html.dataset.observeLabel ||
      html.getAttribute('aria-label') ||
      html.textContent ||
      '',
  );
}

function buildEvent(args: {
  sessionId: string;
  type: ObservationEventType;
  path: string;
  label?: string;
  value?: string;
  numericValue?: number;
  metadata?: ObservationEvent['metadata'];
}): ObservationEvent {
  return {
    sessionId: args.sessionId,
    timestamp: new Date().toISOString(),
    type: args.type,
    path: args.path,
    label: args.label,
    value: args.value,
    numericValue: args.numericValue,
    metadata: args.metadata,
  };
}

export function ObservationBeacon() {
  const pathname = usePathname();
  const sessionIdRef = useRef('');
  const hoverRef = useRef<{ element: Element | null; startedAt: number }>({ element: null, startedAt: 0 });

  const ensureSessionId = () => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = readSessionId();
    }

    return sessionIdRef.current;
  };

  useEffect(() => {
    if (!pathname || ignoredPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    const sessionId = ensureSessionId();
    const path = `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`;
    sendObservationBatch([
      buildEvent({
        sessionId,
        type: 'page_view',
        path,
        label: document.title,
      }),
    ]);
  }, [pathname]);

  useEffect(() => {
    if (!pathname || ignoredPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    const sessionId = ensureSessionId();
    const path = `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`;
    const scrollMarks = new Set<number>();

    const onScroll = () => {
      const body = document.documentElement;
      const scrollable = Math.max(body.scrollHeight - window.innerHeight, 1);
      const depth = Math.round((window.scrollY / scrollable) * 100);
      [25, 50, 75, 90].forEach((mark) => {
        if (depth >= mark && !scrollMarks.has(mark)) {
          scrollMarks.add(mark);
          sendObservationBatch([
            buildEvent({
              sessionId,
              type: 'scroll_depth',
              path,
              numericValue: mark,
            }),
          ]);
        }
      });
    };

    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest('a,button,[data-observe-label]');
      if (!target) return;
      const label = targetLabel(target);
      const href = target instanceof HTMLAnchorElement ? target.href : undefined;
      sendObservationBatch([
        buildEvent({
          sessionId,
          type: 'click',
          path,
          label,
          value: href,
        }),
      ]);
    };

    const onMouseOver = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest('a,button,[data-observe-label]');
      if (!target) return;
      hoverRef.current = { element: target, startedAt: Date.now() };
    };

    const onMouseOut = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest('a,button,[data-observe-label]');
      if (!target || hoverRef.current.element !== target) return;
      const dwell = Date.now() - hoverRef.current.startedAt;
      hoverRef.current = { element: null, startedAt: 0 };
      if (dwell < 700) return;
      sendObservationBatch([
        buildEvent({
          sessionId,
          type: 'hover_dwell',
          path,
          label: targetLabel(target),
          numericValue: dwell,
        }),
      ]);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('mouseout', onMouseOut, true);
    };
  }, [pathname]);

  return null;
}
