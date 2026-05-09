#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from textwrap import shorten


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SALES_DIR = PROJECT_ROOT / "sales"
INPUT = SALES_DIR / "leadpulse_self_prospecting_ready_to_contact_latest.csv"
OUT_CSV = SALES_DIR / "leadpulse_multi_industry_customer_queue.csv"
TODAY_CSV = SALES_DIR / "leadpulse_multi_industry_today_contact.csv"
OUT_MD = SALES_DIR / "leadpulse_multi_industry_customer_queue.md"
FRONTEND_JSON = PROJECT_ROOT / "frontend-b2b" / "data" / "self_outreach" / "multi_industry_customer_queue.json"

FIELDNAMES = [
    "rank",
    "priority",
    "industry_label",
    "quality_score",
    "source",
    "platform",
    "author",
    "profile_url",
    "compose_url",
    "contact_mode",
    "fit_tier",
    "source_url",
    "published_at",
    "title",
    "signal_summary",
    "recommended_offer",
    "first_message",
    "next_action",
]

INDUSTRY_QUOTAS = {
    "Marketing agencies": 22,
    "B2B SaaS and startups": 18,
    "Ecommerce and DTC": 14,
    "Local services": 14,
    "Coaches and consultants": 12,
    "Clinics and wellness": 10,
    "Recruiting and staffing": 10,
    "Home services and contractors": 8,
    "Restaurants and hospitality": 8,
    "Legal and accounting": 7,
    "Real estate": 7,
    "Education and training": 5,
    "Creator and content services": 5,
}

