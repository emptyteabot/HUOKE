# LeadPulse Xiaohongshu Dogfood Run - 2026-05-16

Ran the local feedgrab Xiaohongshu worker after manual login and pushed results into the live LeadPulse source ingestion endpoint.

## Queries

| Query | Limit | Feedgrab result | LeadPulse ingest result |
| --- | ---: | --- | --- |
| 获客太难了 | 5 | 5 notes found | processed=1, qualified=0, meeting_ready=0 |
| 线索质量差 | 5 | 5 notes found | processed=1, qualified=0, meeting_ready=0 |
| 找代运营 | 5 | 5 notes found | processed=1, qualified=0, meeting_ready=0 |
| 出海销售怎么做 | 5 | 5 notes found | processed=1, qualified=0, meeting_ready=0 |
| 投放成本太高 | 5 | 5 notes found | processed=1, qualified=0, meeting_ready=0 |

## Notes

- The Xiaohongshu search path is operational on the local worker.
- Feedgrab's `xhs-so` command writes summary files under `output/XHS/search/...` instead of the requested worker output directory, so the Windows worker now falls back to the latest XHS search output directory before ingestion.
- The corrected Chinese query runs produced conservative results: no qualified meeting was accepted because the summaries did not contain enough deterministic budget/contact evidence.
- Raw `output/` files remain local and are ignored by Git to avoid committing public account fragments into the repository.
