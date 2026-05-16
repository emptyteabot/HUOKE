from __future__ import annotations

import importlib.util
import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

from .schemas import LeadContact, LeadProfile, ScoringRequest, ScoringResult, StrictModelConfig
from .scoring import score_lead


EMAIL_RE = re.compile(r"(?P<email>[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})", re.IGNORECASE)
PHONE_RE = re.compile(r"(?P<phone>\+?\d[\d\s().-]{7,}\d)")
HEADING_RE = re.compile(r"^\s*#\s+(?P<title>.+?)\s*$", re.MULTILINE)

FRONT_MATTER_ALIASES = {
    "title": ("title", "name", "headline"),
    "url": ("url", "link", "source_url", "original_url"),
    "author": ("author", "user", "username", "screen_name", "creator"),
    "source": ("source", "platform", "site", "channel"),
    "created_at": ("created_at", "created", "published", "published_at", "date", "time"),
    "company": ("company", "org", "organization", "account"),
}


class FeedgrabMarkdownInput(BaseModel):
    model_config = StrictModelConfig

    markdown: str = Field(min_length=1, max_length=60000)
    source: str = Field(default="feedgrab", max_length=80)
    url: str = Field(default="", max_length=2000)
    metadata: dict[str, str] = Field(default_factory=dict)


class FeedgrabIngestRequest(BaseModel):
    model_config = StrictModelConfig

    documents: list[FeedgrabMarkdownInput] = Field(min_length=1, max_length=50)
    min_budget_usd: float | None = Field(default=None, ge=0)
    max_results: int = Field(default=10, ge=1, le=50)


class PublicSourceItem(BaseModel):
    model_config = StrictModelConfig

    source: str = Field(min_length=1, max_length=80)
    url: str = Field(default="", max_length=2000)
    author: str = Field(default="", max_length=160)
    title: str = Field(default="", max_length=240)
    body: str = Field(min_length=1, max_length=20000)
    created_at: datetime | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


class PublicSourceScoreRequest(BaseModel):
    model_config = StrictModelConfig

    items: list[PublicSourceItem] = Field(min_length=1, max_length=50)
    min_budget_usd: float | None = Field(default=None, ge=0)
    max_results: int = Field(default=10, ge=1, le=50)


class PublicSourceScoreResult(BaseModel):
    model_config = StrictModelConfig

    item: PublicSourceItem
    lead: LeadProfile
    scoring: ScoringResult
    qualified_signal: bool
    meeting_ready: bool
    charge_event: Literal["noise", "high_value"]
    next_step: str = Field(min_length=1, max_length=500)


class PublicSourceIngestResult(BaseModel):
    model_config = StrictModelConfig

    provider: str
    received: int
    scored: int
    qualified_signal_count: int
    meeting_ready_count: int
    qualified_meetings: list[PublicSourceScoreResult]
    results: list[PublicSourceScoreResult]


class SourceProvidersResult(BaseModel):
    model_config = StrictModelConfig

    providers: dict[str, dict[str, Any]]


class ScraplingFetchRequest(BaseModel):
    model_config = StrictModelConfig

    url: HttpUrl
    source: str = Field(default="scrapling", max_length=80)
    selector: str = Field(default="", max_length=500)
    mode: Literal["fetcher", "dynamic", "stealthy"] = "fetcher"
    min_budget_usd: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _avoid_unsupported_automation_flags(self) -> "ScraplingFetchRequest":
        # Keep the public API focused on extraction. Operator-specific browser,
        # proxy, and challenge settings belong in deployment config, not payloads.
        return self


def provider_status() -> SourceProvidersResult:
    return SourceProvidersResult(
        providers={
            "feedgrab": {
                "status": "ready",
                "ingest_endpoint": "/api/v2/sources/feedgrab/ingest",
                "interface": "markdown_with_yaml_front_matter",
                "recommended_role": "primary public-source pump for X, Reddit, HackerNews, YouTube, RSS, and forum URLs",
            },
            "scrapling": {
                "status": "ready" if _module_available("scrapling") else "optional_dependency_missing",
                "fetch_endpoint": "/api/v2/sources/scrapling/fetch",
                "install": 'pip install "scrapling[all]" && scrapling install',
                "recommended_role": "generic URL and non-standard forum extraction before LeadPulse scoring",
            },
        }
    )