REVIEWED_CANDIDATES: tuple[tuple[str, str, str], ...] = (
    ("LegitimateSale994", "How to find clients", "Marketing agencies"),
    ("/u/Solo_leveled90", "complex \"Intake\" scheduling", "Marketing agencies"),
    ("/u/No-Mistake421", "best LinkedIn outreach tool", "Marketing agencies"),
    ("/u/sweetpoison2000", "international clients", "Marketing agencies"),
    ("/u/Real_KingZeotic", "HIGH INTENT leads", "Marketing agencies"),
    ("/u/Xx_Tops_xX", "automated outbound/GTM", "Marketing agencies"),
    ("/u/mustached-glasses", "Stuck at 10k/mo", "Marketing agencies"),
    ("/u/Less_Education_2333", "Need help with my agency", "Marketing agencies"),
    ("/u/Imaginary_Bake_5820", "marketing agencies scale using cold email", "Marketing agencies"),
    ("/u/Embarrassed_Pay1275", "hire cold email services", "Marketing agencies"),
    ("/u/Zanx_thebanx", "Need help with marketing", "Marketing agencies"),
    ("/u/bajaberpj", "Stuck at Client Acquisition", "Marketing agencies"),
    ("/u/ShortSqueezeMillion", "Scaling faster than expected", "Marketing agencies"),
    ("acehotdog", "Trial users", "B2B SaaS and startups"),
    ("/u/Ibanks69", "Cold Email Still Work", "B2B SaaS and startups"),
    ("/u/No_Hold_9560", "bootstrapping", "B2B SaaS and startups"),
    ("/u/RameStar", "Collaborators/influencers", "B2B SaaS and startups"),
    ("/u/axadrn", "almost no sales", "B2B SaaS and startups"),
    ("/u/contralai", "Relaunching our dev tool", "B2B SaaS and startups"),
    ("/u/Ok_Economist_9790", "AI outbound", "B2B SaaS and startups"),
    ("/u/CommunicationOdd838", "overall customer acquisition", "Ecommerce and DTC"),
    ("/u/Ready-Trick-8228", "Shopify email list", "Ecommerce and DTC"),
    ("/u/Crescitaly", "social media following actually impact sales", "Ecommerce and DTC"),
    ("/u/NoNeedleworker8427", "Min margins", "Ecommerce and DTC"),
    ("/u/Lynxwasneverhere", "Improving checkout conversion rate", "Ecommerce and DTC"),
    ("/u/Appropriate-Plan5664", "Spending 10k/month on ads", "Ecommerce and DTC"),
    ("/u/Zanx_thebanx", "cart abandonment rate", "Ecommerce and DTC"),
    ("/u/Boring_Analysis_6057", "add to cart but never complete", "Ecommerce and DTC"),
    ("/u/kerblamophobe", "TikTok organic traffic", "Ecommerce and DTC"),
    ("/u/trachtmanconsulting", "Automation and leads", "Coaches and consultants"),
    ("/u/ksrida", "scaled a consulting agency", "Coaches and consultants"),
    ("/u/thatlionman303", "qualified consulting leads", "Coaches and consultants"),
    ("/u/Spare_Independent_91", "Founder/Consultants", "Coaches and consultants"),
    ("/u/ironman037", "marketing / lead gen channels", "Coaches and consultants"),
    ("/u/simply_tye", "boutique consulting firms", "Coaches and consultants"),
    ("/u/coolresearcher87", "Independent consultants", "Coaches and consultants"),
    ("/u/MindMingle24", "find cold clients", "Coaches and consultants"),
    ("/u/danielrosehill", "follow up with old leads", "Coaches and consultants"),
    ("/u/Quantsel", "winning new clients", "Coaches and consultants"),
    ("/u/ZealousidealMango595", "Question to freelance recruiters", "Recruiting and staffing"),
    ("/u/Bozzarello_Faatma", "lead generation software", "Recruiting and staffing"),
    ("/u/Ajai_Krishna", "Crunchbase", "Recruiting and staffing"),
    ("/u/Ajai_Krishna", "Fiverr reliable", "Recruiting and staffing"),
    ("/u/Material-Bother-3341", "ATS / CRM", "Recruiting and staffing"),
    ("/u/Siegfried6", "BD op", "Recruiting and staffing"),
    ("/u/kxnhz", "solo/freelance recruiters", "Recruiting and staffing"),
    ("/u/Bigideasbetterworld", "Lead Generation", "Recruiting and staffing"),
    ("/u/ddaddlexus", "Struggling with BD", "Recruiting and staffing"),
    ("/u/rojo1986", "social media marketing service", "Creator and content services"),
    ("/u/Significant_Stage_41", "Which industry makes sense", "Creator and content services"),
    ("/u/Melodic-Speed4674", "Commission-Based Lead Gen", "Creator and content services"),
    ("/u/giochecker", "Youtube as Inbound Lead Source", "Creator and content services"),
    ("/u/Secure-Witness3305", "Organic Social Posting", "Creator and content services"),
    ("/u/R_0DB", "laser cutting", "Local services"),
    ("/u/vchak8", "local health provider", "Local services"),
    ("/u/Puzzleheaded-Fly8059", "Windows/Siding", "Home services and contractors"),
    ("/u/cptjoe36", "unsolicited text messages", "Home services and contractors"),
    ("/u/Recent-Difficulty-42", "Angi is better", "Home services and contractors"),
    ("/u/LavishnessLucky6824", "successful on Yelp", "Home services and contractors"),
    ("/u/YogurtclosetNo6937", "sewer business", "Home services and contractors"),
    ("/u/Embarrassed_Driver22", "Newbie", "Home services and contractors"),
    ("/u/Ok-Faithlessness7275", "generate leads", "Home services and contractors"),
    ("/u/Loose-Bad2229", "digital marketing tips", "Home services and contractors"),
    ("/u/MicahMelbourne", "Facebook ads", "Home services and contractors"),
    ("/u/b160debb4e4821", "specific product/shower", "Home services and contractors"),
    ("/u/Used_Rhubarb_9265", "more customers to my restaurant", "Restaurants and hospitality"),
    ("/u/ellensrooney", "restaurant marketing", "Restaurants and hospitality"),
    ("/u/piratecarribean20122", "Facebook ads aren't moving", "Restaurants and hospitality"),
    ("/u/Adventurous_Path777", "Toast website", "Restaurants and hospitality"),
    ("/u/snustynanging", "marketing agency vs in-house", "Restaurants and hospitality"),
    ("/u/alexanderbaziari", "coffee & grilled cheese", "Restaurants and hospitality"),
    ("/u/Ok_Talk8381", "sales analysis tool", "Restaurants and hospitality"),
    ("/u/JuJu_Optics", "practice to get patients", "Clinics and wellness"),
    ("/u/Macbeth3322", "Increasing Patient Base", "Clinics and wellness"),
    ("/u/No_Maintenance_1651", "get referrals/clients", "Clinics and wellness"),
    ("/u/EmphasisOk3368", "phone scheduling", "Clinics and wellness"),
    ("/u/No-Communication1543", "second clinic", "Clinics and wellness"),
    ("/u/TopAd5747", "Appointment Reminders", "Clinics and wellness"),
    ("/u/CandyMaterial3301", "PI Firm Owners", "Legal and accounting"),
    ("/u/Shot-Trade-5473", "Personal Injury Firm", "Legal and accounting"),
    ("/u/That_Intern_5012", "Marketing Agencies Worth", "Legal and accounting"),
    ("/u/Normal_Government709", "law firm phone system", "Legal and accounting"),
    ("/u/dragonflysay", "PI firm CRM", "Legal and accounting"),
    ("/u/ktkt1111", "Phone Answering Services", "Legal and accounting"),
    ("/u/SnooCats4777", "Google ads and LSA", "Legal and accounting"),
    ("/u/DuPageCPA", "client acquisition tool", "Legal and accounting"),
    ("/u/jaycpa2050", "Bark.com", "Legal and accounting"),
    ("/u/Positive-Fox3161", "No fluff", "Real estate"),
    ("/u/RealtorNathyn", "consistent leads", "Real estate"),
    ("/u/polo1990", "leads do you have in your CRM", "Real estate"),
    ("/u/Perfect-Lion4847", "expired listings", "Real estate"),
    ("/u/infinitymouse", "Buyer already has an agent", "Real estate"),
)

