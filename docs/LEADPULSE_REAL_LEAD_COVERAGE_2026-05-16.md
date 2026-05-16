# LeadPulse Real Lead Coverage - 2026-05-16

Worker A scope: read/write only under `LeadPulse_work/sales` and `LeadPulse_work/docs`. No frontend or backend code was touched.

## Current Coverage

- The strongest on-disk coverage is Reddit RSS, not fresh feedgrab Markdown.
- Current active self-prospecting CSV contains 1000 rows:
  - 967 rows from `reddit_rss`
  - 33 rows from `existing_live_targets`
  - 643 A-tier `strong_signal` rows
  - 357 B-tier `good_candidate` rows
  - 0 rows missing `source_url`
  - 50 rows with `risk_flags`
- Strong no-risk Reddit rows available now: 451.
- Strong no-risk Reddit rows with budget/cost/pricing/spend evidence terms: 118.

## Source Coverage By Channel

- Reddit: usable now. Evidence exists in `sales/leadpulse_self_prospecting_ready_to_contact_latest.csv` and the matching review report.
- Feedgrab: integration instructions exist, but I found no direct feedgrab output files under `sales/`. The current usable Reddit pool appears stored as normalized `reddit_rss` CSV, not raw feedgrab Markdown.
- Xiaohongshu: limited historical/manual coverage only. `sales/leadpulse_domestic_outreach_queue.csv` has 4 Xiaohongshu rows, including 3 high-score public profile/note targets and 1 manual search task. I did not find a fresh feedgrab XHS output file under `sales/`.

## Important Caveat

`sales/leadpulse_self_prospecting_quality_review.md` says the ready-to-contact file should have 784 rows, but the current `sales/leadpulse_self_prospecting_ready_to_contact_latest.csv` has 1000 rows and its SHA256 hash matches `sales/leadpulse_self_prospecting_1000_latest.csv`. Treat the current ready file as the full latest pool until the stricter 784-row file is regenerated.

## Fresh 5-Lead Sample

Created:

- `sales/leadpulse_real_lead_sample_5_2026-05-16.csv`

Selection rule:

- existing row on disk
- `quality_tier = A`
- `quality_score = 100`
- `source = reddit_rss`
- `risk_flags` empty
- public `source_url` present
- clear acquisition, lead, budget, cost, outreach, or conversion signal

Included lead IDs:

1. `a35ae69e4e3a5d` - r/SaaS - "We stopped chasing new leads and focused on re-engaging old ones via WhatsApp. Big mistake?"
2. `56932e5bfeb8f4` - r/SaaS - "We hit $10K MRR this morning. Here's exactly what we're doing to get customers"
3. `00ab8a46768639` - r/SaaS - "How I got my first customers using my own tool (and what it cost)"
4. `92ba6d6b8ee0e8` - r/marketingagency - "Stuck at 10k/mo - pls help"
5. `f072b78409cf7c` - r/marketingagency - "How do you decide which companies to pitch when doing outreach?"

## Evidence Sources Used

- `sales/leadpulse_self_prospecting_ready_to_contact_latest.csv`
- `sales/leadpulse_self_prospecting_1000_latest.csv`
- `sales/leadpulse_self_prospecting_1000_review_latest.md`
- `sales/leadpulse_self_prospecting_quality_review.md`
- `sales/leadpulse_domestic_outreach_queue.csv`
- `sales/leadpulse_domestic_today_contact.csv`
- `docs/DATA_SOURCE_INGESTION.md`
- `docs/LEADPULSE_API_STABILITY_AND_OPEN_SOURCE_MAP.md`

No fake leads were added. No live scraping was performed in this worker task.
