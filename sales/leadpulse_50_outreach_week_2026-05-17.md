# LeadPulse 50 Outreach Tracker - Week of 2026-05-17

Goal: manually contact 50 potential B2B buyers or independent operators this week, then record the real reason they do or do not pay.

Rules:
- Manual send only. Codex may open pages and paste drafts, but the user clicks send.
- Any outreach copy, reply, follow-up, or sample handoff must first pass `sales/llm_copy_gate.py` with live LLM JSON approval.
- Do not use the main Xiaohongshu account for discovery/search.
- Before approving a Xiaohongshu lead, inspect the post comments when available. Comments can reveal whether the author is a real buyer, a peer/competitor, a low-budget consumer, or already being served.
- Keep outreach frequency conservative. Do not continue sending when the app shows a 24-hour single-chat limit or when the user is away.
- Planned operating split: use one MuMu/XHS small account for discovery and comment inspection; use the main account only for carefully selected manual outreach.
- First message stays inside the platform. No WeChat, no website link, no price unless they ask.
- No fake conversion-rate claims. Offer samples and concrete daily lead delivery.
- Record every reply, especially confusion, no budget, no need, wrong ICP, or platform concern.
- Copy quality rule: no robotic templates. Every opener/reply must quote one concrete post detail, number, or phrase from the prospect context. Avoid repeated wording like `我这边整理`, `公开平台主动`, `高意向线索`, `脱敏样本`, `看看方向`, `是否对口`.
- Sample rule: lead with 2 tightly matched real public samples, not a generic 3-sample pitch. If the sample does not match the prospect's business, block the send.

## Status

| Metric | Count |
| --- | ---: |
| Target sends | 50 |
| Sent | 8 |
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
| 8 | 2026-05-18 | 小红书 | 雅思独立老师 / IELTS招生 | 会rap更会教雅思的Tcai | 小号核验：04-19 主帖说独立招生累、卷营销号；评论区作者回复自己带学生累/机构更稳定；主页为雅思老师教育博主，有商品和小助理 | 雅思求课公开需求 -> 3条脱敏样本 | yes | pending |  | stop education vertical for now; switch industries |
| 7 | 2026-05-18 | 小红书 | 外贸B2B / Google Ads / 询盘质量 | A姐成长记录 | 小号核验：05-10 谷歌B2B广告4月花不到4000、询盘不到10个；评论区作者确认“是啊，b端的”；主页为外贸4人小团队负责人 | B端公开采购需求 -> 3条脱敏样本 | yes | pending |  | wait 24h; monitor for sample request |
| 6 | 2026-05-18 | 小红书 | AI初创 / 数字虚拟人 / GEO | Jin.N_AI Lab | LeadPulse XHS 自筛：昨天发帖，AI数字人/GEO项目已开始跑市场和客户，缺销售和小B客户资源 | 小B企业公开需求 -> 3条脱敏样本 | yes | pending |  | wait 24h; no second text before reply/follow |
| 5 | 2026-05-18 | 小红书 | 外贸工厂 / 厂二代 | 小满 | LeadPulse XHS 自筛：家里有工厂、有产品，想一个人做外贸，不知道怎么入手 | 海外找供应商公开需求 -> 3条脱敏样本 | yes | pending |  | wait 24h; no second text before reply/follow |
| 4 | 2026-05-17 | 小红书 | 出海营销 / 外贸独立站 | 商派跨境出海记 | 本地存量候选：外贸独立站 / 精准获客 | 外贸获客源头线索 -> 3条真实样本 | yes | pending |  | wait 24h; no further send without gate |
| 1 | 2026-05-17 | 小红书 | 留学机构 | UKEC英国教育中心英国区 | 英国留学中介费笔记 | 中介费/26fall评论需求 -> 3条样本 | yes | pending |  | wait |
| 2 | 2026-05-17 | 小红书 | 留学机构 | 厦门启德留学 | 文书好评合集 | 文书/选校/26-27fall求助帖 -> 3条样本 | yes | 不太明白后面两句话 | unclear_offer | 已发送简化解释，等是否要样本 |
| 3 | 2026-05-17 | 小红书 | 出海 SaaS / 私域工具 | SaleSmartly全渠道私域聊单工具 | 小红书主页：企业出海全渠道私域沟通工具 | WhatsApp/海外私域/出海获客需求帖 -> 5条样本 | yes | pending |  | wait |
 
## Live Notes

- 2026-05-18 15:2x CST: User rejected repeated/weak Xiaohongshu targets. Small account `127.0.0.1:5557` hit a Xiaohongshu safety/network warning after rapid search; stop live searching for now. LLM gate blocked non-education candidates `Aria不上班`, `小美`, `曹犟谈 AI`, and `冉四夕` because identity, budget, comments, or sample fit were insufficient. `伽境科技酱` only passed as medium risk/confidence 74 and must not be treated as P0 without profile/comment verification. Do not paste a new cold DM unless a fresh candidate satisfies: recent, decision-maker, spend/revenue pain, comment/profile proof, and real sample XHS IDs.
- 2026-05-18 late night CST: User paused for sleep. Stop all outreach and do not touch the main account while unattended. Next candidate `A姐成长记录` is only a pending candidate, not contacted. Tomorrow, verify post comments first, then rerun the LLM gate before any paste/send.
- 2026-05-17 21:14 CST: `商派跨境出海记` replied with a personal Xiaohongshu contact route. Sent 3 de-identified cross-border/source-lead samples inside the existing chat. Status: warm lead, waiting for sample feedback.
- 2026-05-17 21:3x CST: installed `sales/llm_copy_gate.py` and `sales/social_gate_fill.ps1`. Hard rule: no draft, reply, or pasted text goes into MuMu unless the live LLM gate returns `should_send=true`. The current `商派跨境出海记` chat was re-scored as `do_not_reply` for now; wait 24 hours.
- 2026-05-17 21:5x CST: LeadPulse self-selected new Xiaohongshu candidates from local snapshots, not user-supplied targets. `王顾问聊外贸｜专注跨境获客` passed the live LLM gate as a medium-risk first touch; `伽境科技酱` passed as a low-risk first touch; `导数科技AI赋能` was blocked as likely competitor/peer. Current MuMu back stack no longer contains those result cards, so do not use the main account for blind search unless explicitly approved.
