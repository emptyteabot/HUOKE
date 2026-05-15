from __future__ import annotations

import json
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from . import __version__
from .booking import submit_booking
from .calendar import get_availability
from .config import settings
from .funnel import next_question
from .schemas import (
    AvailabilityRequest,
    AvailabilityResult,
    BookingRequest,
    BookingResult,
    HealthResult,
    JsonRpcError,
    JsonRpcRequest,
    JsonRpcResponse,
    NextQuestionRequest,
    NextQuestionResult,
    QualifyAndBookRequest,
    ScoringRequest,
    ScoringResult,
)
from .scoring import score_lead
from .tools import TOOL_DEFINITIONS, execute_tool


app = FastAPI(
    title="LeadPulse M2M Acquisition Gateway",
    version=__version__,
    description="A vertical MCP/REST backend for dynamic budget qualification, availability, and discovery-call booking.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _public_url(path: str) -> str:
    return f"{settings.site_url}{path}"


def _require_api_key(authorization: str | None = Header(default=None)) -> None:
    if not settings.api_key:
        return
    expected = f"Bearer {settings.api_key}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid LeadPulse M2M API key")


def discovery_document() -> dict[str, Any]:
    return {
        "name": settings.service_name,
        "version": __version__,
        "protocolVersion": "2025-11-25",
        "description": "LeadPulse V2 exposes one M2M pipeline: dynamic budget interview -> qualified budget -> availability -> discovery-call booking.",
        "transport": {
            "type": "streamable_http",
            "url": _public_url("/api/mcp"),
        },
        "capabilities": {
            "tools": True,
            "structuredOutput": True,
        },
        "endpoints": {
            "mcp": _public_url("/api/mcp"),
            "tools": _public_url("/api/v2/tools"),
            "scoring": _public_url("/api/v2/scoring"),
            "availability": _public_url("/api/v2/availability"),
            "booking": _public_url("/api/v2/booking"),
            "dynamicInterview": _public_url("/api/v2/funnel/next-question"),
        },
        "tools": TOOL_DEFINITIONS,
    }


@app.get("/health", response_model=HealthResult)
def health() -> HealthResult:
    return HealthResult(status="ok", service=settings.service_name, version=__version__)


@app.get("/.well-known/mcp.json")
def well_known_mcp() -> dict[str, Any]:
    return discovery_document()


@app.get("/api/v2/tools")
def list_tools(_: None = Depends(_require_api_key)) -> dict[str, Any]:
    return {"tools": TOOL_DEFINITIONS, "count": len(TOOL_DEFINITIONS)}


@app.post("/api/v2/scoring", response_model=ScoringResult)
def scoring(request: ScoringRequest, _: None = Depends(_require_api_key)) -> ScoringResult:
    return score_lead(request)


@app.post("/api/v2/funnel/next-question", response_model=NextQuestionResult)
def funnel_next_question(request: NextQuestionRequest, _: None = Depends(_require_api_key)) -> NextQuestionResult:
    return next_question(request)


@app.post("/api/v2/availability", response_model=AvailabilityResult)
def availability(request: AvailabilityRequest, _: None = Depends(_require_api_key)) -> AvailabilityResult:
    return get_availability(request)


@app.get("/api/v2/availability", response_model=AvailabilityResult)
def availability_get(
    timezone: str = settings.default_timezone,
    days: int = 7,
    duration_minutes: int = settings.discovery_duration_minutes,
    _: None = Depends(_require_api_key),
) -> AvailabilityResult:
    return get_availability(AvailabilityRequest(timezone=timezone, days=days, duration_minutes=duration_minutes))


@app.post("/api/v2/booking", response_model=BookingResult)
def booking(request: BookingRequest, _: None = Depends(_require_api_key)) -> BookingResult:
    return submit_booking(request)


@app.post("/api/v2/qualify-and-book")
def qualify_and_book(request: QualifyAndBookRequest, _: None = Depends(_require_api_key)) -> dict[str, Any]:
    return execute_tool("leadpulse.qualify_and_book", request.model_dump(mode="json", by_alias=True))


def _rpc_result(request_id: str | int | None, result: Any) -> JsonRpcResponse:
    return JsonRpcResponse(id=request_id, result=result)


def _rpc_error(request_id: str | int | None, code: int, message: str, data: Any | None = None) -> JsonRpcResponse:
    return JsonRpcResponse(id=request_id, error=JsonRpcError(code=code, message=message, data=data))


async def _handle_mcp(request: Request) -> Response:
    try:
        payload = await request.json()
        rpc = JsonRpcRequest.model_validate(payload)
    except ValidationError as exc:
        response = _rpc_error(None, -32600, "Invalid JSON-RPC request", exc.errors())
        return Response(response.model_dump_json(by_alias=True), media_type="application/json")
    except Exception as exc:
        response = _rpc_error(None, -32700, "Parse error", str(exc))
        return Response(response.model_dump_json(by_alias=True), media_type="application/json")

    if rpc.id is None and rpc.method.startswith("notifications/"):
        return Response(status_code=202)

    try:
        if rpc.method == "initialize":
            result = {
                "protocolVersion": "2025-11-25",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": settings.service_name, "version": __version__},
            }
            response = _rpc_result(rpc.id, result)
        elif rpc.method == "tools/list":
            response = _rpc_result(rpc.id, {"tools": TOOL_DEFINITIONS})
        elif rpc.method == "tools/call":
            name = str(rpc.params.get("name") or "")
            arguments = rpc.params.get("arguments") or {}
            if not isinstance(arguments, dict):
                raise ValueError("tools/call arguments must be an object")
            structured = execute_tool(name, arguments)
            response = _rpc_result(
                rpc.id,
                {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(structured, ensure_ascii=False, sort_keys=True),
                        }
                    ],
                    "structuredContent": structured,
                    "isError": False,
                },
            )
        else:
            response = _rpc_error(rpc.id, -32601, f"Method not found: {rpc.method}")
    except KeyError as exc:
        response = _rpc_error(rpc.id, -32602, str(exc))
    except ValidationError as exc:
        response = _rpc_error(rpc.id, -32602, "Tool arguments failed schema validation", exc.errors())
    except Exception as exc:
        response = _rpc_error(rpc.id, -32000, "Tool execution failed", str(exc))

    return Response(response.model_dump_json(by_alias=True), media_type="application/json")


@app.post("/mcp")
async def mcp(request: Request, _: None = Depends(_require_api_key)) -> Response:
    return await _handle_mcp(request)


@app.post("/api/mcp")
async def mcp_api(request: Request, _: None = Depends(_require_api_key)) -> Response:
    return await _handle_mcp(request)