REVIEWED_LOOKUP = {
    (author.lower(), fragment.lower()): (idx, industry)
    for idx, (author, fragment, industry) in enumerate(REVIEWED_CANDIDATES)
}

INDUSTRY_RECLASSIFIERS: tuple[tuple[str, tuple[re.Pattern[str], ...]], ...] = (
    (
        "Legal and accounting",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\blaw firm\b",
                r"\bfamily law\b",
                r"\blawyers?\b",
                r"\battorneys?\b",
                r"\blegal marketing\b",
                r"\bsolo practice\b",
                r"\bhanging a shingle\b",
            )
        ),
    ),
    (
        "Clinics and wellness",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\bphysiotherapist\b",
                r"\btherapist\b",
                r"\btherapy practice\b",
                r"\bprivate practice\b",
                r"\bchiro\b",
                r"\bchiropractor\b",
                r"\bshockwave therapy\b",
                r"\bnew patients\b",
                r"\bpatient acquisition\b",
                r"\bhealthcare services\b",
                r"\beating disorder\b",
            )
        ),
    ),
    (
        "Marketing agencies",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\bsmma\b",
                r"\bmarketing agency\b",
                r"\bmy agency\b",
                r"\bour agenc",
                r"\bdev/web agency\b",
                r"\bweb agency\b",
                r"\bwebsite building business\b",
                r"\bweb infrastructure company\b",
                r"\bfreelanc(?:e|ing) in digital marketing\b",
                r"\bgoogle ads specialist\b",
            )
        ),
    ),
    (
        "Ecommerce and DTC",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\bshopify\b",
                r"\becommerce\b",
                r"\be-commerce\b",
                r"\becomm\b",
                r"\bebay\b",
                r"\bonline store\b",
                r"\bpet supply store\b",
                r"\bcraft supplies\b",
                r"\bhomemade jewelry\b",
                r"\bamazon\b",
                r"\bproduct recommendations\b",
            )
        ),
    ),
    (
        "Home services and contractors",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\bhandyman\b",
                r"\bmaid service\b",
                r"\bcleaning company\b",
                r"\bpainting business\b",
                r"\blaundry pickup\b",
                r"\bservice business\b",
                r"\bduct cleaning\b",
                r"\bdryer vent\b",
                r"\binsulation\b",
                r"\bmobile detailing\b",
                r"\bexterior cleaning\b",
                r"\bgutter cleaning\b",
                r"\bwindow installation\b",
                r"\btech repair\b",
            )
        ),
    ),
    (
        "Restaurants and hospitality",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\brestaurant\b",
                r"\bcatering\b",
                r"\bhotel\b",
                r"\bhospitality\b",
            )
        ),
    ),
    (
        "Recruiting and staffing",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\brecruiting agency\b",
                r"\bstaffing agency\b",
                r"\bstaffing company\b",
                r"\bplacement clients\b",
                r"\brep agency\b",
            )
        ),
    ),
    (
        "Real estate",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\brealtor\b",
                r"\breal estate agent\b",
                r"\bbrokerage\b",
                r"\bzillow\b",
                r"\bseller leads\b",
                r"\bbuyer leads\b",
            )
        ),
    ),
    (
        "Creator and content services",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\bvideo editor\b",
                r"\bmotion designer\b",
                r"\bfreelance writing\b",
                r"\bcontent creator\b",
                r"\bcreator\b",
            )
        ),
    ),
    (
        "B2B SaaS and startups",
        tuple(
            re.compile(pattern, re.I)
            for pattern in (
                r"\bb2b saas\b",
                r"\bsaas\b",
                r"\bsoftware product\b",
                r"\bit services company\b",
                r"\btechnical founder\b",
                r"\btrial users\b",
            )
        ),
    ),
)

