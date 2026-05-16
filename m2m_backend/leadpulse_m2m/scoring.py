from __future__ import annotations

import re
from typing import Iterable

from .config import settings
from .schemas import (
    BudgetDecision,
    BudgetEvidence,
    Currency,
    LeadProfile,
    ScoreBreakdown,
    ScoringRequest,
    ScoringResult,
)


MONEY_RE = re.compile(
    r"(?P<prefix>\$|usd|eur|gbp|rmb|cny|人民币|美元|欧元|英镑|¥)?\s*"
    r"(?P<num>\d+(?:\.\d+)?)\s*"
    r"(?P<unit>w|k|万|千)?\s*"
    r"(?P<suffix>usd|eur|gbp|rmb|cny|人民币|美元|欧元|英镑|美金|元|块|刀)?",
    re.IGNORECASE,
)

RANGE_RE = re.compile(
    r"(?P<low>\d+(?:\.\d+)?)\s*(?:-|~|到|至)\s*(?P<high>\d+(?:\.\d+)?)\s*(?P<unit>w|k|万|千)?",
    re.IGNORECASE,
)

CURRENCY_RATES_TO_USD = {
    Currency.usd: 1.0,
    Currency.cny: 0.14,
    Currency.eur: 1.08,
    Currency.gbp: 1.27,
}

HIGH_BUDGET_TERMS = (
    "budget is not an issue",
    "no budget limit",
    "premium",
    "enterprise",
    "high ticket",
    "not price sensitive",
    "预算不是问题",
    "预算充足",
    "不差钱",
    "高客单",
    "企业级",
    "高净值",
)

LOW_BUDGET_TERMS = (
    "free",
    "cheap",
    "low cost",
    "discount",
    "no budget",
    "预算有限",
    "便宜",
    "免费",
    "低价",
    "先看看",
)

INTENT_TERMS = (
    "book",
    "call",
    "demo",
    "buy",
    "hire",
    "need",
    "looking for",
    "evaluate",
    "urgent",
    "预约",
    "电话",
    "咨询",
    "采购",
    "马上",
    "需要",
    "方案",
    "增长",
    "获客",
)

AUTHORITY_TERMS = (
    "founder",
    "ceo",
    "owner",
    "director",
    "vp",
    "head of",
    "decision maker",
    "创始人",
    "老板",
    "负责人",
    "总监",
    "合伙人",
    "我决定",
    "我负责",
)

URGENCY_TERMS = (
    "today",
    "tomorrow",
    "this week",
    "asap",
    "urgent",
    "deadline",
    "immediately",
    "今天",
    "明天",
    "本周",
    "尽快",
    "马上",
    "紧急",
    "截止",
)

NEGATIVE_TERMS = (
    "student",
    "intern",
    "research only",
    "not now",
    "maybe later",
    "学生",
    "实习",
    "只是看看",
    "以后再说",
    "不考虑",
    "没预算",
)

SCOPE_EXPANSION_TERMS = (
    "omnichannel",
    "full service",
    "all channels",
    "content",
    "video",
    "design",
    "branding",
    "packaging",
    "social media",
    "wechat",
    "tiktok",
    "instagram",
    "全渠道",
    "多平台",
    "公众号",
    "视频号",
    "抖音",
    "小红书",
    "代运营",
    "拍摄",
    "剪辑",
    "文案",
    "图片",
    "海报",
    "物料",
    "平面设计",
    "活动设计",
    "ip设计",
    "ip 设计",
    "包装",
    "视觉",
    "设计工作",
)

SCOPE_CONTRACTION_TERMS = (
    "limited budget",
    "tight budget",
    "low budget",
    "cheap",
    "cost effective",
    "affordable",
    "性价比",
    "预算有限",
    "费用预算有限",
    "预算不多",
    "价格合适",
    "报价合适",
    "几百块",
    "500块",
    "500 块",
    "1000元",
    "1000 元",
    "低价",
    "便宜",
)


def _all_text(lead: LeadProfile) -> str:
    parts = [
        lead.context,
        lead.declared_budget,
        lead.desired_outcome,
        lead.urgency,
        lead.decision_role,
        lead.contact.company,
        lead.contact.name,
        *lead.pain_points,
    ]
    for turn in lead.answers:
        parts.append(turn.question)
        parts.append(turn.answer)
    return "\n".join(str(part or "") for part in parts)


def _contains_any(text: str, terms: Iterable[str]) -> list[str]:
    low = text.lower()
    return [term for term in terms if term.lower() in low]


