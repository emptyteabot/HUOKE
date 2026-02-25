#!/usr/bin/env python3
"""
OpenClaw-first lead acquisition for study-abroad vertical.

Hybrid strategy:
- Script layer: keyword scheduling, scoring, dedup, storage
- OpenClaw layer: human-like browsing of posts/comments
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import random
import re
import shutil
import sqlite3
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.parse import quote, urljoin

ANSI_RE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")

DEFAULT_KEYWORDS = [
    "留学中介推荐",
    "英国留学申请",
    "美国研究生申请",
    "留学文书求助",
    "留学预算费用",
]

STUDY_HINTS = (
    "留学",
    "申请",
    "文书",
    "选校",
    "中介",
    "机构",
    "英港",
    "英国",
    "香港",
    "美国",
    "澳洲",
    "加拿大",
    "新加坡",
    "德国",
    "专业",
    "背景",
    "签证",
    "雅思",
    "托福",
    "硕士",
    "本科",
    "offer",
)

INTENT_HINTS = (
    "求推荐",
    "求助",
    "请问",
    "有没有",
    "怎么",
    "怎么办",
    "预算",
    "费用",
    "避坑",
    "避雷",
    "推荐",
    "蹲",
    "求老师",
    "找机构",
    "想去",
    "打算",
)

BUYER_HINTS = (
    "求推荐",
    "求助",
    "请问",
    "有没有",
    "怎么选",
    "怎么办",
    "预算",
    "费用",
    "来不及",
    "急",
    "被拒",
    "转学",
    "申诉",
)

AGENCY_HINTS = (
    "机构",
    "官方",
    "顾问",
    "咨询",
    "工作室",
    "团队",
    "教育",
    "老师",
    "学长",
    "学姐",
    "留学服务",
    "留学中介",
    "新东方",
    "新航道",
    "启德",
    "金吉列",
    "立思辰",
    "idp",
    "领藤",
    "优越",
    "新通",
    "啄高",
)

SOCIAL_PLATFORMS = {
    "xhs": lambda kw: f"https://www.xiaohongshu.com/search_result?keyword={quote(kw)}",
    "weibo": lambda kw: f"https://s.weibo.com/weibo?q={quote(kw)}",
    "zhihu": lambda kw: f"https://www.zhihu.com/search?type=content&q={quote(kw)}",
    "douyin": lambda kw: f"https://www.douyin.com/search/{quote(kw)}?type=general",
    "bilibili": lambda kw: f"https://search.bilibili.com/all?keyword={quote(kw)}",
    "tieba": lambda kw: f"https://tieba.baidu.com/f/search/res?ie=utf-8&qw={quote(kw)}",
}

XHS_SORT_ALIASES = {
    "latest": ("最新",),
    "hot": ("最热",),
}


@dataclass
class Lead:
    platform: str
    keyword: str
    post_url: str
    source_url: str
    author: str
    author_url: str
    content: str
    score: int
    grade: str
    confidence: int
    collected_at: str
    access_hint: str


def now_ts() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def now_iso() -> str:
    return datetime.now().isoformat()


def strip_ansi(text: str) -> str:
    return ANSI_RE.sub("", text or "")


def extract_json_payload(output: str):
    clean = strip_ansi(output)
    decoder = json.JSONDecoder()
    for i, ch in enumerate(clean):
        if ch not in "[{":
            continue
        try:
            obj, _ = decoder.raw_decode(clean[i:])
            return obj
        except json.JSONDecodeError:
            continue
    raise ValueError(f"No JSON payload in output: {clean[:600]}")


class OpenClawBrowser:
    def __init__(self, browser_profile: str = "openclaw", config_path: Optional[str] = None) -> None:
        self.browser_profile = browser_profile
        self.config_path = config_path or str(Path.home() / ".openclaw" / "openclaw.json")
        self.openclaw_bin = self._resolve_openclaw_bin()
        self.openclaw_cmd = self._resolve_openclaw_cmd()
        self.trace = str(os.getenv("OPENCLAW_TRACE", "1")).strip().lower() not in {"0", "false", "off", "no"}
        if self.trace:
            print(
                "[OPENCLAW] engine=browser profile="
                + f"{self.browser_profile} bin={self.openclaw_bin} cfg={self.config_path}"
            )

    def _resolve_openclaw_bin(self) -> str:
        env_bin = normalize_space(os.getenv("OPENCLAW_BIN", ""))
        if env_bin and Path(env_bin).exists():
            return env_bin

        which_bin = shutil.which("openclaw") or shutil.which("openclaw.cmd")
        if which_bin:
            return which_bin

        appdata = os.getenv("APPDATA", "")
        if appdata:
            for name in ("openclaw.cmd", "openclaw"):
                candidate = Path(appdata) / "npm" / name
                if candidate.exists():
                    return str(candidate)

        raise FileNotFoundError("openclaw executable not found; set OPENCLAW_BIN")

    def _resolve_openclaw_cmd(self) -> List[str]:
        bin_path = normalize_space(self.openclaw_bin)
        lower = bin_path.lower()
        if lower.endswith('.cmd') or lower.endswith('.bat'):
            npm_dir = Path(bin_path).resolve().parent
            pkg_dir = npm_dir / 'node_modules' / 'openclaw'
            entry_candidates = [
                pkg_dir / 'openclaw.mjs',
                pkg_dir / 'bin' / 'openclaw.js',
            ]

            node_bin = shutil.which('node')
            if not node_bin:
                pf = os.getenv('ProgramFiles', '')
                if pf:
                    cand = Path(pf) / 'nodejs' / 'node.exe'
                    if cand.exists():
                        node_bin = str(cand)

            if node_bin:
                for js_entry in entry_candidates:
                    if js_entry.exists():
                        return [node_bin, str(js_entry)]
        return [self.openclaw_bin]

    def _restart_gateway(self) -> None:
        cmd = [*self.openclaw_cmd, "--no-color", "--log-level", "error", "gateway", "start"]
        env = os.environ.copy()
        env["OPENCLAW_CONFIG_PATH"] = self.config_path
        try:
            subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore",
                timeout=45,
                env=env,
            )
        except Exception:
            pass

    def _run(
        self,
        args: List[str],
        expect_json: bool = False,
        timeout: int = 45,
        retries: int = 2,
        op_name: Optional[str] = None,
    ):
        cmd = [
            *self.openclaw_cmd,
            "--no-color",
            "--log-level",
            "error",
            "browser",
            "--browser-profile",
            self.browser_profile,
        ]
        if expect_json:
            cmd.append("--json")
        cmd.extend(args)

        env = os.environ.copy()
        env["OPENCLAW_CONFIG_PATH"] = self.config_path
        op = op_name or (args[0] if args else "unknown")
        if self.trace:
            print(f"[OPENCLAW-STEP] {op}")

        last_err = None
        for _ in range(max(1, retries)):
            try:
                proc = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="ignore",
                    timeout=timeout,
                    env=env,
                )
            except subprocess.TimeoutExpired as exc:
                out = ((exc.stdout or "") + "\n" + (exc.stderr or "")).strip()
                last_err = RuntimeError(f"OpenClaw [{op}] timeout after {timeout}s: {out[:600]}")
                continue

            out = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
            out_low = out.lower()
            if ("gateway closed" in out_low) or ("error: gateway" in out_low):
                self._restart_gateway()
                last_err = RuntimeError(f"OpenClaw [{op}] gateway unavailable; restarted gateway and retrying")
                continue

            payload = None
            if expect_json:
                try:
                    payload = extract_json_payload(out)
                except Exception:
                    payload = None

            if expect_json:
                if payload is not None:
                    return payload
                last_err = RuntimeError(f"OpenClaw [{op}] returned no JSON payload ({proc.returncode}):\n{out[:1200]}")
                continue

            if proc.returncode == 0:
                return out
            if any(tok in out.lower() for tok in ("wait complete", "closed tab")):
                return out

            last_err = RuntimeError(f"OpenClaw [{op}] failed ({proc.returncode}):\n{out[:1200]}")

        if last_err:
            raise last_err
        raise RuntimeError("OpenClaw command failed without details")

    def start(self) -> Dict:
        return self._run(["start"], expect_json=True, timeout=80, retries=3, op_name="start")

    def open(self, url: str) -> Dict:
        return self._run(["open", url], expect_json=True, timeout=90, retries=3, op_name="open")

    def close(self, target_id: str) -> None:
        try:
            self._run(["close", target_id], expect_json=False, timeout=45, retries=2, op_name="close")
        except Exception:
            pass

    def wait_load(self, target_id: str, timeout_ms: int = 30000) -> None:
        self._run(
            ["wait", "--target-id", target_id, "--load", "domcontentloaded", "--timeout-ms", str(timeout_ms)],
            expect_json=False,
            timeout=max(75, timeout_ms // 1000 + 20),
            op_name="wait_load",
        )

    def wait_ms(self, target_id: str, ms: int) -> None:
        self._run(
            ["wait", "--target-id", target_id, "--time", str(ms), "--timeout-ms", str(ms + 8000)],
            expect_json=False,
            timeout=max(65, ms // 1000 + 20),
            op_name="wait_ms",
        )

    def press(self, target_id: str, key: str) -> None:
        self._run(["press", key, "--target-id", target_id], expect_json=False, timeout=45, retries=2, op_name="press")

    def evaluate(self, target_id: str, fn_src: str, timeout: int = 45):
        payload = self._run(
            ["evaluate", "--target-id", target_id, "--fn", fn_src],
            expect_json=True,
            timeout=max(timeout, 90),
            retries=2,
            op_name="evaluate",
        )
        if isinstance(payload, dict) and "result" in payload:
            return payload.get("result")
        return payload


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def clean_author(author: str) -> str:
    a = normalize_space(author)
    if not a:
        return ""
    a = re.sub(r"\s+(19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$", "", a).strip()
    a = re.sub(r"\s+\d+\s*天前$", "", a).strip()
    a = re.sub(r"\s+\d+\s*小时前$", "", a).strip()
    return a


def has_buyer_signal(content: str) -> bool:
    t = normalize_space(content)
    if len(t) < 8:
        return False
    t_low = t.lower()
    study_hits = sum(1 for h in STUDY_HINTS if h in t or h in t_low)
    buyer_hits = sum(1 for h in BUYER_HINTS if h in t)
    question_like = any(x in t for x in ("?", "？", "请问", "有没有", "怎么", "如何"))
    first_person = any(x in t for x in ("我", "本人", "孩子", "女儿", "儿子"))

    if study_hits >= 1 and (buyer_hits >= 1 or question_like):
        return True
    if buyer_hits >= 2 and first_person:
        return True
    return False


def parse_xhs_sort_modes(raw_mode: str) -> List[str]:
    mode = normalize_space(raw_mode).lower()
    if mode in {"latest", "new", "最新"}:
        return ["latest"]
    if mode in {"hot", "最热"}:
        return ["hot"]
    return ["hot", "latest"]


def xhs_search_url_with_sort(base_url: str, sort_mode: str) -> str:
    base = normalize_space(base_url).split("#", 1)[0]
    if "source=" not in base:
        sep = "&" if "?" in base else "?"
        base = f"{base}{sep}source=web_search_result_notes"
    mode = "latest" if sort_mode == "latest" else "hot"
    return f"{base}#sort={mode}"


def xhs_sort_switch_js(sort_mode: str) -> str:
    labels = list(XHS_SORT_ALIASES.get(sort_mode, ()))
    labels_js = json.dumps(labels, ensure_ascii=False)
    return f"""() => {{
  const labels = {labels_js};
  if (!Array.isArray(labels) || labels.length === 0) {{
    return {{clicked:false, label:'', reason:'no_label'}};
  }}
  const nodes = Array.from(document.querySelectorAll('span,button,a,div')).filter(n => {{
    if (!n || !n.innerText) return false;
    const txt = String(n.innerText || '').trim();
    if (!txt || txt.length > 10) return false;
    return labels.some(lb => txt === lb || txt.includes(lb));
  }});
  for (const n of nodes) {{
    try {{
      const txt = String(n.innerText || '').trim();
      const rect = n.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      n.dispatchEvent(new MouseEvent('mousemove', {{bubbles:true, cancelable:true, view:window}}));
      n.dispatchEvent(new MouseEvent('mousedown', {{bubbles:true, cancelable:true, view:window}}));
      n.click();
      n.dispatchEvent(new MouseEvent('mouseup', {{bubbles:true, cancelable:true, view:window}}));
      return {{clicked:true, label:txt}};
    }} catch (e) {{}}
  }}
  return {{clicked:false, label:labels[0] || '', reason:'not_found'}};
}}"""


def is_probable_agency(author: str, content: str) -> bool:
    a = clean_author(author).lower()
    c = normalize_space(content).lower()
    if a in {"", "unknown", "匿名", "none", "null"}:
        return True
    if any(h in a for h in AGENCY_HINTS):
        return True
    if any(
        h in c
        for h in (
            "私信我",
            "联系我",
            "加v",
            "加微",
            "vx",
            "欢迎咨询",
            "全程服务",
            "背景提升",
            "文书润色",
            "保录",
            "套餐",
            "报价",
            "点击主页",
            "咨询老师",
        )
    ):
        return True
    return False


def score_intent(content: str) -> int:
    t = normalize_space(content)
    if len(t) < 8:
        return 0
    t_low = t.lower()
    study_hits = sum(1 for h in STUDY_HINTS if h in t or h in t_low)
    intent_hits = sum(1 for h in INTENT_HINTS if h in t)
    score = study_hits + intent_hits * 2
    if any(q in t for q in ("?", "？")):
        score += 1
    return min(score, 12)


def grade_from_score(score: int) -> str:
    if score >= 9:
        return "S"
    if score >= 7:
        return "A"
    if score >= 5:
        return "B"
    return "C"


def confidence_from_score(score: int) -> int:
    return min(99, 42 + score * 6)


def human_scroll(browser: OpenClawBrowser, target_id: str, rounds: int = 3) -> None:
    for _ in range(max(1, rounds)):
        try:
            browser.press(target_id, "PageDown")
            browser.wait_ms(target_id, random.randint(700, 1300))
        except Exception:
            continue


def link_extractor_js(platform: str, max_posts: int) -> str:
    if platform == "xhs":
        return f"""() => {{
  const out = [];
  const seen = new Set();
  const push = (href, text, meta) => {{
    const h = (href || '').trim();
    if (!h) return;
    const key = h.split('#')[0];
    if (seen.has(key)) return;
    seen.add(key);
    const row = {{ href: h, text: ((text || '').replace(/\\s+/g, ' ').trim()).slice(0, 260) }};
    if (meta && typeof meta === 'object') {{
      for (const [k, v] of Object.entries(meta)) {{
        row[k] = v;
      }}
    }}
    out.push(row);
  }};

  // Preferred path for XHS: use SSR/initial state to keep xsec_token.
  try {{
    const st = window.__INITIAL_STATE__ || {{}};
    const search = st.search || {{}};
    const feedsRef = search.feeds || null;
    const feeds = feedsRef && typeof feedsRef === 'object' && ('_value' in feedsRef) ? feedsRef._value : feedsRef;
    const list = Array.isArray(feeds) ? feeds : [];
    for (const item of list) {{
      if (!item || typeof item !== 'object') continue;
      const noteCard = item.noteCard || {{}};
      const noteId = String(
        item.id || item.noteId || item.note_id || noteCard.id || noteCard.noteId || noteCard.note_id || ''
      ).trim();
      if (!noteId) continue;
      const token = String(
        item.xsecToken || item.xsec_token || noteCard.xsecToken || noteCard.xsec_token || ''
      ).trim();
      let href = `/explore/${{noteId}}`;
      if (token) {{
        href += `?xsec_token=${{encodeURIComponent(token)}}&xsec_source=pc_search`;
      }}
      const title = String(
        noteCard.displayTitle || noteCard.title || noteCard.desc || noteCard.description || noteCard.content || ''
      );
      const userObj = noteCard.user || {{}};
      const nick = String(userObj.nickname || userObj.nickName || '');
      const userId = String(userObj.userId || userObj.userid || '');
      const userToken = String(userObj.xsecToken || userObj.xsec_token || '');
      let authorUrl = '';
      if (userId) {{
        authorUrl = `https://www.xiaohongshu.com/user/profile/${{userId}}`;
        if (userToken) {{
          authorUrl += `?xsec_token=${{encodeURIComponent(userToken)}}&xsec_source=pc_search`;
        }}
      }}
      const commentCount = Number(((noteCard.interactInfo || {{}}).commentCount || 0) || 0);
      push(href, `${{title}} ${{nick}}`, {{
        note_id: noteId,
        xsec_token: token,
        author: nick,
        author_url: authorUrl,
        comment_count: Number.isFinite(commentCount) ? commentCount : 0
      }});
      if (out.length >= {max_posts * 6}) break;
    }}
  }} catch (e) {{}}

  // Fallback: DOM links.
  if (out.length < {max_posts}) {{
    const selector = "a[href*='/explore/']";
    const els = document.querySelectorAll(selector);
    for (const el of els) {{
      const href = (el.href || el.getAttribute('href') || '').trim();
      const text = (el.innerText || el.textContent || el.getAttribute('title') || el.getAttribute('aria-label') || '');
      push(href, text, null);
      if (out.length >= {max_posts * 6}) break;
    }}
  }}

  return out;
}}"""
    elif platform == "weibo":
        selector = "a[href*='weibo.com'],a[href*='m.weibo.cn/status/']"
    elif platform == "zhihu":
        selector = "a[href*='question/'],a[href*='zhuanlan.zhihu.com/p/']"
    elif platform == "douyin":
        selector = "a[href*='/video/'],a[href*='douyin.com/note/']"
    elif platform == "bilibili":
        selector = "a[href*='bilibili.com/video/'],a[href*='b23.tv/']"
    elif platform == "tieba":
        selector = "a[href*='tieba.baidu.com/p/']"
    else:
        selector = "a[href]"

    selector_js = json.dumps(selector)
    return f"""() => {{
  const out = [];
  const seen = new Set();
  const els = document.querySelectorAll({selector_js});
  for (const el of els) {{
    const href = (el.getAttribute('href') || el.href || '').trim();
    if (!href) continue;
    const text = (((el.innerText || el.textContent || el.getAttribute('title') || el.getAttribute('aria-label') || '')).replace(/\\s+/g, ' ').trim()).slice(0, 260);
    const key = href.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({{href, text}});
    if (out.length >= {max_posts * 5}) break;
  }}
  return out;
}}"""


def comment_extractor_js(platform: str, max_comments: int) -> str:
    platform_js = json.dumps(str(platform or "").lower())
    return f"""() => {{
  const platform = {platform_js};
  const out = [];
  const seen = new Set();
  let xhsStructuredCount = 0;
  const push = (author, authorUrl, txt) => {{
    const content = String(txt || '').replace(/\\s+/g, ' ').trim();
    if (!content || content.length < 8) return;
    const a = String(author || '').replace(/\\s+/g, ' ').trim() || 'unknown';
    if (a === 'unknown') {{
      if (
        /^共\\s*\\d+\\s*条评论/.test(content) ||
        content.includes('置顶评论') ||
        content.includes('展开') ||
        content.includes('回复')
      ) {{
        return;
      }}
    }}
    const u = String(authorUrl || '').trim();
    const key = `${{a}}|${{u}}|${{content.slice(0, 120)}}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({{author: a, author_url: u, content: content.slice(0, 420)}});
  }};

  if (platform === 'xhs') {{
    try {{
      const st = window.__INITIAL_STATE__ || {{}};
      const note = st.note || {{}};
      const curRef = note.currentNoteId;
      const cur = curRef && typeof curRef === 'object' && ('_value' in curRef) ? curRef._value : curRef;
      const mapRef = note.noteDetailMap;
      const map = mapRef && typeof mapRef === 'object' && ('_value' in mapRef) ? mapRef._value : mapRef;
      const one = map && cur ? map[cur] : null;
      const commentsRef = one && one.comments ? one.comments : null;
      const commentsObj = commentsRef && typeof commentsRef === 'object' && ('_value' in commentsRef) ? commentsRef._value : commentsRef;
      const list = Array.isArray(commentsObj)
        ? commentsObj
        : ((commentsObj && Array.isArray(commentsObj.list)) ? commentsObj.list : []);

      const toProfileUrl = (uid, token) => {{
        const id = String(uid || '').trim();
        if (!id) return '';
        let u = `https://www.xiaohongshu.com/user/profile/${{id}}`;
        const t = String(token || '').trim();
        if (t) {{
          u += `?xsec_token=${{encodeURIComponent(t)}}&xsec_source=pc_comment`;
        }}
        return u;
      }};

      for (const c of list) {{
        if (!c || typeof c !== 'object') continue;
        const u = c.userInfo || c.user || {{}};
        const nick = u.nickname || u.nickName || c.nickname || c.userName || '';
        const uid = u.userId || u.userid || c.userId || c.user_id || '';
        const tok = u.xsecToken || u.xsec_token || c.xsecToken || c.xsec_token || '';
        push(nick, toProfileUrl(uid, tok), c.content || c.text || c.message || '');

        const subs = Array.isArray(c.subComments)
          ? c.subComments
          : (Array.isArray(c.subCommentList) ? c.subCommentList : (Array.isArray(c.children) ? c.children : []));
        for (const sc of subs) {{
          if (!sc || typeof sc !== 'object') continue;
          const su = sc.userInfo || sc.user || {{}};
          const sn = su.nickname || su.nickName || sc.nickname || sc.userName || '';
          const sid = su.userId || su.userid || sc.userId || sc.user_id || '';
          const stok = su.xsecToken || su.xsec_token || sc.xsecToken || sc.xsec_token || '';
          push(sn, toProfileUrl(sid, stok), sc.content || sc.text || sc.message || '');
          if (out.length >= {max_comments}) break;
        }}

        if (out.length >= {max_comments}) break;
      }}
      xhsStructuredCount = out.length;
    }} catch (e) {{}}
  }}

  if (out.length < {max_comments} && !(platform === 'xhs' && xhsStructuredCount > 0)) {{
  const selectors = [
    "[class*='comment']",
    "[class*='Comment']",
    "[data-e2e*='comment']",
    ".comment-item",
    "li[class*='comment']",
    "div[class*='reply']"
  ];
  const bucket = [];
  for (const sel of selectors) {{
    document.querySelectorAll(sel).forEach(n => bucket.push(n));
  }}
  for (const node of bucket) {{
    const txt = ((node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim());
    if (!txt || txt.length < 8) continue;
    const userEl = node.querySelector("a[href*='/user/'],a[href*='/profile/'],a[href*='/people/'],a[href*='/u/']");
    const author = (userEl ? (userEl.innerText || userEl.textContent || '') : '').replace(/\\s+/g, ' ').trim() || '';
    const authorUrl = userEl ? (userEl.getAttribute('href') || userEl.href || '') : '';
    push(author, authorUrl, txt);
    if (out.length >= {max_comments}) break;
  }}
  }}

  const preview = (document.body && document.body.innerText)
    ? document.body.innerText.replace(/\\s+/g, ' ').slice(0, 1200)
    : '';
  return {{
    url: location.href,
    title: document.title || '',
    comments: out,
    preview
  }};
}}"""


def normalize_post_url(platform: str, href: str, base_url: str) -> str:
    u = normalize_space(href)
    if not u:
        return ""
    if u.startswith("//"):
        u = "https:" + u
    elif u.startswith("/"):
        if platform == "xhs":
            u = "https://www.xiaohongshu.com" + u
        elif platform == "weibo":
            u = "https://s.weibo.com" + u
        elif platform == "douyin":
            u = "https://www.douyin.com" + u
        elif platform == "bilibili":
            u = "https://www.bilibili.com" + u
        elif platform == "tieba":
            u = "https://tieba.baidu.com" + u
        else:
            u = urljoin(base_url, u)
    return u


def collect_posts_for_keyword(
    browser: OpenClawBrowser,
    platform: str,
    keyword: str,
    max_posts: int,
    xhs_sort_mode: str = "both",
) -> List[Dict]:
    url_builder = SOCIAL_PLATFORMS.get(platform)
    if not url_builder:
        return []
    search_url = url_builder(keyword)

    raw_links_all: List[Dict] = []
    sort_modes = parse_xhs_sort_modes(xhs_sort_mode) if platform == "xhs" else [""]
    for idx, sort_mode in enumerate(sort_modes):
        search_url_for_sort = (
            xhs_search_url_with_sort(search_url, sort_mode) if platform == "xhs" else search_url
        )
        tab = browser.open(search_url_for_sort)
        target_id = tab.get("targetId", "")
        if not target_id:
            continue
        try:
            browser.wait_load(target_id)
            browser.wait_ms(target_id, random.randint(900, 1500))
            if platform == "xhs":
                human_scroll(browser, target_id, rounds=1)
            elif idx == 0:
                human_scroll(browser, target_id, rounds=2)

            raw_links = browser.evaluate(target_id, link_extractor_js(platform, max_posts), timeout=45)
            if platform == "xhs" and sort_mode == "latest" and not raw_links:
                browser.wait_ms(target_id, random.randint(1200, 1800))
                human_scroll(browser, target_id, rounds=1)
                raw_links = browser.evaluate(target_id, link_extractor_js(platform, max_posts), timeout=45)

            for item in raw_links if isinstance(raw_links, list) else []:
                if isinstance(item, dict):
                    item["sort_mode"] = sort_mode or ""
                    item["_search_url"] = search_url_for_sort
                    raw_links_all.append(item)
        finally:
            browser.close(target_id)

    out = []
    max_total = max_posts * len(sort_modes) if (platform == "xhs" and len(sort_modes) > 1) else max_posts
    seen: Dict[str, int] = {}
    for item in raw_links_all:
        if not isinstance(item, dict):
            continue
        post_url = normalize_post_url(platform, str(item.get("href", "")), search_url)
        if not post_url:
            continue
        if platform == "xhs" and "/explore/" not in post_url:
            continue
        if platform == "tieba" and "/p/" not in post_url:
            continue
        if platform == "bilibili" and "video" not in post_url and "b23.tv" not in post_url:
            continue
        key = post_url.split("#")[0]
        if key in seen:
            idx = seen[key]
            old_sort = normalize_space(str(out[idx].get("sort_mode", ""))).lower()
            new_sort = normalize_space(str(item.get("sort_mode", ""))).lower()
            if new_sort and new_sort not in old_sort.split("+"):
                merged = "+".join([x for x in [old_sort, new_sort] if x]).strip("+")
                out[idx]["sort_mode"] = merged
            continue
        seen[key] = len(out)
        out.append(
            {
                "platform": platform,
                "keyword": keyword,
                "search_url": normalize_space(str(item.get("_search_url", search_url))) or search_url,
                "post_url": post_url,
                "card_text": normalize_space(str(item.get("text", "")))[:260],
                "author_hint": normalize_space(str(item.get("author", "")))[:80],
                "author_url_hint": normalize_space(str(item.get("author_url", ""))),
                "comment_count_hint": int(item.get("comment_count", 0) or 0),
                "sort_mode": normalize_space(str(item.get("sort_mode", ""))).lower(),
            }
        )
        if len(out) >= max_total:
            break
    return out


def read_post_comments(browser: OpenClawBrowser, post: Dict, max_comments: int) -> Dict:
    tab = browser.open(post["post_url"])
    target_id = tab.get("targetId", "")
    if not target_id:
        return {"comments": [], "preview": "", "title": "", "url": post["post_url"], "status": "open_failed"}

    try:
        browser.wait_load(target_id)
        browser.wait_ms(target_id, random.randint(700, 1300))
        data = browser.evaluate(target_id, comment_extractor_js(str(post.get("platform", "")), max_comments), timeout=60)
        if not isinstance(data, dict):
            data = {}
        comments = data.get("comments") if isinstance(data.get("comments"), list) else []
        if not comments:
            # Fallback once after a short scroll for lazy-loaded comment containers.
            human_scroll(browser, target_id, rounds=1)
            data2 = browser.evaluate(target_id, comment_extractor_js(str(post.get("platform", "")), max_comments), timeout=60)
            if isinstance(data2, dict):
                c2 = data2.get("comments") if isinstance(data2.get("comments"), list) else []
                if len(c2) > len(comments):
                    data = data2
                    comments = c2
        status = "ok" if comments else "no_comments_visible"
        return {
            "title": normalize_space(str(data.get("title", ""))),
            "url": normalize_space(str(data.get("url", post["post_url"]))),
            "preview": normalize_space(str(data.get("preview", ""))),
            "comments": comments,
            "status": status,
        }
    except Exception as exc:
        return {
            "title": "",
            "url": post["post_url"],
            "preview": "",
            "comments": [],
            "status": f"read_failed:{exc.__class__.__name__}",
        }
    finally:
        browser.close(target_id)


def parse_keywords(raw: str) -> List[str]:
    kws = [normalize_space(x) for x in raw.split(",") if normalize_space(x)]
    return kws or list(DEFAULT_KEYWORDS)


def parse_platforms(raw: str) -> List[str]:
    names = [normalize_space(x).lower() for x in raw.split(",") if normalize_space(x)]
    out = [n for n in names if n in SOCIAL_PLATFORMS]
    return out or ["xhs"]


def leads_from_post(post: Dict, post_read: Dict) -> List[Lead]:
    comments = post_read.get("comments") or []
    preview = normalize_space(post_read.get("preview") or "")
    platform = str(post.get("platform", "") or "").lower()
    if not comments and preview and platform != "xhs":
        comments = [{"author": "post_author", "author_url": "", "content": preview[:420]}]

    leads: List[Lead] = []
    for c in comments:
        if not isinstance(c, dict):
            continue
        author = clean_author(str(c.get("author", "")))
        content = normalize_space(str(c.get("content", "")))
        author_url = normalize_space(str(c.get("author_url", "")))
        if not author:
            author = clean_author(str(post.get("author_hint", "")))
        if not author:
            author = "unknown"
        if not author_url:
            author_url = normalize_space(str(post.get("author_url_hint", "")))
        if len(content) < 8:
            continue
        if platform == "xhs" and (author == "unknown" or "/user/profile/" not in author_url.lower()):
            # For XHS we keep DM-ready personal leads only.
            continue
        if is_probable_agency(author, content):
            continue

        score = score_intent(content)
        if score < 4:
            continue
        if not has_buyer_signal(content) and score < 6:
            continue

        grade = grade_from_score(score)
        confidence = confidence_from_score(score)
        if author_url.startswith("/"):
            author_url = urljoin(post_read.get("url") or post.get("post_url", ""), author_url)

        leads.append(
            Lead(
                platform=post.get("platform", "xhs"),
                keyword=post.get("keyword", ""),
                post_url=post_read.get("url") or post.get("post_url", ""),
                source_url=post.get("search_url", ""),
                author=author,
                author_url=author_url,
                content=content[:420],
                score=score,
                grade=grade,
                confidence=confidence,
                collected_at=now_iso(),
                access_hint=f"openclaw_human_read|{post_read.get('status', 'unknown')}|sort:{post.get('sort_mode', 'na')}",
            )
        )

    return leads


def ensure_leads_table(conn: sqlite3.Connection) -> None:
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT,
            content TEXT,
            author TEXT,
            link TEXT,
            email TEXT,
            wechat TEXT,
            phone TEXT,
            score INTEGER,
            grade TEXT,
            status TEXT DEFAULT 'new',
            collected_at TEXT,
            contacted_at TEXT,
            UNIQUE(platform, link)
        )
        """
    )
    c.execute("PRAGMA table_info(leads)")
    cols = {row[1] for row in c.fetchall()}
    extra = {
        "keyword": "TEXT",
        "source_url": "TEXT",
        "note_url": "TEXT",
        "evidence_text": "TEXT",
        "evidence_image": "TEXT",
        "author_url": "TEXT",
        "access_hint": "TEXT",
    }
    for col, ddl in extra.items():
        if col not in cols:
            c.execute(f"ALTER TABLE leads ADD COLUMN {col} {ddl}")
    conn.commit()


