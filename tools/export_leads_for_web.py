import argparse
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import sys


def _to_int(value, default=0):
    try:
        return int(float(str(value).strip()))
    except Exception:
        return default


def _clean_author(author: str) -> str:
    a = str(author or "").strip()
    if not a:
        return ""
    a = re.sub(r"\s+(19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$", "", a).strip()
    a = re.sub(r"\s+\d+\s*天前$", "", a).strip()
    a = re.sub(r"\s+\d+\s*小时前$", "", a).strip()
    return a


def _contains_any(text: str, terms: List[str]) -> bool:
    text = str(text or "").lower()
    return any(str(term).lower() in text for term in terms)


def _score_intent(text: str, intent_terms: List[str]) -> Dict:
    t = str(text or "").lower()
    hit = sum(1 for x in intent_terms if str(x).lower() in t)
    urgent = _contains_any(t, ["急", "ddl", "deadline", "来不及", "本周", "这周", "马上", "尽快"])
    question = _contains_any(t, ["?", "？", "请问", "有没有", "哪家", "怎么", "如何"])
    first_person = _contains_any(t, ["我", "本人", "孩子", "女儿", "儿子", "同学"])
    guide_like = _contains_any(t, ["攻略", "干货", "合集", "怎么选中介", "如何选择靠谱", "经验分享", "避坑指南"])

    if guide_like and not first_person and hit <= 2 and not urgent:
        return {"level": "low", "bonus": 0, "hit": hit, "urgent": urgent, "question": question}

    if hit >= 2 or (hit >= 1 and urgent):
        return {"level": "high", "bonus": 22, "hit": hit, "urgent": urgent, "question": question}
    if hit >= 1 or (question and first_person):
        return {"level": "medium", "bonus": 12, "hit": hit, "urgent": urgent, "question": question}
    return {"level": "low", "bonus": 0, "hit": hit, "urgent": urgent, "question": question}


def _is_competitor(author: str, text: str, competitor_terms: List[str]) -> bool:
    author_l = str(author or "").strip().lower()
    text_l = str(text or "").lower()

    noise_authors = {"search_card", "unknown", "匿名", "none", "null"}
    if not author_l or author_l in noise_authors:
        return True

    institutional_author_hints = ["中介", "机构", "顾问", "工作室", "教育", "老师", "官方", "播报", "留学服务", "留学咨询", "留学攻略", "留学干货"]
    if _contains_any(author_l, institutional_author_hints):
        return True

    demand_terms = ["求推荐", "求助", "请问", "有没有", "哪家", "想找", "怎么选", "预算", "费用", "急", "避雷"]
    question_terms = ["?", "？", "请问", "有没有", "哪家", "怎么", "如何"]
    self_promo_terms = ["私信我", "加我微信", "微信咨询", "欢迎咨询", "咨询我", "服务报价", "套餐", "保录", "代办", "点击主页"]
    direct_sell_terms = ["私信", "加v", "微信", "咨询", "报价", "套餐", "保录", "代办", "服务", "报名", "讲座", "直播", "点击主页"]

    demand_like = _contains_any(text_l, demand_terms) or _contains_any(text_l, question_terms)
    self_promo_like = _contains_any(text_l, self_promo_terms)
    sales_hits = sum(1 for x in direct_sell_terms if x in text_l)

    if self_promo_like or sales_hits >= 2:
        return True

    if sales_hits >= 1 and not demand_like:
        return True

    keyword_hit = _contains_any(text_l, competitor_terms)
    if keyword_hit and not demand_like:
        return True

    return False


def _is_target(text: str, competitor: bool, intent_level: str, target_terms: List[str]) -> bool:
    if competitor:
        return False
    if intent_level in {"high", "medium"}:
        return True

    text_l = str(text or "").lower()
    demand_like = _contains_any(text_l, ["求推荐", "求助", "请问", "有没有", "哪家", "想找", "怎么选", "预算", "费用", "急", "避雷"])
    question_like = _contains_any(text_l, ["?", "？", "请问", "有没有", "哪家", "怎么", "如何"])
    hit = sum(1 for x in target_terms if str(x).lower() in text_l)

    if hit >= 2:
        return True
    if hit >= 1 and (demand_like or question_like):
        return True
    if demand_like and len(text_l) >= 25:
        return True
    return False