def _scope_budget_mismatch(text: str) -> tuple[bool, list[str], list[str]]:
    scope_hits = _contains_any(text, SCOPE_EXPANSION_TERMS)
    contraction_hits = _contains_any(text, SCOPE_CONTRACTION_TERMS)
    scope_categories = 0
    low = text.lower()
    category_terms = (
        ("content", ("文案", "内容", "content", "笔记")),
        ("video", ("视频", "拍摄", "剪辑", "video", "tiktok", "抖音", "视频号")),
        ("design", ("设计", "海报", "物料", "包装", "视觉", "ip设计", "ip 设计", "design", "branding", "packaging")),
        ("channel", ("公众号", "小红书", "抖音", "视频号", "wechat", "instagram", "social media")),
    )
    for _, terms in category_terms:
        if any(term in low for term in terms):
            scope_categories += 1
    return bool(contraction_hits and (len(scope_hits) >= 4 or scope_categories >= 3)), scope_hits, contraction_hits


def _currency_from_text(text: str) -> Currency:
    low = text.lower()
    if "$" in text or "usd" in low or "美元" in low or "美金" in low or "刀" in low:
        return Currency.usd
    if "eur" in low or "欧元" in low:
        return Currency.eur
    if "gbp" in low or "英镑" in low:
        return Currency.gbp
    if "rmb" in low or "cny" in low or "人民币" in low or "¥" in text or "元" in text or "块" in text:
        return Currency.cny
    return Currency.unknown


def _apply_unit(value: float, unit: str | None) -> float:
    normalized_unit = (unit or "").lower()
    if normalized_unit in {"w", "万"}:
        return value * 10000
    if normalized_unit in {"k", "千"}:
        return value * 1000
    return value


def extract_budget(text: str, threshold_usd: float | None = None) -> BudgetDecision:
    threshold = float(threshold_usd if threshold_usd is not None else settings.min_budget_usd)
    source = str(text or "")
    low = source.lower()

    candidates: list[tuple[float, Currency, str]] = []

    for match in RANGE_RE.finditer(source):
        high = float(match.group("high"))
        amount = _apply_unit(high, match.group("unit"))
        window = source[max(0, match.start() - 10) : min(len(source), match.end() + 10)]
        currency = _currency_from_text(window)
        if currency is Currency.unknown and match.group("unit") in {"万", "千"}:
            currency = Currency.cny
        candidates.append((amount, currency, match.group(0)))

    for match in MONEY_RE.finditer(source):
        amount = float(match.group("num"))
        amount = _apply_unit(amount, match.group("unit"))
        raw = match.group(0)
        window = source[max(0, match.start() - 18) : min(len(source), match.end() + 18)]
        currency = _currency_from_text(raw)
        if currency is Currency.unknown and not match.group("unit"):
            budget_context = (
                "budget",
                "price",
                "cost",
                "spend",
                "fee",
                "预算",
                "价格",
                "费用",
                "月",
                "年",
            )
            if not _contains_any(window, budget_context):
                continue
        if currency is Currency.unknown and match.group("unit") in {"万", "千"}:
            currency = Currency.cny
        if currency is Currency.unknown and amount < 200 and match.group("unit") in {"w", "万"}:
            currency = Currency.cny
        candidates.append((amount, currency, raw))

    best: tuple[float, Currency, str] | None = None
    best_usd = -1.0
    for amount, currency, raw in candidates:
        currency_for_rate = Currency.usd if currency is Currency.unknown else currency
        normalized = amount * CURRENCY_RATES_TO_USD.get(currency_for_rate, 1.0)
        if normalized > best_usd:
            best = (amount, currency, raw)
            best_usd = normalized

    if best is not None:
        amount, currency, raw = best
        currency_for_rate = Currency.usd if currency is Currency.unknown else currency
        normalized_usd = round(amount * CURRENCY_RATES_TO_USD.get(currency_for_rate, 1.0), 2)
        qualified = normalized_usd >= threshold
        evidence = BudgetEvidence(
            raw_text=raw,
            amount=amount,
            currency=currency,
            normalized_usd=normalized_usd,
            confidence=0.95 if currency is not Currency.unknown else 0.75,
        )
        reason = (
            f"Budget normalizes to {normalized_usd:.2f} USD, "
            f"threshold is {threshold:.2f} USD."
        )
        return BudgetDecision(threshold_usd=threshold, qualified=qualified, evidence=evidence, reason=reason)

    high_terms = _contains_any(source, HIGH_BUDGET_TERMS)
    if high_terms:
        assumed = threshold * 1.25
        return BudgetDecision(
            threshold_usd=threshold,
            qualified=True,
            evidence=BudgetEvidence(
                raw_text=high_terms[0],
                amount=None,
                currency=Currency.unknown,
                normalized_usd=round(assumed, 2),
                confidence=0.55,
            ),
            reason="Budget language indicates premium buying capacity, but amount is implicit.",
        )

    low_terms = _contains_any(low, LOW_BUDGET_TERMS)
    if low_terms:
        return BudgetDecision(
            threshold_usd=threshold,
            qualified=False,
            evidence=BudgetEvidence(
                raw_text=low_terms[0],
                amount=None,
                currency=Currency.unknown,
                normalized_usd=0,
                confidence=0.7,
            ),
            reason="Budget language indicates low or absent budget.",
        )

    return BudgetDecision(
        threshold_usd=threshold,
        qualified=False,
        evidence=BudgetEvidence(raw_text="", amount=None, currency=Currency.unknown, normalized_usd=None, confidence=0),
        reason="No deterministic budget evidence was found.",
    )


