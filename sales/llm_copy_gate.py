#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError, field_validator

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LOG_PATH = PROJECT_ROOT / "sales" / "copy_gate_runs.jsonl"

DEFAULT_BASE_URL = "https://geekspace.cloud/v1"
DEFAULT_MODEL = "gpt-5.5"

RiskLevel = Literal["low", "medium", "high"]
ProspectType = Literal[
    "buyer",
    "service_provider",
    "channel",
    "peer_competitor",
    "consumer",
    "unknown",
]
EvidenceStrength = Literal["none", "weak", "medium", "strong"]
IntentStage = Literal[
    "first_touch",
    "clarify_offer",
    "sample_permission",
    "sample_delivery",
    "follow_up",
    "objection_reply",
    "do_not_reply",
]


class CopyGateDecision(BaseModel):
    should_send: bool
    risk_level: RiskLevel
    risk_reasons: list[str] = Field(default_factory=list)
    intent_stage: IntentStage
    context_understanding: str = ""
    prospect_type: ProspectType = "unknown"
    evidence_strength: EvidenceStrength = "none"
    sample_fit: EvidenceStrength = "none"
    missing_context: list[str] = Field(default_factory=list)
    recommended_action: str
    message_text: str = ""
    do_not_send_reason: str = ""
    commercial_angle: str = ""
    personalization_notes: list[str] = Field(default_factory=list)
    follow_up_after_minutes: int = Field(default=0, ge=0, le=10080)
    confidence: int = Field(default=0, ge=0, le=100)

    @field_validator(
        "recommended_action",
        "message_text",
        "do_not_send_reason",
        "commercial_angle",
        "context_understanding",
        mode="before",
    )
    @classmethod
    def _coerce_text(cls, value: object) -> str:
        return "" if value is None else str(value).strip()

    @field_validator("risk_reasons", "personalization_notes", "missing_context", mode="before")
    @classmethod
    def _coerce_list(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return [str(value).strip()] if str(value).strip() else []


SYSTEM_PROMPT = """
你是 LeadPulse 的实时私信安全与商业意图闸门，不是普通文案助手。

你的任务：
1. 判断当前目标是否值得继续触达。
2. 先用上下文判断：这个人是谁、是不是买方、具体痛点是什么、样本是否匹配、缺哪些证据。
3. 如果应该触达，生成最短、最像真人、最功利但低风险的话术，目标只是拿到“可以发样本/继续聊”的许可。
4. 如果不应该触达，必须拦截，并说明原因。

LeadPulse 定位：
- AI 驱动的高意向线索供应商。
- 只交付能跟进的公开需求线索，不承诺成交，不卖软件登录，不卖爬虫。
- 当前重点来源：小红书、抖音、X/Twitter、Reddit 的公开内容。
- 当前重点客户：雅思/留学机构、跨境出海企业、B2B SaaS、AI 初创、独立开发者、高客单价服务商、咨询/培训/代运营等需要客户但不卖获客工具的人。

硬拦截：
- 如果对方主要卖获客、AI 获客、外贸获客、询盘运营、线索名单、自动外呼、群控、增长工具、数据抓取、爬虫、客户开发系统，默认判定为同行/替代品/竞争对手。
- 同行型账号不能首触达，除非当前聊天里对方明确主动索要合作或样本。
- 不要把普通学生、普通消费者、纯内容号、渠道号、同行顾问错当成 LeadPulse 买家。

高质量目标必须同时满足：
- 是直客或高客单服务提供方，而不是同行。
- 有明确商业场景和持续获客需求。
- 近期内容或主页能看出正在承接业务。
- 对公开需求样本有可能立刻判断价值。

上下文先行硬规则：
- 没有足够上下文就不能发。至少要有：主页/帖子/评论/聊天记录中的一条具体事实，以及可交付样本或当前回复上下文。
- 你必须先在 `context_understanding` 中用一句话说明：目标身份 + 当前痛点 + 为什么样本匹配或不匹配。
- `prospect_type` 必须分类为 buyer/service_provider/channel/peer_competitor/consumer/unknown。
- 首触达或样本许可阶段，如果 `evidence_strength` 不是 medium/strong，必须 should_send=false。
- 首触达或样本许可阶段，如果 `sample_fit` 不是 medium/strong，必须 should_send=false。
- 如果缺帖子正文、评论区、主页身份、最近时间、真实样本号、聊天上下文，写进 `missing_context`，并倾向拦截。
- 不允许基于行业标签脑补话术；必须从输入上下文中引用具体事实。

LeadPulse 自用筛选必须更严：
- 优先放行最近 90 天内的线索；超过 120 天且没有新的业务承接证据，默认不首触达。
- 必须看到具体痛点：缺客户、招生难、没有订单、询盘质量差、广告成本高、销售转化低、找不到第一批用户。
- 只发给会购买线索的人，不发给讲获客方法的人；教程号、课程号、知识博主、增长顾问、外贸获客顾问默认拦截。
- 同一轮触达要保证行业多样性；如果已经连续触达同一行业，优先建议切到外贸工厂、AI/独立开发、B2B SaaS、雅思招生、跨境电商代运营等其他真实买方。
- 如果证据里只有泛泛内容、点赞高但没有可跟进痛点，宁可拦截，也不要污染账号。
- 如果操作者提供了真实样本小红书号/公开帖证据，优先把 1-2 条最贴合对方行业的样本压缩进文案。
- 带样本时只写公开账号号/公开需求摘要，不写手机号、微信号、私信内容、隐私信息。
- 样本必须和目标业务强相关；如果样本不匹配，宁可不发，也不要用不相关样本凑数。
- 决策权弱的员工号默认降级为 medium risk；除非样本高度匹配且语气只请求“看看是否对口”，否则建议换老板级目标。
- P0 触达必须优先满足：最近 30 天、有老板/负责人/创始人/团队经营者身份、明确花钱获客或明确营收/成交压力、评论区能补强身份或需求、能配到至少 1 条真实公开样本号。
- 员工抱怨、刚入行小白、求职/招人、泛创业搭子、教程干货、流量博主，即使痛点强，也只能进入样本池，不能作为最高质量触达目标。
- 对外贸/跨境方向，优先选择已经在投 Google/TikTok/社媒广告、已有独立站/阿里国际站/老客户、明确询盘少或质量差的老板/负责人。
- 对 AI/SaaS/独立开发方向，优先选择已上线产品、有付费/试用/转化问题、服务 B 端或高客单客户的人；纯玩具 App、个人练手项目默认拦截。

平台安全边界：
- 首轮不写微信、手机号、网站链接、价格、付款、转化率、保证成交。
- 不写“抓取私信/绕风控/批量轰炸/自动私信”等高风险表达。
- 不冒充客户、学生、平台官方、熟人。
- 不威胁、不焦虑压迫、不长篇软广。
- 首轮优先 40-90 个中文字，最多 160 个中文字。
- 只说“整理公开平台上主动表达需求的帖子/评论线索”，不能暗示拿到非公开数据。

人话与反伪人规则：
- message_text 必须像真人临时打出来的话，而不是 SaaS 销售模板。
- 首句必须回应一个目标上下文里的具体事实、原话、数字或场景；如果上下文没有具体事实，宁可拦截。
- 不要开头写“看到你在做/我这边整理/方便的话/要不要先发你3条脱敏样本/值不值得聊/是否对口”等模板句式。
- 首轮尽量 1-2 句，35-85 个中文字符；越像熟人低压提醒越好。
- 不要自称“LeadPulse”或“我们”，除非对方已经问你是谁；默认用“我”。
- 少用抽象词：高意向、公开平台、主动表达需求、线索供应商、脱敏、B端、样本方向、精准获客。能用具体场景就不用概念。
- 好文案结构：对方具体痛点/数字 -> 你手里有同类可核验样本 -> 问一句是否要看。
- 示例风格：
  * “你那条4月广告花了不到4000、询盘不到10个，我看着挺像线索质量问题。我手里有几条同类找供应商的公开帖，要不要贴两条你判断下？”
  * “你说独立老师招生累，这个点我懂。我最近整理到几条学生主动找雅思一对一的帖子，要不要我先贴两条给你看？”
  * “你说缺靠谱销售和小B客户资源，我不跟你聊工具。我手里有几条企业在找AI数字人/GEO服务的公开需求，要不要先看两条？”
- 错误风格：
  * “我这边整理公开平台上主动表达需求的高意向线索，方便发3条脱敏样本看看是否对口吗？”
  * “看到你们在做跨境出海，我是AI驱动的线索供应商，可以提供精准获客。”
  * “如果质量能用，后续可以每天整理一批名单。”

输出要求：
只输出一个严格 JSON 对象，必须匹配：
{
  "should_send": bool,
  "risk_level": "low" | "medium" | "high",
  "risk_reasons": [string],
  "intent_stage": "first_touch" | "clarify_offer" | "sample_permission" | "sample_delivery" | "follow_up" | "objection_reply" | "do_not_reply",
  "context_understanding": string,
  "prospect_type": "buyer" | "service_provider" | "channel" | "peer_competitor" | "consumer" | "unknown",
  "evidence_strength": "none" | "weak" | "medium" | "strong",
  "sample_fit": "none" | "weak" | "medium" | "strong",
  "missing_context": [string],
  "recommended_action": string,
  "message_text": string,
  "do_not_send_reason": string,
  "commercial_angle": string,
  "personalization_notes": [string],
  "follow_up_after_minutes": int,
  "confidence": int
}
""".strip()


ROBOTIC_PHRASES = [
    "我这边整理",
    "我们整理",
    "公开平台上主动",
    "主动表达需求",
    "高意向线索",
    "脱敏样本",
    "3条脱敏",
    "发你3条",
    "发3条",
    "看看方向",
    "是否对口",
    "值不值得聊",
    "方便的话",
    "LeadPulse",
    "线索供应商",
    "精准获客",
    "不卖软件",
    "后续可以",
]


def style_issues(message: str) -> list[str]:
    text = message.strip()
    issues: list[str] = []
    if not text:
        return issues
    hits = [phrase for phrase in ROBOTIC_PHRASES if phrase in text]
    if len(hits) >= 2:
        issues.append("too_many_template_phrases: " + ", ".join(hits[:5]))
    if text.startswith(("看到你在做", "看你在做", "我这边", "我们这边", "方便的话")):
        issues.append("robotic_opening")
    if "公开平台" in text and ("高意向" in text or "主动表达" in text or "线索" in text):
        issues.append("abstract_sales_language")
    if len(text) > 180:
        issues.append("too_long_for_first_touch")
    if text.count("，") + text.count("。") + text.count("；") >= 5:
        issues.append("too_many_clauses")
    return issues


def supplied_context(args: argparse.Namespace) -> str:
    pieces = [
        args.profile_context,
        args.chat_context,
        args.lead_evidence,
        args.user_intent,
    ]
    for raw in args.context_file:
        path = Path(raw).expanduser()
        if path.exists():
            try:
                pieces.append(path.read_text(encoding="utf-8", errors="replace")[:2000])
            except OSError:
                pass
    return "\n".join(piece.strip() for piece in pieces if piece and piece.strip())


def context_gate_issues(args: argparse.Namespace, decision: CopyGateDecision) -> list[str]:
    issues: list[str] = []
    context_text = supplied_context(args)
    stage = (args.stage or "").lower()
    context_required_stages = {"opener", "first_touch", "sample_permission", "sample_delivery", "reply", "follow_up", "objection"}
    sample_required_stages = {"opener", "first_touch", "sample_permission", "sample_delivery"}

    if stage in context_required_stages and len(context_text) < 40:
        issues.append("insufficient_supplied_context")
    if not decision.context_understanding.strip():
        issues.append("missing_context_understanding")
    if decision.prospect_type in {"unknown", "consumer", "peer_competitor"}:
        issues.append(f"bad_prospect_type:{decision.prospect_type}")
    if decision.evidence_strength in {"none", "weak"}:
        issues.append(f"weak_evidence:{decision.evidence_strength}")
    if stage in sample_required_stages and decision.sample_fit in {"none", "weak"}:
        issues.append(f"weak_sample_fit:{decision.sample_fit}")
    if stage in sample_required_stages and not args.lead_evidence.strip():
        issues.append("missing_lead_evidence_for_first_touch")
    if decision.confidence < 78:
        issues.append(f"low_confidence:{decision.confidence}")
    return issues


def block_decision(decision: CopyGateDecision, reason: str, action: str) -> CopyGateDecision:
    decision.should_send = False
    decision.risk_level = "high"
    decision.intent_stage = "do_not_reply"
    decision.message_text = ""
    decision.do_not_send_reason = reason
    decision.recommended_action = action
    return decision


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LeadPulse LLM copy gate for safe manual outreach.")
    parser.add_argument("--platform", default="小红书")
    parser.add_argument("--prospect-name", default="")
    parser.add_argument("--industry", default="")
    parser.add_argument("--stage", default="reply", help="opener, reply, sample_delivery, follow_up, objection")
    parser.add_argument("--profile-context", default="")
    parser.add_argument("--chat-context", default="")
    parser.add_argument("--lead-evidence", default="")
    parser.add_argument("--user-intent", default="")
    parser.add_argument("--context-file", action="append", default=[], help="UTF-8 text file to append as context. Can repeat.")
    parser.add_argument("--base-url", default=os.getenv("GEEKSPACE_BASE_URL") or os.getenv("OPENAI_BASE_URL") or DEFAULT_BASE_URL)
    parser.add_argument("--model", default=os.getenv("GEEKSPACE_MODEL") or os.getenv("OPENAI_MODEL") or DEFAULT_MODEL)
    parser.add_argument("--api-key-env", default="GEEKSPACE_API_KEY")
    parser.add_argument("--log-path", default=str(DEFAULT_LOG_PATH))
    parser.add_argument("--no-log", action="store_true")
    return parser.parse_args()


def read_context_files(paths: list[str]) -> str:
    chunks: list[str] = []
    for raw in paths:
        path = Path(raw).expanduser()
        try:
            chunks.append(f"\n--- context file: {path} ---\n{path.read_text(encoding='utf-8', errors='replace')[:6000]}")
        except OSError as exc:
            chunks.append(f"\n--- context file read error: {path}: {exc} ---")
    return "\n".join(chunks)


def build_user_prompt(args: argparse.Namespace) -> str:
    file_context = read_context_files(args.context_file)
    return f"""
当前时间：{datetime.now().isoformat(timespec="seconds")}

请基于下面上下文实时判断是否应该发，以及应该发什么。不要复用模板硬发，必须结合目标身份、平台风险和聊天状态。

平台：{args.platform}
目标账号：{args.prospect_name}
行业/赛道：{args.industry}
当前阶段：{args.stage}

目标主页/业务上下文：
{args.profile_context}

已有聊天上下文：
{args.chat_context}

可交付样本/线索证据：
{args.lead_evidence}

操作者意图：
{args.user_intent}

附加上下文文件：
{file_context}

特别判断：
- 这人是买方、服务商、渠道，还是同行？
- 是否近期、是否高客单、是否可能有获客预算？
- 现在继续发会不会显得骚扰或污染账号？
- 如果要发，给出一条短、具体、留站内、能让对方自然接球的话。
- 如果不该发，建议换目标、等待，或只记录不触达。
""".strip()


def extract_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise ValueError("LLM output is not a JSON object")
    return payload


def unwrap_completion_payload(payload: dict[str, Any]) -> str | None:
    """Some OpenAI-compatible gateways return a nested completion object as content."""
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    first = choices[0]
    if not isinstance(first, dict):
        return None
    message = first.get("message")
    if not isinstance(message, dict):
        return None
    content = message.get("content")
    if isinstance(content, str):
        return content
    if content is not None:
        return json.dumps(content, ensure_ascii=False)
    return None


def build_client(args: argparse.Namespace) -> OpenAI:
    api_key = os.getenv(args.api_key_env) or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(f"Missing {args.api_key_env} or OPENAI_API_KEY")
    return OpenAI(api_key=api_key, base_url=args.base_url.rstrip("/"))


def response_content(response: Any) -> str:
    if isinstance(response, str):
        return response

    if isinstance(response, dict):
        nested = unwrap_completion_payload(response)
        if nested:
            return nested
        if isinstance(response.get("content"), str):
            return str(response["content"])
        return json.dumps(response, ensure_ascii=False)

    choices = getattr(response, "choices", None)
    if choices:
        message = getattr(choices[0], "message", None)
        content = getattr(message, "content", None)
        if isinstance(content, str):
            return content
        if content is not None:
            return json.dumps(content, ensure_ascii=False)

    if hasattr(response, "model_dump"):
        nested = unwrap_completion_payload(response.model_dump())
        if nested:
            return nested
        return json.dumps(response.model_dump(), ensure_ascii=False)

    return str(response)


def validate_decision(raw_content: str) -> CopyGateDecision:
    content = raw_content.strip() or "{}"
    try:
        return CopyGateDecision.model_validate_json(content)
    except ValidationError:
        payload = extract_json(content)
        nested = unwrap_completion_payload(payload)
        if nested:
            return validate_decision(nested)
        return CopyGateDecision.model_validate(payload)


def decide(args: argparse.Namespace) -> CopyGateDecision:
    client = build_client(args)
    response = client.chat.completions.create(
        model=args.model,
        temperature=0.35,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(args)},
        ],
    )
    decision = validate_decision(response_content(response))
    context_issues = context_gate_issues(args, decision) if decision.should_send else []
    if context_issues:
        return block_decision(
            decision,
            "Context-first gate blocked send: " + "; ".join(context_issues),
            "Do not paste. Add real profile/post/comment/chat context plus matched public sample evidence, then rerun the LLM gate.",
        )

    issues = style_issues(decision.message_text) if decision.should_send else []
    if not issues:
        return decision

    retry_prompt = f"""
上一版 message_text 被拦截，因为它像模板/伪人：
{json.dumps(issues, ensure_ascii=False)}

上一版 JSON：
{decision.model_dump_json(ensure_ascii=False)}

请重新输出完整 JSON。要求：
- message_text 必须像真人根据当前上下文临时写的私信。
- 第一句引用目标的具体痛点、数字、原话或场景。
- 禁止使用这些模板词：我这边整理、公开平台上主动、主动表达需求、高意向线索、脱敏样本、3条脱敏、看看方向、是否对口、值不值得聊、方便的话、精准获客。
- 不要介绍 LeadPulse，不要讲服务定义，不要写宣传腔。
- 如果上下文不足以写出具体人话，should_send=false。
""".strip()
    retry = client.chat.completions.create(
        model=args.model,
        temperature=0.45,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(args)},
            {"role": "assistant", "content": decision.model_dump_json(ensure_ascii=False)},
            {"role": "user", "content": retry_prompt},
        ],
    )
    retry_decision = validate_decision(response_content(retry))
    retry_context_issues = context_gate_issues(args, retry_decision) if retry_decision.should_send else []
    if retry_context_issues:
        return block_decision(
            retry_decision,
            "Context-first gate blocked rewrite: " + "; ".join(retry_context_issues),
            "Do not paste. Add real profile/post/comment/chat context plus matched public sample evidence, then rerun the LLM gate.",
        )

    retry_issues = style_issues(retry_decision.message_text) if retry_decision.should_send else []
    if not retry_issues:
        return retry_decision

    return block_decision(
        retry_decision,
        "LLM copy remained too template-like after rewrite; blocked to avoid polluting the account. "
        + "; ".join(retry_issues),
        "Do not paste this message. Add more concrete post/comment context or choose a sharper prospect.",
    )


def append_log(path: Path, args: argparse.Namespace, decision: CopyGateDecision) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "platform": args.platform,
        "prospect_name": args.prospect_name,
        "industry": args.industry,
        "stage": args.stage,
        "decision": decision.model_dump(mode="json"),
    }
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def main() -> int:
    args = parse_args()
    decision = decide(args)
    if not args.no_log:
        append_log(Path(args.log_path), args, decision)
    print(decision.model_dump_json(indent=2))
    if not decision.should_send:
        return 2
    if decision.risk_level == "high":
        return 3
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(1)
