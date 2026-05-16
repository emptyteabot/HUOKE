#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError, field_validator


class LeadIntentDecision(BaseModel):
    is_buyer: bool
    is_vendor_or_peer: bool
    pain_point_summary: str
    estimated_budget_signal: bool
    lead_score: int = Field(ge=0, le=100)
    buyer_role: str
    rejection_reason: str

    @field_validator("estimated_budget_signal", mode="before")
    @classmethod
    def _coerce_budget_signal(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        text = str(value).strip().lower()
        return text in {"true", "yes", "y", "1", "present", "strong"}

    @field_validator("pain_point_summary", "buyer_role", "rejection_reason", mode="before")
    @classmethod
    def _coerce_text(cls, value: object) -> str:
        return "" if value is None else str(value)


class QualifiedLeadResult(BaseModel):
    source: str
    source_url: str
    author: str
    post: str
    decision: LeadIntentDecision


TEST_POSTS = [
    {
        "source": "reddit",
        "source_url": "https://www.reddit.com/r/growmybusiness/comments/1sgz28m/anyone_here_actually_worked_with_a_reddit/",
        "author": "small business owner",
        "post": (
            "Small business owner here. Been looking into Reddit as a channel but it feels very "
            "different from everything else we've tried. For those who've tried working with a "
            "Reddit marketing agency, did it actually help or was it just another service that "
            "didn't deliver?"
        ),
    },
    {
        "source": "reddit",
        "source_url": "https://www.reddit.com/r/marketingagency/comments/1rvl7z6/how_to_find_clients/",
        "author": "agency operator",
        "post": (
            "At that time, I had a client who I was offering consulting services full time but now "
            "I want to scale my business and find new clients with a good ticket size - one time "
            "project or retainer basis. Experts and entrepreneurs here who have successfully made "
            "their agencies profitable and built a good team size, please guide me?"
        ),
    },
    {
        "source": "reddit",
        "source_url": "https://www.reddit.com/r/smallbusiness/comments/1sxu6en/i_am_having_outreach_problems/",
        "author": "B2B pipeline startup founder",
        "post": (
            "I am trying to start my own B2B Pipeline Acceleration business in the niche of "
            "Cybersecurity. I really struggle with Client Acquisition. Usually, I would go for "
            "small-mid Cybersecurity firms, because they are more open to actually replying."
        ),
    },
]


SYSTEM_PROMPT = (
    "You are a ruthless B2B lead qualifier. Your job is to read social posts and decide whether "
    "the author is a real buyer. Block ANY post where the author is selling a service, advertising "
    "a product, building a tool, recruiting, looking for a job, farming engagement, or asking peers "
    "for generic business advice without intent to buy. ONLY approve posts where the author is "
    "actively seeking to hire a service, buy a solution, evaluate vendors, or solve an urgent "
    "business pain point. Do not reward keywords. Judge role, intent, commercial context, and "
    "whether a sales conversation would be appropriate. Return only valid JSON matching the schema."
)


def build_client() -> tuple[OpenAI, str]:
    api_key = (
        os.getenv("HUNTER_API_KEY")
        or os.getenv("DEEPSEEK_API_KEY")
        or os.getenv("GEEKSPACE_API_KEY")
        or os.getenv("OPENAI_API_KEY")
    )
    if not api_key:
        raise RuntimeError("Missing HUNTER_API_KEY, DEEPSEEK_API_KEY, GEEKSPACE_API_KEY, or OPENAI_API_KEY")

    if os.getenv("HUNTER_BASE_URL"):
        base_url = os.getenv("HUNTER_BASE_URL")
    elif os.getenv("DEEPSEEK_API_KEY"):
        base_url = os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com/v1"
    elif os.getenv("GEEKSPACE_API_KEY"):
        base_url = os.getenv("GEEKSPACE_BASE_URL") or "https://geekspace.cloud/v1"
    else:
        base_url = os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1"

    model = (
        os.getenv("HUNTER_MODEL")
        or os.getenv("DEEPSEEK_MODEL")
        or os.getenv("GEEKSPACE_MODEL")
        or os.getenv("OPENAI_MODEL")
        or ("deepseek-chat" if os.getenv("DEEPSEEK_API_KEY") else "gpt-5.5")
    )
    return OpenAI(api_key=api_key, base_url=base_url), model


def score_post(client: OpenAI, model: str, row: dict[str, str]) -> LeadIntentDecision:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Return JSON with exactly these keys: "
                    "is_buyer, is_vendor_or_peer, pain_point_summary, estimated_budget_signal, "
                    "lead_score, buyer_role, rejection_reason.\n\n"
                    f"Author: {row.get('author', '')}\n"
                    f"Source: {row.get('source', '')}\n"
                    f"URL: {row.get('source_url', '')}\n"
                    f"Post: {row.get('post', '')}"
                ),
            },
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    try:
        return LeadIntentDecision.model_validate_json(content)
    except ValidationError:
        return LeadIntentDecision.model_validate(json.loads(content))


def main() -> int:
    client, model = build_client()
    for row in TEST_POSTS:
        decision = score_post(client, model, row)
        if decision.is_buyer and not decision.is_vendor_or_peer:
            print(
                QualifiedLeadResult(
                    source=row["source"],
                    source_url=row["source_url"],
                    author=row["author"],
                    post=row["post"],
                    decision=decision,
                ).model_dump_json(indent=2)
            )
            return 0
    print(json.dumps({"qualified": None}, ensure_ascii=False, indent=2))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