def ingest_feedgrab_markdown(request: FeedgrabIngestRequest) -> PublicSourceIngestResult:
    items = [normalize_feedgrab_markdown(document) for document in request.documents]
    return score_public_source_items(
        PublicSourceScoreRequest(
            items=items,
            min_budget_usd=request.min_budget_usd,
            max_results=request.max_results,
        ),
        provider="feedgrab",
    )


def score_public_source_items(
    request: PublicSourceScoreRequest,
    provider: str = "public_sources",
) -> PublicSourceIngestResult:
    results: list[PublicSourceScoreResult] = []
    for item in request.items:
        lead = public_source_to_lead(item)
        scoring = score_lead(ScoringRequest(lead=lead, min_budget_usd=request.min_budget_usd))
        qualified_signal = scoring.budget.qualified and scoring.score >= 55
        meeting_ready = scoring.qualified
        charge_event: Literal["noise", "high_value"] = "high_value" if qualified_signal else "noise"
        if meeting_ready:
            next_step = "Push to CRM and offer a discovery-call slot."
        elif qualified_signal:
            next_step = "Route to sales for contact capture, then fetch availability."
        else:
            next_step = "Keep as noise or nurture; do not spend sales time."
        results.append(
            PublicSourceScoreResult(
                item=item,
                lead=lead,
                scoring=scoring,
                qualified_signal=qualified_signal,
                meeting_ready=meeting_ready,
                charge_event=charge_event,
                next_step=next_step,
            )
        )

    results.sort(
        key=lambda result: (
            result.meeting_ready,
            result.qualified_signal,
            result.scoring.score,
            result.scoring.budget.evidence.normalized_usd or 0,
        ),
        reverse=True,
    )
    limited = results[: request.max_results]
    qualified_meetings = [result for result in limited if result.qualified_signal]
    return PublicSourceIngestResult(
        provider=provider,
        received=len(request.items),
        scored=len(results),
        qualified_signal_count=sum(1 for result in results if result.qualified_signal),
        meeting_ready_count=sum(1 for result in results if result.meeting_ready),
        qualified_meetings=qualified_meetings,
        results=limited,
    )


def normalize_feedgrab_markdown(document: FeedgrabMarkdownInput) -> PublicSourceItem:
    front_matter, body = _split_front_matter(document.markdown)
    metadata = {**front_matter, **document.metadata}
    title = _first_metadata(metadata, "title") or _first_heading(body) or "Untitled public signal"
    url = document.url or _first_metadata(metadata, "url")
    source = document.source or _first_metadata(metadata, "source") or "feedgrab"
    author = _first_metadata(metadata, "author")
    created_at = _parse_datetime(_first_metadata(metadata, "created_at"))
    cleaned_body = _clean_body(body)
    if not cleaned_body:
        cleaned_body = title
    return PublicSourceItem(
        source=source[:80],
        url=url[:2000],
        author=author[:160],
        title=title[:240],
        body=cleaned_body[:20000],
        created_at=created_at,
        metadata={str(k)[:80]: str(v)[:500] for k, v in metadata.items()},
    )


def public_source_to_lead(item: PublicSourceItem) -> LeadProfile:
    combined = "\n".join(
        part
        for part in [
            item.title,
            item.body,
            " ".join(f"{key}: {value}" for key, value in item.metadata.items()),
        ]
        if part
    )
    email = _first_match(EMAIL_RE, combined, "email")
    phone = _first_match(PHONE_RE, combined, "phone")
    company = _first_metadata(item.metadata, "company") or item.title
    context = "\n".join(
        part
        for part in [
            f"Source: {item.source}",
            f"URL: {item.url}" if item.url else "",
            f"Title: {item.title}" if item.title else "",
            f"Author: {item.author}" if item.author else "",
            item.body,
        ]
        if part
    )
    return LeadProfile(
        contact=LeadContact(
            name=item.author,
            email=email,
            phone=phone,
            company=company[:160],
            source=item.source,
            external_id=item.url or item.title,
        ),
        context=context[:8000],
        declared_budget=combined[:240],
        desired_outcome=item.body[:800],
        decision_role=_infer_decision_role(combined),
        urgency=_infer_urgency(combined),
    )


