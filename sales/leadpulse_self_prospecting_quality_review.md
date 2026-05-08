# LeadPulse Self-Prospecting Quality Review

Generated: 2026-05-08

## Files

- `leadpulse_self_prospecting_1000_latest.csv`: 1000-row cross-industry candidate pool.
- `leadpulse_self_prospecting_candidate_1000_latest.csv`: same 1000-row candidate pool, explicit name.
- `leadpulse_self_prospecting_ready_to_contact_latest.csv`: stricter 784-row A/B pool for first outreach.
- `leadpulse_self_prospecting_1000_review_latest.md`: automated distribution report for the 1000-row candidate pool.
- `leadpulse_self_prospecting_ready_to_contact_review_latest.md`: automated distribution report for the stricter ready pool.

## Final Counts

Candidate 1000 pool:

- Rows: 1000
- Tier A: 651
- Tier B: 349
- Missing public source URL: 0
- Rows with review flags: 45
- Sources: 38 existing live targets, 866 subreddit Reddit RSS, 96 global Reddit RSS

Ready-to-contact pool:

- Rows: 784
- Tier A: 458
- Tier B: 326
- Missing public source URL: 0
- Rows with review flags: 57
- Sources: 42 existing live targets, 693 subreddit Reddit RSS, 39 global Reddit RSS, 10 GitHub repos

## Agent Review Findings

Four parallel review agents inspected the first generated 1000-row pool in 250-row slices.

Consistent findings:

- The first-pass 1000 rows were directionally useful, but scoring was too optimistic.
- Missing public URLs must not be treated as ready outreach targets.
- Query terms must not be treated as evidence unless the same pain appears in title or body.
- Recruiting, education, and content-heavy rows need stricter filtering because they often contain career discussion or vendor content rather than buyer intent.
- The list is a public-signal prospecting pool, not a verified company database.

Actions taken after review:

- Removed query terms from pain scoring.
- Added stricter negative filters for job/career/sensitive/vendor/self-promotion patterns.
- Required public source URLs for final output.
- Split output into candidate and ready-to-contact files.

## Use Rules

- Use `ready_to_contact_latest.csv` for the first 50-100 manual outreach attempts.
- Use `candidate_1000_latest.csv` as a research pool, not as an automatic send list.
- Before sending, skim the source URL and confirm the author looks like a business operator or decision influencer.
- Do not promise private contact data. The offer is public-signal discovery plus manual cleaning.
- If any row has `risk_flags`, treat it as manual-review even when score is high.

## Recommended First Outreach Segment

Start with:

1. Marketing agencies
2. B2B SaaS and startups
3. Coaches and consultants
4. Ecommerce/DTC
5. Local services

Avoid using education/training and creator rows until manually checked.
