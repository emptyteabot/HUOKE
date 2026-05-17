# LeadPulse 50 Outreach Tracker - Week of 2026-05-17

Goal: manually contact 50 potential B2B buyers or independent operators this week, then record the real reason they do or do not pay.

Rules:
- Manual send only. Codex may open pages and paste drafts, but the user clicks send.
- Any outreach copy, reply, follow-up, or sample handoff must first pass `sales/llm_copy_gate.py` with live LLM JSON approval.
- Do not use the main Xiaohongshu account for discovery/search.
- First message stays inside the platform. No WeChat, no website link, no price unless they ask.
- No fake conversion-rate claims. Offer samples and concrete daily lead delivery.
- Record every reply, especially confusion, no budget, no need, wrong ICP, or platform concern.

## Status

| Metric | Count |
| --- | ---: |
| Target sends | 50 |
| Sent | 4 |
| Replies | 2 |
| Positive sample requests | 1 |
| Clear rejections | 0 |

## Rejection Reasons To Tag

| Tag | Meaning |
| --- | --- |
| unclear_offer | They do not understand what LeadPulse does |
| no_need | They say they do not need leads now |
| no_budget | They are unwilling to pay or have no budget |
| wrong_icp | They are not a buyer or not the right business type |
| distrust | They do not trust data source, quality, or identity |
| platform_safety | They worry about platform rules or privacy |
| already_solved | They already have a lead source or agency |
| wants_samples | They ask to see samples first |
| no_reply | No reply after 48 hours |

## Outreach Log

| # | Date | Platform | Industry | Account | Source / Note | Message Angle | Sent | Reply | Rejection Tag | Next Step |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | 2026-05-17 | 小红书 | 出海营销 / 外贸独立站 | 商派跨境出海记 | 本地存量候选：外贸独立站 / 精准获客 | 外贸获客源头线索 -> 3条真实样本 | yes | pending |  | wait 24h; no further send without gate |
| 1 | 2026-05-17 | 小红书 | 留学机构 | UKEC英国教育中心英国区 | 英国留学中介费笔记 | 中介费/26fall评论需求 -> 3条样本 | yes | pending |  | wait |
| 2 | 2026-05-17 | 小红书 | 留学机构 | 厦门启德留学 | 文书好评合集 | 文书/选校/26-27fall求助帖 -> 3条样本 | yes | 不太明白后面两句话 | unclear_offer | 已发送简化解释，等是否要样本 |
| 3 | 2026-05-17 | 小红书 | 出海 SaaS / 私域工具 | SaleSmartly全渠道私域聊单工具 | 小红书主页：企业出海全渠道私域沟通工具 | WhatsApp/海外私域/出海获客需求帖 -> 5条样本 | yes | pending |  | wait |
 
## Live Notes

- 2026-05-17 21:14 CST: `商派跨境出海记` replied with a personal Xiaohongshu contact route. Sent 3 de-identified cross-border/source-lead samples inside the existing chat. Status: warm lead, waiting for sample feedback.
- 2026-05-17 21:3x CST: installed `sales/llm_copy_gate.py` and `sales/social_gate_fill.ps1`. Hard rule: no draft, reply, or pasted text goes into MuMu unless the live LLM gate returns `should_send=true`. The current `商派跨境出海记` chat was re-scored as `do_not_reply` for now; wait 24 hours.
- 2026-05-17 21:5x CST: LeadPulse self-selected new Xiaohongshu candidates from local snapshots, not user-supplied targets. `王顾问聊外贸｜专注跨境获客` passed the live LLM gate as a medium-risk first touch; `伽境科技酱` passed as a low-risk first touch; `导数科技AI赋能` was blocked as likely competitor/peer. Current MuMu back stack no longer contains those result cards, so do not use the main account for blind search unless explicitly approved.