def fetch_with_scrapling(request: ScraplingFetchRequest) -> PublicSourceIngestResult:
    if not _module_available("scrapling"):
        empty_item = PublicSourceItem(
            source=request.source,
            url=str(request.url),
            title="Scrapling is not installed",
            body='Install with: pip install "scrapling[all]" && scrapling install',
        )
        lead = public_source_to_lead(empty_item)
        scoring = score_lead(ScoringRequest(lead=lead, min_budget_usd=request.min_budget_usd))
        return PublicSourceIngestResult(
            provider="scrapling",
            received=1,
            scored=1,
            qualified_signal_count=0,
            meeting_ready_count=0,
            qualified_meetings=[],
            results=[
                PublicSourceScoreResult(
                    item=empty_item,
                    lead=lead,
                    scoring=scoring,
                    qualified_signal=False,
                    meeting_ready=False,
                    charge_event="noise",
                    next_step='Install Scrapling on the worker node: pip install "scrapling[all]" && scrapling install.',
                )
            ],
        )

    page = _scrapling_fetch(request)
    body = _extract_scrapling_text(page, request.selector)
    item = PublicSourceItem(
        source=request.source,
        url=str(request.url),
        title=_first_heading(body) or str(request.url),
        body=_clean_body(body) or str(request.url),
    )
    return score_public_source_items(
        PublicSourceScoreRequest(items=[item], min_budget_usd=request.min_budget_usd, max_results=1),
        provider="scrapling",
    )


def _module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def _split_front_matter(markdown: str) -> tuple[dict[str, str], str]:
    text = markdown.lstrip("\ufeff")
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, markdown

    closing_index = None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            closing_index = index
            break
    if closing_index is None:
        return {}, markdown

    metadata: dict[str, str] = {}
    for line in lines[1:closing_index]:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip().lower().replace("-", "_")
        value = value.strip().strip('"').strip("'")
        if key and value:
            metadata[key] = value
    return metadata, "\n".join(lines[closing_index + 1 :])


def _first_metadata(metadata: dict[str, str], canonical: str) -> str:
    for key in FRONT_MATTER_ALIASES.get(canonical, (canonical,)):
        value = metadata.get(key)
        if value:
            return str(value)
    return ""


def _first_heading(markdown: str) -> str:
    match = HEADING_RE.search(markdown)
    return match.group("title").strip() if match else ""


def _clean_body(body: str) -> str:
    compact = re.sub(r"\n{3,}", "\n\n", body.strip())
    compact = re.sub(r"[ \t]{2,}", " ", compact)
    return compact


def _parse_datetime(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _first_match(pattern: re.Pattern[str], text: str, group_name: str) -> str:
    match = pattern.search(text)
    return match.group(group_name).strip() if match else ""


def _infer_decision_role(text: str) -> str:
    lowered = text.lower()
    for term in ("founder", "ceo", "owner", "director", "vp", "head of", "i approve", "decision maker"):
        if term in lowered:
            return term
    return ""


def _infer_urgency(text: str) -> str:
    lowered = text.lower()
    for term in ("today", "tomorrow", "this week", "asap", "urgent", "immediately", "deadline"):
        if term in lowered:
            return term
    return ""


def _scrapling_fetch(request: ScraplingFetchRequest) -> Any:
    if request.mode == "fetcher":
        from scrapling.fetchers import Fetcher

        return Fetcher.get(str(request.url))
    if request.mode == "dynamic":
        from scrapling.fetchers import DynamicFetcher

        return DynamicFetcher.fetch(str(request.url), headless=True)

    from scrapling.fetchers import StealthyFetcher

    return StealthyFetcher.fetch(str(request.url), headless=True)


def _extract_scrapling_text(page: Any, selector: str) -> str:
    if selector:
        try:
            selected = page.css(selector)
            return _stringify_selection(selected)
        except Exception:
            return str(page)

    for candidate in ("body::text", "main::text", "article::text"):
        try:
            selected = page.css(candidate)
            text = _stringify_selection(selected)
            if text.strip():
                return text
        except Exception:
            continue
    text_attr = getattr(page, "text", "")
    if callable(text_attr):
        try:
            return str(text_attr())
        except Exception:
            return str(page)
    if text_attr:
        return str(text_attr)
    return str(page)


def _stringify_selection(selection: Any) -> str:
    if hasattr(selection, "getall"):
        return "\n".join(str(item) for item in selection.getall())
    if hasattr(selection, "get"):
        value = selection.get()
        return "" if value is None else str(value)
    if isinstance(selection, (list, tuple)):
        return "\n".join(str(item) for item in selection)
    return str(selection)