STRONG_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\blead generation\b",
        r"\blead gen\b",
        r"\bqualified leads\b",
        r"\bfind clients\b",
        r"\bget clients\b",
        r"\bgetting clients\b",
        r"\bclient acquisition\b",
        r"\bcustomer acquisition\b",
        r"\bnew customers\b",
        r"\bnew patients\b",
        r"\bpatient acquisition\b",
        r"\bbuyer leads\b",
        r"\bseller leads\b",
        r"\bbook calls\b",
        r"\bbooked calls\b",
        r"\bsales calls\b",
        r"\bappointments?\b",
        r"\bappointment setting\b",
        r"\bcold outreach\b",
        r"\bcold email\b",
        r"\bsales pipeline\b",
        r"\bprospecting\b",
        r"\bgoogle ads\b",
        r"\blocal seo\b",
        r"\bmore calls\b",
        r"\bbooked jobs\b",
        r"\bestimate requests?\b",
        r"\bintake\b",
        r"\breferrals\b",
        r"\bmarketing agency for lead\b",
    )
)

OPERATOR_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bi run\b",
        r"\bwe run\b",
        r"\bi started\b",
        r"\bwe started\b",
        r"\bi own\b",
        r"\bfounder\b",
        r"\bowner\b",
        r"\bmy agency\b",
        r"\bour agenc",
        r"\bmy business\b",
        r"\bour business\b",
        r"\bsmall business\b",
        r"\bagency owner\b",
        r"\bmy practice\b",
        r"\bour practice\b",
        r"\bprivate practice\b",
        r"\bmy clinic\b",
        r"\bour clinic\b",
        r"\bmy firm\b",
        r"\bour firm\b",
        r"\blaw firm\b",
        r"\bsolo practice\b",
        r"\bmy restaurant\b",
        r"\bour restaurant\b",
        r"\brestaurant owner\b",
        r"\brunning a small restaurant\b",
        r"\bcontractor\b",
        r"\bconsultant\b",
        r"\bfreelancer\b",
        r"\bphysiotherapist\b",
        r"\btherapist\b",
        r"\bchiro\b",
        r"\bchiropractor\b",
        r"\brecruiting agency\b",
        r"\bstaffing agency\b",
        r"\bshopify store\b",
        r"\bonline store\b",
        r"\bpet supply store\b",
        r"\bhandyman business\b",
        r"\bmaid service\b",
        r"\bcleaning company\b",
        r"\bmobile detailing\b",
        r"\bevent ticketing business\b",
        r"\bstartup\b",
        r"\bsoftware product\b",
        r"\bb2b saas\b",
        r"\bit services company\b",
        r"\becommerce\b",
    )
)

INTENT_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bhow (do|can|should) (i|we)\b",
        r"\bhow to\b",
        r"\bneed (help|advice|recommendations?)\b",
        r"\bneed some (help|advice|insight)\b",
        r"\blooking for advice\b",
        r"\blooking for (a )?(lead generation|marketing|google ads|business software|recommendations?)\b",
        r"\blegitimate advice\b",
        r"\bstruggl",
        r"\bstuck\b",
        r"\boverwhelming\b",
        r"\bnot converting\b",
        r"\b0 replies\b",
        r"\bzero replies\b",
        r"\bno replies\b",
        r"\bno leads\b",
        r"\bzero pipeline\b",
        r"\bnot getting (any )?(leads|clients|customers|calls)\b",
        r"\bwhere (do|can|should) (i|we)\b",
        r"\bwhat.*working\b",
        r"\bwhat'?s your go-to channel\b",
        r"\bwhat tool do you use\b",
        r"\bwhat website service\b",
        r"\bdoes anyone (use|have|know|recommend)\b",
        r"\bhas anyone\b",
        r"\bany advice\b",
        r"\bthoughts & advice\b",
        r"\brecommend.*agency\b",
        r"\bhow much do you pay for leads\b",
        r"\brough estimate\b",
        r"\ballocate some budget\b",
        r"\bready for a change\b",
        r"\bgetting cases\b",
        r"\bget more customers\b",
        r"\bget more clients\b",
        r"\bget more calls\b",
        r"\bland first few jobs\b",
        r"\bfind clients\b",
        r"\bfinding clients\b",
        r"\bcan'?t find clients\b",
        r"\bhardest time finding clients\b",
        r"\btraffic to (my|our|the) (shop|site|store)\b",
        r"\bgenerating business\b",
        r"\bappointment scheduling\b",
        r"\btrial users.*convert\b",
        r"\bconversion\b",
        r"\bevaluating .*lead generation tool\b",
        r"\bbreaking out\b",
        r"\bhalf empty\b",
        r"\bramp up\b",
        r"\bhow long to 100 customers\b",
        r"\bdo i give up\b",
        r"\bi cannot tell\b",
        r"\bstarted doing outreach\b",
    )
)