def build_payload(project_root: Path, limit: int, min_score: int, only_target: bool, exclude_competitors: bool, vertical: str) -> Dict:
    app_dir = project_root / "streamlit-app"
    if str(app_dir) not in sys.path:
        sys.path.insert(0, str(app_dir))

    from lead_pack import _normalize_source_rows
    from services.vertical_playbooks import get_vertical_playbook, normalize_vertical_key

    vk = normalize_vertical_key(vertical)
    pb = get_vertical_playbook(vk)

    rows = _normalize_source_rows(project_root)

    out = []
    dedupe_seen = set()
    for row in rows:
        author = _clean_author(str(row.get("author", "Unknown") or "Unknown")) or "Unknown"
        content = str(row.get("content", "") or "").strip()
        keyword = str(row.get("keyword", "") or "").strip()
        platform = str(row.get("platform", "") or "unknown").strip().lower()
        author_url = str(row.get("author_url", "") or "").strip()
        post_url = str(row.get("post_url", "") or "").strip()
        source_url = str(row.get("source_url", "") or "").strip()
        contact = str(row.get("contact", "") or "").strip()
        collected_at = str(row.get("collected_at", "") or "").strip()
        source_file = str(row.get("source_file", "") or "").strip()
        if len(content) < 8:
            continue

        text_blob = f"{author} {keyword} {content}"
        competitor_terms = [str(x).strip() for x in pb.get("competitor_keywords", []) if str(x).strip()]
        competitor = _is_competitor(author, text_blob, competitor_terms)
        if vk == "study_abroad" and platform != "xhs":
            demand_like = _contains_any(text_blob, ["求推荐", "求助", "请问", "有没有", "哪家", "预算", "费用", "避雷", "怎么选"])
            first_person = _contains_any(text_blob, ["我", "本人", "孩子", "女儿", "儿子", "同学"])
            if not (demand_like and first_person):
                competitor = True

        intent_terms = [str(x).strip() for x in (pb.get("intent_keywords", []) + pb.get("reach_keywords", [])) if str(x).strip()]
        intent_sig = _score_intent(text_blob, intent_terms)

        target_terms = [str(x).strip() for x in pb.get("target_hints", []) if str(x).strip()]
        is_target = _is_target(text_blob, competitor, intent_sig["level"], target_terms)

        dm_ready = False
        author_url_l = author_url.lower()
        if author_url and ("/user/profile/" in author_url_l or "xiaohongshu.com/user" in author_url_l):
            dm_ready = True
        if vk == "study_abroad" and platform != "xhs" and not dm_ready:
            competitor = True

        base = _to_int(row.get("score"), 0)
        calibrated_base = min(85, max(35, 30 + int(base * 2.2)))
        demand_bonus = 14 if _contains_any(text_blob, ["求推荐", "求助", "请问", "有没有", "哪家", "想找", "怎么选", "预算", "费用", "急", "避雷"]) else (6 if intent_sig["question"] else 0)
        score = calibrated_base + int(intent_sig["bonus"]) + demand_bonus + (8 if dm_ready else 0) - (18 if competitor else 0)
        score = max(0, min(100, int(score)))

        canonical_post_url = post_url.split("#", 1)[0].split("?", 1)[0]
        dedupe_key = f"{platform}|{author.lower()}|{canonical_post_url.lower()}|{content[:120].lower()}"
        if dedupe_key in dedupe_seen:
            continue
        dedupe_seen.add(dedupe_key)

        body = f"{platform}|{author}|{canonical_post_url}|{content[:80]}"
        external_id = hashlib.md5(body.encode("utf-8", errors="ignore")).hexdigest()[:16]

        out.append(
            {
                "platform": platform,
                "keyword": keyword,
                "author": author,
                "author_url": author_url,
                "post_url": post_url,
                "source_url": source_url,
                "content": content,
                "contact": contact,
                "score": score,
                "base_score": base,
                "intent_level": intent_sig["level"],
                "is_target": is_target,
                "is_competitor": competitor,
                "dm_ready": dm_ready,
                "collected_at": collected_at,
                "source_file": source_file,
                "external_id": external_id,
            }
        )

    out.sort(key=lambda x: (int(x.get("score", 0)), str(x.get("collected_at", ""))), reverse=True)

    filtered = out
    if exclude_competitors:
        filtered = [x for x in filtered if not bool(x.get("is_competitor"))]
    if only_target:
        filtered = [x for x in filtered if bool(x.get("is_target"))]
    if min_score > 0:
        filtered = [x for x in filtered if int(x.get("score", 0)) >= min_score]

    rows_out = filtered[: max(1, limit)]

    platform_counts: Dict[str, int] = {}
    for item in out:
        p = str(item.get("platform", "unknown") or "unknown")
        platform_counts[p] = platform_counts.get(p, 0) + 1

    summary = {
        "total_rows": len(out),
        "filtered_rows": len(filtered),
        "target_rows": sum(1 for x in out if x.get("is_target")),
        "competitor_rows": sum(1 for x in out if x.get("is_competitor")),
        "dm_ready_rows": sum(1 for x in out if x.get("dm_ready")),
        "score_ge_65_rows": sum(1 for x in out if int(x.get("score", 0)) >= 65),
        "platform_counts": platform_counts,
    }

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "vertical": vk,
        "filters": {
            "limit": limit,
            "min_score": min_score,
            "only_target": only_target,
            "exclude_competitors": exclude_competitors,
        },
        "summary": summary,
        "rows": rows_out,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--min-score", type=int, default=0)
    parser.add_argument("--only-target", type=int, default=0)
    parser.add_argument("--exclude-competitors", type=int, default=1)
    parser.add_argument("--vertical", default="study_abroad")
    args = parser.parse_args()

    payload = build_payload(
        project_root=Path(args.project_root).resolve(),
        limit=max(1, int(args.limit)),
        min_score=max(0, int(args.min_score)),
        only_target=bool(int(args.only_target)),
        exclude_competitors=bool(int(args.exclude_competitors)),
        vertical=str(args.vertical or "study_abroad"),
    )

    out_path = Path(args.output).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(str(out_path))


if __name__ == "__main__":
    main()
