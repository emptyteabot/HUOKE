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


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LOG_PATH = PROJECT_ROOT / "sales" / "copy_gate_runs.jsonl"

DEFAULT_BASE_URL = "https://geekspace.cloud/v1"
DEFAULT_MODEL = "gpt-5.5"

RiskLevel = Literal["low", "medium", "high"]
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
        mode="before",
    )
    @classmethod
    def _coerce_text(cls, value: object) -> str:
        return "" if value is None else str(value).strip()

    @field_validator("risk_reasons", "personalization_notes", mode="before")
    @classmethod
    def _coerce_list(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return [str(value).strip()] if str(value).strip() else []


SYSTEM_PROMPT = """
你是 LeadPulse 的实时私信话术闸门，不是普通文案助手。

你的目标：
1. 判断当前这条小红书/抖音/微博/Reddit 私信是否应该继续发。
2. 如果应该发，生成最功利但像真人的短话术，目标是拿到“看样本/确认方向/继续聊”的许可。
3. 如果不该发，必须拦截，并说明原因。

硬性安全边界：
- 不写站外导流、微信、手机号、网站链接，除非对方明确主动索要。
- 不写价格、夸大转化率、保证成交、批量轰炸、灰产抓取、绕风控、自动私信。
- 不冒充客户、学生、老板、平台官方或对方熟人。
- 不使用威胁、羞辱、制造焦虑、强压式话术。
- 不发送长段营销软文。首轮和跟进优先 40-90 个中文字符，最多 160 个中文字符。
- 如果当前上下文已经刚发过样本或对方只是给了另一个账号，不要急着追击；低频比多发更重要。
- 只能描述“整理公开平台上主动表达需求的帖子/评论线索”，不能暗示拿到隐私数据。

商业方向：
- LeadPulse 是 AI 驱动的线索供应商，只交付能跟进的高意向客户。
- 当前只围绕小红书、抖音、X/Twitter、Reddit 的公开内容做意图线索整理。
- 目标客户包括：雅思/留学机构、跨境出海企业、外贸/跨境电商代运营、出海营销服务商、AI 初创、B2B SaaS、独立开发者、高客单价服务商。
- 话术要直接讲买方收益：每天/每批拿到可跟进的公开需求线索、节省筛选时间、减少无效线索。
- 但不能写未经证实的转化率或收入承诺。

输出要求：
只输出一个严格 JSON 对象，必须匹配：
{
  "should_send": bool,
  "risk_level": "low" | "medium" | "high",
  "risk_reasons": [string],
  "intent_stage": "first_touch" | "clarify_offer" | "sample_permission" | "sample_delivery" | "follow_up" | "objection_reply" | "do_not_reply",
  "recommended_action": string,
  "message_text": string,
  "do_not_send_reason": string,
  "commercial_angle": string,
  "personalization_notes": [string],
  "follow_up_after_minutes": int,
  "confidence": int
}
""".strip()


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

任务：
请基于以下上下文实时判断是否应该发，以及应该发什么。不能复用模板硬发，必须结合风险上下文和对方状态。

平台：{args.platform}
目标账号：{args.prospect_name}
行业/赛道：{args.industry}
当前阶段：{args.stage}

目标主页/业务上下文：
{args.profile_context}

已有聊天上下文：
{args.chat_context}

线索证据/可交付样本上下文：
{args.lead_evidence}

操作者意图：
{args.user_intent}

附加上下文文件：
{file_context}

请特别判断：
- 现在继续发会不会污染账号或显得骚扰？
- 这人是买方、服务商、转介绍人，还是同行？
- 如果要发，话术是否足够短、具体、低风险、能让对方自然接球？
- 如果不该发，是等待、换目标、还是只记录线索？
""".strip()


def extract_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
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


def build_client(args: argparse.Namespace) -> OpenAI:
    api_key = os.getenv(args.api_key_env) or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(f"Missing {args.api_key_env} or OPENAI_API_KEY")
    return OpenAI(api_key=api_key, base_url=args.base_url.rstrip("/"))


def response_content(response: Any) -> str:
    if isinstance(response, str):
        return response

    def _choice_content(choice: Any) -> str:
        if isinstance(choice, dict):
            message = choice.get("message") or {}
            if isinstance(message, dict):
                content = message.get("content")
            else:
                content = getattr(message, "content", None)
        else:
            message = getattr(choice, "message", None)
            content = getattr(message, "content", None)
        if isinstance(content, str):
            return content
        if content is not None:
            return json.dumps(content, ensure_ascii=False)
        return ""

    if isinstance(response, dict):
        choices = response.get("choices") or []
        if choices:
            content = _choice_content(choices[0])
            if content:
                return content
        if isinstance(response.get("content"), str):
            return str(response["content"])
        return json.dumps(response, ensure_ascii=False)

    choices = getattr(response, "choices", None)
    if choices:
        content = _choice_content(choices[0])
        if content:
            return content
    return str(response)


def decide(args: argparse.Namespace) -> CopyGateDecision:
    client = build_client(args)
    response = client.chat.completions.create(
        model=args.model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(args)},
        ],
    )
    content = response_content(response) or "{}"
    try:
        return CopyGateDecision.model_validate_json(content)
    except ValidationError:
        return CopyGateDecision.model_validate(extract_json(content))


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