EXCLUDE_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bresume\b",
        r"\bjob\b",
        r"\bhiring\b",
        r"\bsalary\b",
        r"\binterview\b",
        r"\bcandidate\b",
        r"\b16m\b",
        r"\b16 years old\b",
        r"\btgif! what did you ship\b",
        r"\bwhat did you ship this week\b",
        r"\btell me your ideas and try\b",
        r"\bavoid these .*mistakes\b",
        r"\bthis is the opportunity your brand\b",
        r"\bjust spent a lot of hours\b",
        r"\bama\b",
        r"\bask me anything\b",
        r"\bwe built the fix\b",
        r"\byc backed\b",
        r"\bopening beta\b",
        r"\bgo to market problem kills\b",
        r"\bbehind-the-scenes email partner\b",
        r"\bagency owners are losing clients\b",
        r"\bas a social media marketer\b",
        r"\bhere'?s my 2 cents\b",
        r"\bwent from .* to running\b",
        r"\bmy toolkit as an agent\b",
        r"\bif you need clients fast\b",
        r"\bworked for us\b",
        r"\bturn website flaws into clients\b",
        r"\bhabits that took my saas\b",
        r"\bhow to build a\b",
        r"\bstarted cold emailing to find clients .*heres where im at\b",
        r"\bi cancelled .*tools\b",
        r"\bi ran cold email campaigns\b",
        r"\bwe send over\b",
        r"\blet me tell you\b",
        r"\bmost cold email fails\b",
        r"\bfor hire\b",
        r"\bavailable for\b",
        r"\bplaybook\b",
        r"\bcase study\b",
        r"\bnewsletter\b",
        r"\broundup\b",
        r"\btutorial\b",
        r"\bguide\b",
        r"\bread this\b",
        r"\bhow i\b",
        r"\bi built\b",
        r"\bi made\b",
        r"\blaunched\b",
        r"\bshow hn\b",
        r"\blooking for testers\b",
        r"\bco-?founder\b",
        r"\bco\s+founder\b",
        r"\bgrowth/sales partner\b",
        r"\bsales partner\b",
        r"\breferral partner network\b",
        r"\blooking for partner\b",
        r"\bpartner - us based\b",
        r"\bpartner wanted\b",
        r"\brev share\b",
        r"\bcommission on a\b",
        r"\bfree .*audit\b",
        r"\bfree services\b",
        r"\bbuy leads\b",
        r"\bselling leads\b",
        r"\bhigh quality lead\b",
        r"\bhanding leads to a client\b",
        r"\bmy client\b",
        r"\bfor my client\b",
        r"\bmedicare\b",
        r"\bfinal expense\b",
        r"\baca\b",
        r"\bcourse download\b",
        r"\bcommunity for\b",
        r"\bmentor\b",
        r"\bwhat problems would .*pay\b",
        r"\bturning yc\b",
        r"\bstartup blueprints\b",
        r"\bwould you use this\b",
        r"\bseeking smart founders\b",
        r"\bremote b2b sales\b",
        r"\bcommission only\b",
        r"\bgrowth partner\b",
        r"\blooking for collaborators\b",
        r"\bquick breakdown\b",
        r"\byour youtube demo\b",
        r"\bunpopular opinion\b",
        r"\bhere are the\b",
        r"\bhere is how\b",
        r"\bhere'?s how\b",
        r"\bi spent \d+",
        r"\bjust spent\b",
        r"\bi mass emailed\b",
        r"\bbuilt to \$",
        r"\bmrr\b",
        r"\bfirst ai agent\b",
        r"\bmust-dos\b",
        r"\bpost-call review\b",
        r"\bthe trap of\b",
        r"\bfounders who hit\b",
        r"\bwhat i learned\b",
        r"\basked technical founders\b",
        r"\blead generation, new client acquisition\b",
        r"\$\d+/?hour",
        r"\bmy strategy\b",
        r"\blead generation 101\b",
        r"\bconsistent pipeline of leads\b",
        r"\bfrom someone who\b",
        r"\bif you.?re a coach tired\b",
        r"\bwhat most online coaches miss\b",
        r"\bhere.?s how to land\b",
        r"\bi.?ve made \$",
        r"\bsimple plan i use\b",
        r"\bwhat did you ship\b",
        r"\battention!!\b",
        r"\borganic social is outperforming\b",
        r"\bstop overthinking\b",
        r"\bi did zero marketing\b",
        r"\byour marketing agency making\b",
        r"\boffer flexible, customized packages\b",
    )
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean_display(value: object) -> str:
    return " ".join(str(value or "").split())