def write_to_db(db_path: Path, leads: List[Lead]) -> int:
    conn = sqlite3.connect(str(db_path))
    ensure_leads_table(conn)
    c = conn.cursor()
    inserted = 0
    for lead in leads:
        digest = hashlib.sha1(f"{lead.post_url}|{lead.author}|{lead.content}".encode("utf-8", "ignore")).hexdigest()[:12]
        link = f"{lead.source_url or lead.post_url}#oc{digest}"
        c.execute(
            """
            INSERT OR IGNORE INTO leads
            (platform, content, author, link, email, wechat, phone, score, grade, collected_at,
             keyword, source_url, note_url, evidence_text, evidence_image, author_url, access_hint)
            VALUES (?, ?, ?, ?, '', '', '', ?, ?, ?, ?, ?, ?, ?, '', ?, ?)
            """,
            (
                lead.platform,
                lead.content,
                lead.author,
                link,
                lead.score,
                lead.grade,
                lead.collected_at,
                lead.keyword,
                lead.source_url,
                lead.post_url,
                lead.content[:280],
                lead.author_url,
                lead.access_hint,
            ),
        )
        if c.rowcount > 0:
            inserted += 1
    conn.commit()
    conn.close()
    return inserted


def write_outputs(out_dir: Path, posts: List[Dict], reads: List[Dict], leads: List[Lead]) -> Dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = now_ts()

    raw_path = out_dir / f"openclaw_reads_{ts}.json"
    lead_json = out_dir / f"openclaw_leads_{ts}.json"
    lead_csv = out_dir / f"openclaw_leads_{ts}.csv"
    lead_md = out_dir / f"openclaw_leads_{ts}.md"

    raw_payload = {
        "generated_at": now_iso(),
        "post_count": len(posts),
        "read_count": len(reads),
        "posts": posts,
        "reads": reads,
    }
    raw_path.write_text(json.dumps(raw_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lead_payload = {
        "generated_at": now_iso(),
        "lead_count": len(leads),
        "leads": [lead.__dict__ for lead in leads],
    }
    lead_json.write_text(json.dumps(lead_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    with lead_csv.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "platform",
                "keyword",
                "post_url",
                "source_url",
                "author",
                "author_url",
                "content",
                "score",
                "grade",
                "confidence",
                "collected_at",
                "access_hint",
            ],
        )
        writer.writeheader()
        for lead in leads:
            writer.writerow(lead.__dict__)

    lines = [
        "# OpenClaw 获客线索报告",
        "",
        f"- 生成时间: {now_iso()}",
        f"- 读取帖子数: {len(posts)}",
        f"- 产出线索数: {len(leads)}",
        "",
        "## Top 30 线索",
        "|平台|关键词|作者|意向分|等级|评论/帖子内容|帖子链接|",
        "|---|---|---|---:|---|---|---|",
    ]
    top = sorted(leads, key=lambda x: (x.score, x.confidence), reverse=True)[:30]
    for lead in top:
        snippet = lead.content.replace("|", " ")
        if len(snippet) > 64:
            snippet = snippet[:64] + "..."
        lines.append(
            f"|{lead.platform}|{lead.keyword}|{lead.author}|{lead.score}|{lead.grade}|{snippet}|[打开]({lead.post_url})|"
        )
    lead_md.write_text("\n".join(lines), encoding="utf-8-sig")

    latest_json = out_dir / "openclaw_leads_latest.json"
    latest_csv = out_dir / "openclaw_leads_latest.csv"
    latest_md = out_dir / "openclaw_leads_latest.md"
    latest_json.write_text(lead_json.read_text(encoding="utf-8"), encoding="utf-8")
    latest_csv.write_text(lead_csv.read_text(encoding="utf-8"), encoding="utf-8")
    latest_md.write_text(lead_md.read_text(encoding="utf-8"), encoding="utf-8")

    return {
        "raw": str(raw_path),
        "json": str(lead_json),
        "csv": str(lead_csv),
        "md": str(lead_md),
        "json_latest": str(latest_json),
        "csv_latest": str(latest_csv),
        "md_latest": str(latest_md),
    }


def dedupe_leads(leads: Iterable[Lead]) -> List[Lead]:
    out: List[Lead] = []
    seen = set()
    for lead in leads:
        key = hashlib.sha1(f"{lead.platform}|{lead.post_url}|{lead.author}|{lead.content}".encode("utf-8", "ignore")).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        out.append(lead)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="OpenClaw-first social lead acquisition")
    parser.add_argument("--platforms", default="xhs", help="Comma list: xhs,weibo,zhihu")
    parser.add_argument("--keywords", default=",".join(DEFAULT_KEYWORDS), help="Comma-separated keywords")
    parser.add_argument("--xhs-sort-mode", default="both", help="XHS sort: latest|hot|both")
    parser.add_argument("--max-posts-per-keyword", type=int, default=6)
    parser.add_argument("--max-comments-per-post", type=int, default=24)
    parser.add_argument("--browser-profile", default="openclaw")
    parser.add_argument("--db", default="leads.db")
    parser.add_argument("--out-dir", default="data/openclaw")
    parser.add_argument("--no-db", action="store_true", help="Skip DB write")
    args = parser.parse_args()

    platforms = parse_platforms(args.platforms)
    keywords = parse_keywords(args.keywords)

    browser = OpenClawBrowser(browser_profile=args.browser_profile)

    try:
        browser.start()
    except Exception as e:
        print(f"[ERR] OpenClaw browser start failed: {e}")
        return 1

    all_posts: List[Dict] = []
    all_reads: List[Dict] = []
    all_leads: List[Lead] = []

    for platform in platforms:
        for kw in keywords:
            try:
                posts = collect_posts_for_keyword(
                    browser,
                    platform,
                    kw,
                    args.max_posts_per_keyword,
                    xhs_sort_mode=args.xhs_sort_mode,
                )
            except Exception as e:
                print(f"[WARN] search failed platform={platform} kw={kw}: {e}")
                continue

            for post in posts:
                all_posts.append(post)
                try:
                    read = read_post_comments(browser, post, args.max_comments_per_post)
                except Exception as e:
                    read = {
                        "title": "",
                        "url": post.get("post_url", ""),
                        "preview": "",
                        "comments": [],
                        "status": f"read_failed:{e.__class__.__name__}",
                    }
                all_reads.append({"post": post, "read": read})
                all_leads.extend(leads_from_post(post, read))
                time.sleep(random.uniform(0.5, 1.3))

    all_leads = dedupe_leads(all_leads)
    artifacts = write_outputs(Path(args.out_dir), all_posts, all_reads, all_leads)

    inserted = 0
    if not args.no_db:
        inserted = write_to_db(Path(args.db), all_leads)

    grade_counts = {"S": 0, "A": 0, "B": 0, "C": 0}
    for lead in all_leads:
        grade_counts[lead.grade] = grade_counts.get(lead.grade, 0) + 1

    print("[OPENCLAW-LEAD] done")
    print(f"  platforms         : {','.join(platforms)}")
    print(f"  keywords          : {len(keywords)}")
    print(f"  posts_read        : {len(all_posts)}")
    print(f"  leads_total       : {len(all_leads)}")
    print(f"  grade S/A/B/C     : {grade_counts.get('S',0)}/{grade_counts.get('A',0)}/{grade_counts.get('B',0)}/{grade_counts.get('C',0)}")
    print(f"  db_inserted       : {inserted}")
    print(f"  artifacts         : {artifacts['json']} | {artifacts['csv']} | {artifacts['md']}")
    print(f"  latest            : {artifacts['json_latest']} | {artifacts['csv_latest']} | {artifacts['md_latest']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
