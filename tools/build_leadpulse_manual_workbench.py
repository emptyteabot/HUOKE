#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_rows(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        raise ValueError("rows missing")
    return [row for row in rows if isinstance(row, dict)]


def build_first_touch(row: dict[str, Any]) -> str:
    author = str(row.get("author", "")).strip() or "你好"
    snippet = str(row.get("evidence_snippet", "")).strip()
    opener = (
        f"看到你最近在聊：{snippet[:90]}。"
        if snippet
        else "看到你最近在公开讨论里提到获客相关问题。"
    )
    return (
        f"{author}，你好。\n\n"
        f"{opener}\n"
        "我这边最近在整理一批公开平台里已经在问价格、推荐、怎么选的人，"
        "会先筛掉明显的同行和噪声样本。\n"
        "如果你愿意，我可以先发你一张样本截图，你看值不值得继续聊。"
    )


def build_positive_reply(row: dict[str, Any]) -> str:
    return (
        "这是今天跑出来的一部分样本。\n\n"
        "如果你需要的话，我这周可以按你这个方向，"
        "帮你定一轮抓取和整理，先给你做一版更干净的名单。\n"
        "如果你愿意继续，我再把具体范围和价格发给你。"
    )


def make_card_json(row: dict[str, Any], rank: int) -> dict[str, Any]:
    return {
        "rank": rank,
        "source": row.get("source", ""),
        "icp_id": row.get("icp_id", ""),
        "icp_title": row.get("icp_title", ""),
        "weighted_score": row.get("weighted_score", 0),
        "platform": row.get("platform", ""),
        "author": row.get("author", ""),
        "keyword": row.get("keyword", ""),
        "post_url": row.get("post_url", ""),
        "author_url": row.get("author_url", ""),
        "evidence_snippet": row.get("evidence_snippet", ""),
        "first_touch": build_first_touch(row),
        "positive_reply": build_positive_reply(row),
        "collected_at": row.get("collected_at", ""),
    }


def is_clean_agency_row(row: dict[str, Any]) -> bool:
    if row.get("icp_id") != "agency_owner":
        return False
    if str(row.get("source", "")).strip() != "openclaw_iso_line_a":
        return False
    author = str(row.get("author", "")).strip().lower()
    if not author or author == "unknown":
        return False
    snippet = str(row.get("evidence_snippet", "")).lower()
    keyword = str(row.get("keyword", "")).lower()
    blob = f"{keyword} {snippet}"
    banned = [
        "starcitizen",
        "blackmarket",
        "astrolog",
        "fantasy",
        "hair transplant",
        "dating",
        "jobseeker",
        "lawyer",
        "med school",
    ]
    if any(token in blob for token in banned):
        return False
    positive = [
        "agency",
        "client",
        "clients",
        "marketing",
        "smallbusiness",
        "service business",
        "digital marketing",
        "consult",
        "booked call",
        "outreach",
        "freelance",
        "web dev",
        "ppc",
        "lead",
    ]
    return sum(1 for token in positive if token in blob) >= 2