def has_any(patterns: tuple[re.Pattern[str], ...], text: str) -> bool:
    return any(pattern.search(text) for pattern in patterns)


def hit_count(patterns: tuple[re.Pattern[str], ...], text: str) -> int:
    return sum(1 for pattern in patterns if pattern.search(text))


def reviewed_match(row: dict[str, str]) -> tuple[int, str] | None:
    author = clean_display(row.get("author", "")).lower()
    text = row_text(row).lower()
    for (expected_author, fragment), (idx, industry) in REVIEWED_LOOKUP.items():
        if author == expected_author and fragment in text:
            return idx, industry
    return None


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def days_old(row: dict[str, str]) -> int | None:
    date = parse_date(row.get("published_at", ""))
    if date is None:
        return None
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - date.astimezone(timezone.utc)).days


def row_text(row: dict[str, str]) -> str:
    return " ".join(
        clean_display(row.get(key, ""))
        for key in ("title", "evidence")
    )


def normalize_industry(row: dict[str, str]) -> str:
    match = reviewed_match(row)
    if match:
        return match[1]
    text = row_text(row)
    for industry, patterns in INDUSTRY_RECLASSIFIERS:
        if has_any(patterns, text):
            return industry
    return row.get("industry_label", "Other")


def is_buyer_context(row: dict[str, str]) -> bool:
    text = row_text(row)
    low = text.lower()
    if any(
        phrase in low
        for phrase in (
            "what did you ship this week",
            "tell me your ideas and try",
            "avoid these three core mistakes",
            "opportunity your brand has been waiting for",
            "campaigns. here is what it gives",
            "maybe it'll save someone else some money",
            "here's why, and how you can fix it",
            "quick breakdown:",
        )
    ):
        return False
    if re.search(r"\b(i|we) (run|own|started|have|work at|am running)\b", low):
        return True
    if re.search(r"\b(founder|owner|restaurant owner|small biz owner|private practice|law firm|clinic|agency|store|shop)\b", low):
        return True
    if re.search(r"\blooking for (advice|recommendations?|a lead generation|marketing|google ads|business software)\b", low):
        return True
    if re.search(r"\b(struggling|stuck|hard time|zero replies|no replies|zero pipeline|not converting)\b", low):
        return True
    return False


def best_title(row: dict[str, str]) -> str:
    title = clean_display(row.get("title", ""))
    author = clean_display(row.get("author", "")).replace("/u/", "")
    if title and title.lower() != author.lower():
        return shorten(title, width=120, placeholder="...")
    evidence = clean_display(row.get("evidence", ""))
    return shorten(evidence or title or author or "public demand signal", width=120, placeholder="...")


def evidence_summary(row: dict[str, str]) -> str:
    text = clean_display(row.get("evidence") or row.get("fit_reason") or row.get("title"))
    return shorten(text, width=260, placeholder="...")