def score_lead(request: ScoringRequest) -> ScoringResult:
    text = _all_text(request.lead)
    budget = extract_budget(text, request.min_budget_usd)

    intent_hits = _contains_any(text, INTENT_TERMS)
    authority_hits = _contains_any(text, AUTHORITY_TERMS)
    urgency_hits = _contains_any(text, URGENCY_TERMS)
    negative_hits = _contains_any(text, NEGATIVE_TERMS)
    scope_mismatch, scope_hits, contraction_hits = _scope_budget_mismatch(text)

    budget_score = 40 if budget.qualified else 0
    if not budget.qualified and budget.evidence.normalized_usd is not None:
        ratio = budget.evidence.normalized_usd / max(1.0, budget.threshold_usd)
        budget_score = min(28, max(5, int(ratio * 28)))
    elif not budget.qualified and budget.evidence.confidence >= 0.5:
        budget_score = 12

    intent_score = min(20, len(intent_hits) * 5)
    authority_score = min(15, len(authority_hits) * 5)
    urgency_score = min(15, len(urgency_hits) * 5)
    friction = max(-20, -len(negative_hits) * 7)

    breakdown = ScoreBreakdown(
        budget=budget_score,
        intent=intent_score,
        authority=authority_score,
        urgency=urgency_score,
        friction=friction,
    )
    score = max(0, min(100, breakdown.total))
    if scope_mismatch:
        score = max(0, score - 40)
        budget = BudgetDecision(
            threshold_usd=budget.threshold_usd,
            qualified=False,
            evidence=BudgetEvidence(
                raw_text=", ".join([*contraction_hits[:2], *scope_hits[:3]])[:500],
                amount=budget.evidence.amount,
                currency=budget.evidence.currency,
                normalized_usd=budget.evidence.normalized_usd,
                confidence=max(budget.evidence.confidence, 0.9),
            ),
            reason="Scope and budget are misaligned: broad cross-functional service scope appears with budget-constrained language.",
        )

    missing_fields: list[str] = []
    if not budget.qualified and budget.evidence.confidence < 0.9:
        missing_fields.append("budget")
    if not authority_hits and not request.lead.decision_role:
        missing_fields.append("decision_role")
    if not intent_hits and not request.lead.desired_outcome:
        missing_fields.append("desired_outcome")
    if not urgency_hits and not request.lead.urgency:
        missing_fields.append("urgency")
    if not request.lead.contact.email and not request.lead.contact.phone:
        missing_fields.append("contact")

    qualified = budget.qualified and score >= 60 and "contact" not in missing_fields and not scope_mismatch
    if scope_mismatch:
        next_action = "reject_or_nurture"
    elif budget.qualified and score >= 55 and missing_fields == ["contact"]:
        next_action = "ask_next_question"
    elif qualified:
        next_action = "show_availability"
    elif budget.qualified and len(missing_fields) <= 2:
        next_action = "ask_next_question"
    else:
        next_action = "reject_or_nurture" if budget.evidence.confidence >= 0.7 and not budget.qualified else "ask_next_question"

    if score >= 85:
        grade = "S"
    elif score >= 70:
        grade = "A"
    elif score >= 55:
        grade = "B"
    elif score >= 35:
        grade = "C"
    else:
        grade = "D"

    reasons = []
    reasons.append(budget.reason)
    if intent_hits:
        reasons.append(f"Intent signals: {', '.join(intent_hits[:4])}.")
    if authority_hits:
        reasons.append(f"Authority signals: {', '.join(authority_hits[:3])}.")
    if urgency_hits:
        reasons.append(f"Urgency signals: {', '.join(urgency_hits[:3])}.")
    if negative_hits:
        reasons.append(f"Friction signals: {', '.join(negative_hits[:3])}.")
    if scope_mismatch:
        reasons.append(
            "Scope-budget mismatch: broad delivery scope plus budget-constrained language; score reduced by 40 and blocked."
        )
    if missing_fields:
        reasons.append(f"Missing fields: {', '.join(missing_fields)}.")

    return ScoringResult(
        qualified=qualified,
        score=score,
        grade=grade,
        budget=budget,
        recommended_service="High-value Discovery Call",
        next_action=next_action,
        reasons=reasons[:12],
        missing_fields=missing_fields[:8],
    )