def render_html(rows: list[dict[str, Any]], generated_at: str) -> str:
    payload = json.dumps(rows, ensure_ascii=False)
    title = "LeadPulse 手动触达工作台"
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    :root {{
      --bg: #f3f1ea;
      --panel: #ffffff;
      --muted: #6b7280;
      --border: rgba(15, 23, 42, 0.08);
      --text: #111827;
      --accent: #0f172a;
      --soft: #f8f7f1;
      --warn: #9a3412;
      --warn-bg: #fff7ed;
      --ok: #166534;
      --ok-bg: #f0fdf4;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: linear-gradient(180deg, #f5f3ec 0%, #ece8de 100%);
      color: var(--text);
    }}
    .wrap {{
      max-width: 1320px;
      margin: 0 auto;
      padding: 28px 20px 60px;
    }}
    .hero {{
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 18px;
      margin-bottom: 18px;
    }}
    .panel {{
      background: rgba(255,255,255,0.92);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 20px;
      box-shadow: 0 18px 60px rgba(15, 23, 42, 0.06);
    }}
    h1,h2,h3,p {{ margin: 0; }}
    .eyebrow {{
      font-size: 11px;
      letter-spacing: .18em;
      color: var(--muted);
    }}
    .title {{
      margin-top: 10px;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1.05;
      font-weight: 700;
    }}
    .sub {{
      margin-top: 14px;
      font-size: 16px;
      line-height: 1.8;
      color: #475569;
    }}
    .stats {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }}
    .stat {{
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--soft);
      padding: 14px;
    }}
    .stat .k {{
      font-size: 12px;
      color: var(--muted);
    }}
    .stat .v {{
      margin-top: 6px;
      font-size: 28px;
      font-weight: 700;
    }}
    .warn {{
      margin-top: 12px;
      border: 1px solid #fdba74;
      background: var(--warn-bg);
      color: var(--warn);
      border-radius: 18px;
      padding: 14px 16px;
      font-size: 14px;
      line-height: 1.6;
      display: none;
    }}
    .ok {{
      margin-top: 12px;
      border: 1px solid #86efac;
      background: var(--ok-bg);
      color: var(--ok);
      border-radius: 18px;
      padding: 14px 16px;
      font-size: 14px;
      line-height: 1.6;
      display: none;
    }}
    .toolbar {{
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin: 18px 0;
    }}
    input[type="search"], select {{
      height: 42px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: white;
      padding: 0 14px;
      font-size: 14px;
    }}
    input[type="search"] {{ min-width: 280px; flex: 1; }}
    .grid {{
      display: grid;
      gap: 16px;
    }}
    .tiny {{
      font-size: 12px;
      color: var(--muted);
    }}
    .card {{
      background: rgba(255,255,255,0.94);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 18px;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.05);
    }}
    .topline {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }}
    .rank {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      border-radius: 999px;
      background: #eef2ff;
      font-weight: 700;
      font-size: 14px;
    }}
    .score {{
      font-size: 14px;
      color: var(--muted);
    }}
    .meta {{
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }}
    .meta .box {{
      background: var(--soft);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 12px;
      min-height: 76px;
    }}
    .meta .k {{
      font-size: 11px;
      color: var(--muted);
      letter-spacing: .08em;
      text-transform: uppercase;
    }}
    .meta .v {{
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
    }}
    .snippet {{
      margin-top: 14px;
      background: var(--soft);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 14px;
      font-size: 14px;
      line-height: 1.75;
      color: #334155;
    }}
    .drafts {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 14px;
    }}
    .draft {{
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 14px;
      background: #fff;
    }}
    textarea {{
      width: 100%;
      min-height: 150px;
      margin-top: 10px;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
      resize: vertical;
      font: inherit;
      line-height: 1.6;
      background: var(--soft);
    }}
    .actions {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }}
    button, .linkbtn {{
      border: 1px solid var(--border);
      background: white;
      color: var(--text);
      border-radius: 14px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }}
    .statusbar {{
      margin-top: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }}
    .chip {{
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      border: 1px solid var(--border);
      background: #fff;
      cursor: pointer;
    }}
    .chip.active {{
      background: #e0f2fe;
      border-color: #7dd3fc;
      color: #075985;
    }}
    .shotbox {{
      margin-top: 12px;
      padding: 12px;
      background: var(--soft);
      border: 1px dashed rgba(15,23,42,0.18);
      border-radius: 18px;
    }}
    .shotbox img {{
      max-width: 100%;
      border-radius: 12px;
      margin-top: 10px;
      display: block;
    }}
    .helper {{
      margin-top: 8px;
      font-size: 12px;
      color: var(--muted);
    }}
    @media (max-width: 960px) {{
      .hero, .drafts, .meta {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <section class="panel">
        <div class="eyebrow">LeadPulse 手动触达工作台</div>
        <h1 class="title">前 30 个小型服务团队线索，逐条人工判断、逐条人工发送</h1>
        <p class="sub">
          这个页面只做手动工作流：看证据、改草稿、复制内容、打开帖子或主页、贴样本截图、记录结果。
          不做自动发送，不做风控规避，不做批量私信。
        </p>
        <p class="helper">生成时间：{html.escape(generated_at)}</p>
      </section>
      <section class="panel">
        <div class="stats">
          <div class="stat">
            <div class="k">当前队列</div>
            <div class="v" id="stat-total">0</div>
          </div>
          <div class="stat">
            <div class="k">已标记发送</div>
            <div class="v" id="stat-sent">0</div>
          </div>
          <div class="stat">
            <div class="k">正向回复</div>
            <div class="v" id="stat-positive">0</div>
          </div>
          <div class="stat">
            <div class="k">回复率</div>
            <div class="v" id="stat-rate">0%</div>
          </div>
        </div>
        <div id="warn-low-rate" class="warn">前 30 条里，已发送样本的正向回复率低于 5%。先停，重写剩余话术和样本图再继续。</div>
        <div id="ok-rate" class="ok">当前正向回复率达到或超过 5%，可以继续保持现有话术方向。</div>
      </section>
    </div>

    <div class="toolbar">
      <input id="search" type="search" placeholder="搜索作者、关键词、证据片段">
      <select id="status-filter">
        <option value="all">全部状态</option>
        <option value="pending">未处理</option>
        <option value="reviewed">已看过</option>
        <option value="sent">已发送</option>
        <option value="positive">正向回复</option>
        <option value="no_reply">无回复</option>
      </select>
      <button id="jump-next" type="button">跳到下一条未处理</button>
      <button id="export-json" type="button">导出当前记录 JSON</button>
      <button id="export-csv" type="button">导出当前记录 CSV</button>
    </div>

    <div id="cards" class="grid"></div>
  </div>

  <script>
    const rows = {payload};
    const storageKey = "leadpulse_manual_workbench_v1";
    const defaultState = Object.fromEntries(rows.map(row => [row.post_url, {{
      status: "pending",
      notes: "",
      screenshot: "",
      first_touch: row.first_touch,
      positive_reply: row.positive_reply,
    }}]));

    const saved = (() => {{
      try {{
        return JSON.parse(localStorage.getItem(storageKey) || "{{}}");
      }} catch {{
        return {{}};
      }}
    }})();

    const state = Object.assign(defaultState, saved);

    function persist() {{
      localStorage.setItem(storageKey, JSON.stringify(state));
      render();
    }}

    function copyText(value) {{
      navigator.clipboard.writeText(value);
    }}

    function statusLabel(status) {{
      return {{
        pending: "未处理",
        reviewed: "已看过",
        sent: "已发送",
        positive: "正向回复",
        no_reply: "无回复",
      }}[status] || "未处理";
    }}

    function renderStats(visibleRows) {{
      const total = visibleRows.length;
      const sent = visibleRows.filter(row => state[row.post_url]?.status === "sent" || state[row.post_url]?.status === "positive" || state[row.post_url]?.status === "no_reply").length;
      const positive = visibleRows.filter(row => state[row.post_url]?.status === "positive").length;
      const rate = sent ? Math.round((positive / sent) * 1000) / 10 : 0;
      document.getElementById("stat-total").textContent = String(total);
      document.getElementById("stat-sent").textContent = String(sent);
      document.getElementById("stat-positive").textContent = String(positive);
      document.getElementById("stat-rate").textContent = `${{rate}}%`;

      const warn = document.getElementById("warn-low-rate");
      const ok = document.getElementById("ok-rate");
      warn.style.display = "none";
      ok.style.display = "none";
      if (sent >= 30 && rate < 5) {{
        warn.style.display = "block";
      }} else if (sent >= 30 && rate >= 5) {{
        ok.style.display = "block";
      }}
    }}

    function filteredRows() {{
      const keyword = document.getElementById("search").value.trim().toLowerCase();
      const status = document.getElementById("status-filter").value;
      return rows.filter(row => {{
        const s = state[row.post_url]?.status || "pending";
        const hay = `${{row.author}} ${{row.keyword}} ${{row.evidence_snippet}}`.toLowerCase();
        const statusOk = status === "all" ? true : s === status;
        const keywordOk = !keyword || hay.includes(keyword);
        return statusOk && keywordOk;
      }});
    }}

    function card(row) {{
      const rowState = state[row.post_url] || defaultState[row.post_url];
      const status = rowState.status || "pending";
      const wrap = document.createElement("section");
      wrap.className = "card";
      wrap.innerHTML = `
        <div class="topline">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="rank">${{row.rank}}</span>
            <div>
              <div style="font-size:18px;font-weight:700;">${{row.author || "未知作者"}}</div>
              <div class="score">${{row.icp_title}} · 分数 ${{row.weighted_score}}</div>
            </div>
          </div>
          <div class="score">${{statusLabel(status)}}</div>
        </div>

        <div class="meta">
          <div class="box">
            <div class="k">平台</div>
            <div class="v">${{row.platform}}</div>
          </div>
          <div class="box">
            <div class="k">关键词</div>
            <div class="v">${{row.keyword}}</div>
          </div>
          <div class="box">
            <div class="k">来源</div>
            <div class="v">${{row.source}}</div>
          </div>
          <div class="box">
            <div class="k">时间</div>
            <div class="v">${{row.collected_at || "-"}}</div>
          </div>
        </div>

        <div class="snippet"><b>证据：</b> ${{row.evidence_snippet}}</div>

        <div class="actions">
          <a class="linkbtn" href="${{row.post_url}}" target="_blank" rel="noreferrer">打开帖子</a>
          <a class="linkbtn" href="${{row.author_url || row.post_url}}" target="_blank" rel="noreferrer">打开主页</a>
          <button type="button" data-open-copy="first_touch">复制首条并打开帖子</button>
          <button type="button" data-open-copy="positive_reply">复制跟进并打开主页</button>
        </div>

        <div class="drafts">
          <div class="draft">
            <div style="font-size:14px;font-weight:700;">首条私信草稿</div>
            <textarea data-field="first_touch">${{rowState.first_touch || ""}}</textarea>
            <div class="actions">
              <button type="button" data-copy="first_touch">复制首条草稿</button>
            </div>
          </div>
          <div class="draft">
            <div style="font-size:14px;font-weight:700;">正向回复后续话术</div>
            <textarea data-field="positive_reply">${{rowState.positive_reply || ""}}</textarea>
            <div class="actions">
              <button type="button" data-copy="positive_reply">复制后续话术</button>
            </div>
          </div>
        </div>

        <div class="shotbox">
          <div style="font-size:14px;font-weight:700;">样本截图</div>
          <div class="helper">可上传一张本地截图，只保存在当前浏览器，不会上传到服务器。</div>
          <input type="file" accept="image/*" data-upload>
          <img data-preview style="${{rowState.screenshot ? "" : "display:none;"}}" src="${{rowState.screenshot || ""}}" alt="">
        </div>

        <div class="shotbox">
          <div style="font-size:14px;font-weight:700;">备注</div>
          <textarea data-notes placeholder="记录你实际发了什么、对方回了什么、为什么跳过。">${{rowState.notes || ""}}</textarea>
        </div>

        <div class="statusbar" data-statusbar></div>
      `;

      wrap.querySelectorAll("textarea[data-field]").forEach((el) => {{
        el.addEventListener("input", (event) => {{
          const field = event.target.dataset.field;
          state[row.post_url][field] = event.target.value;
          persist();
        }});
      }});

      wrap.querySelectorAll("button[data-copy]").forEach((btn) => {{
        btn.addEventListener("click", () => {{
          const field = btn.dataset.copy;
          copyText(state[row.post_url][field] || "");
        }});
      }});

      const statusbar = wrap.querySelector("[data-statusbar]");
      ["pending", "reviewed", "sent", "positive", "no_reply"].forEach((key) => {{
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `chip ${{status === key ? "active" : ""}}`;
        btn.dataset.status = key;
        btn.textContent = statusLabel(key);
        btn.addEventListener("click", () => {{
          state[row.post_url].status = key;
          persist();
        }});
        statusbar.appendChild(btn);
      }});

      const notes = wrap.querySelector("textarea[data-notes]");
      notes.addEventListener("input", (event) => {{
        state[row.post_url].notes = event.target.value;
        persist();
      }});

      const upload = wrap.querySelector("input[data-upload]");
      const preview = wrap.querySelector("img[data-preview]");
      upload.addEventListener("change", (event) => {{
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {{
          state[row.post_url].screenshot = String(reader.result || "");
          persist();
        }};
        reader.readAsDataURL(file);
      }});

      return wrap;
    }}

    function render() {{
      const root = document.getElementById("cards");
      root.innerHTML = "";
      const visible = filteredRows();
      renderStats(visible);
      visible.forEach(row => root.appendChild(card(row)));
    }}

    function exportJson() {{
      const blob = new Blob([JSON.stringify({{ exported_at: new Date().toISOString(), rows, state }}, null, 2)], {{type: "application/json;charset=utf-8"}});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leadpulse_manual_workbench_export.json";
      a.click();
      URL.revokeObjectURL(url);
    }}

    function exportCsv() {{
      const header = ["rank","author","keyword","post_url","status","notes"];
      const lines = [header.join(",")];
      rows.forEach(row => {{
        const s = state[row.post_url] || {{}};
        const vals = [
          row.rank,
          row.author,
          row.keyword,
          row.post_url,
          s.status || "pending",
          (s.notes || "").replace(/"/g, '""'),
        ];
        lines.push(vals.map(v => `"${{String(v ?? "")}}"`).join(","));
      }});
      const blob = new Blob([lines.join("\\n")], {{type: "text/csv;charset=utf-8"}});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leadpulse_manual_workbench_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    }}

    function jumpNext() {{
      const next = filteredRows().find(row => (state[row.post_url]?.status || "pending") === "pending");
      if (!next) return;
      const target = document.getElementById(`row-${{next.rank}}`);
      if (target) {{
        target.scrollIntoView({{ behavior: "smooth", block: "start" }});
      }}
    }}

    document.getElementById("search").addEventListener("input", render);
    document.getElementById("status-filter").addEventListener("change", render);
    document.getElementById("export-json").addEventListener("click", exportJson);
    document.getElementById("export-csv").addEventListener("click", exportCsv);
    document.getElementById("jump-next").addEventListener("click", jumpNext);
    render();
  </script>
</body>
</html>
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build LeadPulse manual outreach workbench")
    parser.add_argument("--input", default=str(Path.home() / "Desktop" / "LeadPulse_coldstart_100_latest.json"))
    parser.add_argument("--output", default=str(Path.home() / "Desktop" / "LeadPulse_manual_workbench_top30_agency.html"))
    parser.add_argument("--top-n", type=int, default=30)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rows = load_rows(Path(args.input))
    filtered = [row for row in rows if is_clean_agency_row(row)]
    filtered.sort(key=lambda item: int(item.get("weighted_score", 0)), reverse=True)
    top = [make_card_json(row, idx) for idx, row in enumerate(filtered[: args.top_n], start=1)]
    out = Path(args.output)
    out.write_text(render_html(top, now_iso()), encoding="utf-8")
    print(json.dumps({"output": str(out), "count": len(top)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