def score_row(row: dict[str, str]) -> int:
    match = reviewed_match(row)
    text = row_text(row)
    score = int(float(row.get("quality_score") or 0))
    if match:
        score += 30
    score += min(24, hit_count(STRONG_PATTERNS, text) * 6)
    score += min(12, hit_count(OPERATOR_PATTERNS, text) * 4)
    if row.get("quality_tier") == "A":
        score += 8
    if row.get("source", "").startswith("existing_"):
        score += 8
    age = days_old(row)
    if age is not None:
        if age <= 60:
            score += 8
        elif age <= 180:
            score += 4
        elif age > 395 and not row.get("source", "").startswith("existing_"):
            score -= 18
    if has_any(EXCLUDE_PATTERNS, text):
        score -= 24
    if hit_count(INTENT_PATTERNS, text) < 1:
        score -= 8
    if any(term in text.lower() for term in ("beginner freelancer", "learning cold outreach", "career long-term")):
        score -= 10
    return max(0, min(100, score))


def age_bucket_score(row: dict[str, str]) -> int:
    age = days_old(row)
    if age is None:
        return 0
    if age <= 90:
        return 4
    if age <= 180:
        return 3
    if age <= 365:
        return 2
    if age <= 550:
        return 1
    return 0


def rank_key(row: dict[str, str]) -> tuple[int, int, int]:
    match = reviewed_match(row)
    review_rank = -(match[0] if match else 9999)
    return (age_bucket_score(row), score_row(row), review_rank)


def is_candidate(row: dict[str, str]) -> bool:
    if not row.get("source_url"):
        return False
    if row.get("risk_flags"):
        return False
    if row.get("source") == "github_repo":
        return False
    match = reviewed_match(row)
    text = row_text(row)
    if match:
        return True
    if int(float(row.get("quality_score") or 0)) < 85:
        return False
    if has_any(EXCLUDE_PATTERNS, text):
        return False
    if hit_count(STRONG_PATTERNS, text) < 1:
        return False
    if hit_count(OPERATOR_PATTERNS, text) < 1:
        return False
    if hit_count(INTENT_PATTERNS, text) < 1:
        return False
    if not is_buyer_context(row):
        return False
    age = days_old(row)
    if age is not None and age > 395 and row.get("source") != "existing_live_targets":
        return False
    return True


def is_rescue_candidate(row: dict[str, str]) -> bool:
    if not row.get("source_url"):
        return False
    if row.get("risk_flags"):
        return False
    if row.get("source") == "github_repo":
        return False
    if int(float(row.get("quality_score") or 0)) < 90:
        return False
    text = row_text(row)
    if has_any(EXCLUDE_PATTERNS, text):
        return False
    if hit_count(STRONG_PATTERNS, text) < 1:
        return False
    if hit_count(INTENT_PATTERNS, text) < 1:
        return False
    if not is_buyer_context(row):
        return False
    age = days_old(row)
    if age is not None and age > 550 and row.get("source") != "existing_live_targets":
        return False
    return True


def contact_message(row: dict[str, str]) -> str:
    author = clean_display(row.get("author") or "there")
    title = best_title(row)
    offer = clean_display(row.get("recommended_offer") or "999 pilot: 30-50 public high-intent prospects in your niche.")
    return (
        f"Hi {author}, saw your public post about \"{title}\". "
        "I run LeadPulse, a service that finds public buying-intent posts and turns them into hand-cleaned lead lists with source links, demand summaries, priority, and opener angles. "
        f"For your case, I would start with: {offer} "
        "Want me to send a 5-lead sample first so you can judge quality before any pitch?"
    )


def load_rows() -> list[dict[str, str]]:
    with INPUT.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def select_rows(rows: list[dict[str, str]], limit: int = 120) -> list[dict[str, str]]:
    candidates = [row for row in rows if reviewed_match(row) is not None]
    candidates.sort(key=rank_key, reverse=True)

    selected: list[dict[str, str]] = []
    seen_urls: set[str] = set()
    seen_author_industry: set[tuple[str, str]] = set()

    def maybe_add(row: dict[str, str]) -> bool:
        url = row.get("source_url", "").strip().lower()
        author = row.get("author", "").strip().lower()
        industry = normalize_industry(row)
        key = (industry, author)
        if not url or url in seen_urls:
            return False
        if author and key in seen_author_industry:
            return False
        selected.append(row)
        seen_urls.add(url)
        if author:
            seen_author_industry.add(key)
        return True

    for row in candidates:
        if len(selected) >= limit:
            break
        maybe_add(row)

    selected.sort(key=rank_key, reverse=True)
    return selected[:limit]


