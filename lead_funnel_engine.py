#!/usr/bin/env python3
"""
Lead intent funnel + lightweight RAG helper.

This module is model-agnostic:
- Uses deterministic scoring for confidence/stage.
- Retrieves local knowledge snippets for suggested replies.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple


TOKEN_RE = re.compile(r"[a-z0-9\u4e00-\u9fff]+", re.IGNORECASE)


def _tokens(text: str) -> List[str]:
    return TOKEN_RE.findall(str(text or "").lower())


def _contains_any(text: str, terms: Sequence[str]) -> bool:
    low = str(text or "").lower()
    return any(str(t).lower() in low for t in terms)


def _clamp(value: int, low: int = 0, high: int = 99) -> int:
    return max(low, min(high, int(value)))


VERTICAL_RULES: Dict[str, Dict[str, List[str]]] = {
    "china_social_b2b": {
        "intent": ["获客", "招生", "线索", "咨询量", "询盘", "转化", "投放", "雅思", "留学", "出海", "跨境", "外贸", "代运营"],
        "demand": ["求推荐", "求助", "请问", "有没有", "哪家", "预算", "费用", "找客户", "找学生", "找服务商", "线索质量差"],
        "urgency": ["本周", "这周", "马上", "尽快", "来不及", "补录", "卡分", "这个月"],
        "competitor": ["私信我", "报名链接", "免费领取", "课程招商", "加v", "加微信"],
    },
    "study_abroad": {
        "intent": ["留学", "申请", "文书", "选校", "gpa", "offer", "签证", "雅思", "托福", "预算", "费用"],
        "demand": ["求推荐", "求助", "请问", "有没有", "怎么选", "来不及", "急", "避雷"],
        "urgency": ["deadline", "ddl", "本周", "这周", "马上", "尽快", "来不及"],
        "competitor": ["机构", "中介", "顾问", "私信我", "服务报价", "套餐", "保录", "加v", "加微信"],
    },
    "vibe_coding": {
        "intent": ["saas", "agent", "获客", "转化", "订阅", "自动化", "增长", "独立开发"],
        "demand": ["求推荐", "怎么做", "怎么卖", "冷启动", "预算", "客户来源"],
        "urgency": ["本周上线", "马上", "尽快", "deadline", "burn"],
        "competitor": ["代运营", "训练营", "咨询服务", "课程售卖"],
    },
}


@dataclass
class FunnelResult:
    confidence: int
    stage: str
    reason: str
    matched_terms: List[str]
    suggested_reply: str
    route: str = "fast"


@dataclass
class ManifestRoute:
    route: str
    complexity: int
    specificity: int
    reason: str


class LocalRAG:
    def __init__(self, knowledge_dir: str | Path | None) -> None:
        self.docs: List[Tuple[str, str, set[str]]] = []
        if not knowledge_dir:
            return

        root = Path(knowledge_dir)
        if not root.exists() or not root.is_dir():
            return

        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in {".md", ".txt"}:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            text = re.sub(r"\s+", " ", text).strip()
            if not text:
                continue
            toks = set(_tokens(text))
            self.docs.append((path.name, text, toks))

    def retrieve(self, query: str, top_k: int = 2) -> List[Tuple[str, str]]:
        q = set(_tokens(query))
        if not q or not self.docs:
            return []

        scored: List[Tuple[float, str, str]] = []
        for name, text, toks in self.docs:
            overlap = len(q & toks)
            if overlap <= 0:
                continue
            score = overlap / max(1.0, len(q) ** 0.5)
            scored.append((score, name, text))

        scored.sort(key=lambda x: x[0], reverse=True)
        out: List[Tuple[str, str]] = []
        for _, name, text in scored[: max(1, top_k)]:
            out.append((name, text[:220]))
        return out


class LeadFunnelEngine:
    def __init__(self, vertical: str = "china_social_b2b", knowledge_dir: str | Path | None = None) -> None:
        key = str(vertical or "china_social_b2b").strip().lower()
        self.vertical = key if key in VERTICAL_RULES else "china_social_b2b"
        self.rules = VERTICAL_RULES[self.vertical]
        self.rag = LocalRAG(knowledge_dir)

    @staticmethod
    def stage_from_confidence(confidence: int) -> str:
        if confidence >= 85:
            return "hot"
        if confidence >= 70:
            return "warm"
        if confidence >= 55:
            return "nurture"
        return "cold"

    def route_manifest(self, platform: str, keyword: str, author: str, content: str, preview: str = "") -> ManifestRoute:
        text = f"{platform} {keyword} {author} {content} {preview}".strip()
        low = text.lower()

        pain_hits = sum(1 for t in self.rules["demand"] + self.rules["urgency"] if str(t).lower() in low)
        budget_hits = sum(1 for t in ("预算", "费用", "报价", "价格", "可以谈", "1w", "一万", "首轮", "试单") if t in low)
        channel_hits = sum(1 for t in ("小红书", "抖音", "评论区", "投流", "广告", "询盘", "招生", "获客") if t in low)
        author_specific = 1 if author and author.lower() not in {"unknown", "匿名", "none", "null"} else 0

        complexity = _clamp(len(content) // 28 + pain_hits * 8 + budget_hits * 10 + channel_hits * 5, 0, 99)
        specificity = _clamp(len(keyword) // 2 + author_specific * 12 + budget_hits * 12 + pain_hits * 7, 0, 99)

        if complexity >= 70 or specificity >= 70:
            route = "deep"
        elif complexity >= 45 or specificity >= 45:
            route = "balanced"
        else:
            route = "fast"

        reason = f"manifest_route={route}, complexity={complexity}, specificity={specificity}"
        return ManifestRoute(route=route, complexity=complexity, specificity=specificity, reason=reason)

    def evaluate(self, platform: str, keyword: str, author: str, content: str, preview: str = "") -> FunnelResult:
        text = f"{platform} {keyword} {author} {content} {preview}".strip()
        low = text.lower()
        route = self.route_manifest(platform=platform, keyword=keyword, author=author, content=content, preview=preview)

        intent_hits = [t for t in self.rules["intent"] if str(t).lower() in low]
        demand_hits = [t for t in self.rules["demand"] if str(t).lower() in low]
        urgent_hits = [t for t in self.rules["urgency"] if str(t).lower() in low]
        competitor_hits = [t for t in self.rules["competitor"] if str(t).lower() in low]

        question_like = _contains_any(low, ["?", "？", "请问", "怎么", "如何", "有没有"])
        long_enough = len(str(content or "").strip()) >= 20

        confidence = 28
        confidence += min(45, len(intent_hits) * 10)
        confidence += min(20, len(demand_hits) * 7)
        confidence += min(15, len(urgent_hits) * 8)
        confidence += 6 if question_like else 0
        confidence += 4 if long_enough else 0
        confidence += 6 if route.route == "balanced" else 0
        confidence += 10 if route.route == "deep" else 0
        confidence -= min(30, len(competitor_hits) * 12)
        confidence = _clamp(confidence)

        stage = self.stage_from_confidence(confidence)
        reason = f"intent={len(intent_hits)}, demand={len(demand_hits)}, urgency={len(urgent_hits)}, competitor={len(competitor_hits)}, {route.reason}"

        rag_hits = self.rag.retrieve(text, top_k=2)
        refs = ""
        if rag_hits:
            snippets = []
            for _, snippet in rag_hits:
                clean = re.sub(r"\s+", " ", str(snippet or "")).strip()
                if clean:
                    snippets.append(clean[:80])
            if snippets:
                refs = "；".join(snippets)[:140]

        if stage == "hot":
            action = "可直接私信，给一个最小下一步（例如10分钟评估）。"
        elif stage == "warm":
            action = "先发一条诊断问题，再引导到预约。"
        elif stage == "nurture":
            action = "先给免费清单或模板，建立信任后再转化。"
        else:
            action = "暂不强推，进入培育队列。"

        reply = f"看到你在关注‘{keyword or '当前问题'}’，{action}"
        if refs:
            reply = f"{reply} 可参考：{refs}"

        return FunnelResult(
            confidence=confidence,
            stage=stage,
            reason=reason,
            matched_terms=(intent_hits + demand_hits + urgent_hits)[:12],
            suggested_reply=reply[:220],
            route=route.route,
        )