def render_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    for rank, row in enumerate(rows, 1):
        priority = "P0" if rank <= 30 else "P1" if rank <= 90 else "P2"
        match = reviewed_match(row)
        raw_platform = row.get("platform", "")
        platform = "reddit" if "reddit" in raw_platform.lower() else raw_platform
        contact_mode = "reddit_compose" if "reddit" in platform.lower() else "manual_profile_or_source"
        output.append(
            {
                "rank": str(rank),
                "priority": priority,
                "industry_label": normalize_industry(row),
                "quality_score": str(score_row(row)),
                "source": row.get("source", ""),
                "platform": platform,
                "author": row.get("author", ""),
                "profile_url": row.get("author_url", ""),
                "compose_url": "",
                "contact_mode": contact_mode,
                "fit_tier": "agent_reviewed_customer" if match else "real_customer_candidate",
                "source_url": row.get("source_url", ""),
                "published_at": row.get("published_at", ""),
                "title": best_title(row),
                "signal_summary": evidence_summary(row),
                "recommended_offer": row.get("recommended_offer", ""),
                "first_message": contact_message(row),
                "next_action": "Open the public source, verify this is a real operator with acquisition pain, copy the sample-first message, then manually send.",
            }
        )
    return output


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_md(path: Path, rows: list[dict[str, str]], source_rows: int, candidate_rows: int) -> None:
    by_industry = Counter(row["industry_label"] for row in rows)
    lines = [
        "# LeadPulse multi-industry real-customer queue",
        "",
        f"- Source file: `{INPUT.relative_to(PROJECT_ROOT)}`",
        f"- Source rows: {source_rows}",
        f"- High-intent candidate rows after filter: {candidate_rows}",
        f"- Queue rows: {len(rows)}",
        "- Positioning: LeadPulse selling itself to real operators with acquisition, lead quality, appointment, pipeline, or customer-growth pain.",
        "- Manual only: no automated DM sending, no private data collection.",
        "",
        "## Industry mix",
    ]
    lines.extend(f"- {industry}: {count}" for industry, count in by_industry.most_common())
    lines.extend(["", "## First 30 P0 contacts", ""])
    for row in rows[:30]:
        lines.extend(
            [
                f"### {row['rank']}. {row['industry_label']} | {row['author']}",
                f"- Platform: {row['platform']}",
                f"- URL: {row['source_url']}",
                f"- Score: {row['quality_score']}",
                f"- Signal: {row['signal_summary']}",
                f"- Message: {row['first_message']}",
                "",
            ]
        )
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_frontend_json(path: Path, rows: list[dict[str, str]], source_rows: int, candidate_rows: int) -> None:
    by_industry = Counter(row["industry_label"] for row in rows)
    by_platform = Counter(row["platform"] for row in rows)
    payload = {
        "generated_at": now_iso(),
        "source_file": str(INPUT.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "source_rows": source_rows,
        "strict_ready_rows": candidate_rows,
        "queue_rows": len(rows),
        "manual_send_only": True,
        "market": "multi_industry",
        "queue_kind": "leadpulse_self_customer_queue",
        "source_note": "LeadPulse self-use queue: agent-reviewed real customer candidates across industries. The 1000-row pool remains the research pool; this queue only includes plausible manual outreach targets. Manual verification and manual send only.",
        "industry_mix": dict(by_industry.most_common()),
        "platform_mix": dict(by_platform.most_common()),
        "rows": rows,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    if not INPUT.exists():
        raise SystemExit(f"missing input: {INPUT}")
    source_rows = load_rows()
    candidate_rows = [row for row in source_rows if reviewed_match(row) is not None]
    selected = select_rows(source_rows)
    output = render_rows(selected)

    write_csv(OUT_CSV, output)
    write_csv(TODAY_CSV, output[:30])
    write_md(OUT_MD, output, len(source_rows), len(candidate_rows))
    write_frontend_json(FRONTEND_JSON, output, len(source_rows), len(candidate_rows))

    print(f"source_rows={len(source_rows)}")
    print(f"candidate_rows={len(candidate_rows)}")
    print(f"queue_rows={len(output)}")
    print(f"today_rows={min(30, len(output))}")
    print(f"wrote={OUT_CSV.relative_to(PROJECT_ROOT)}")
    print(f"wrote={TODAY_CSV.relative_to(PROJECT_ROOT)}")
    print(f"wrote={OUT_MD.relative_to(PROJECT_ROOT)}")
    print(f"wrote={FRONTEND_JSON.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
