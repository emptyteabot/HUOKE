# LeadPulse EYODF Outreach Protocol - 2026-05-17

This is the current operating record for LeadPulse selling LeadPulse.

## Positioning

- LeadPulse is an AI-driven lead supplier, not a login-first SaaS funnel.
- The promise is: only deliver high-intent customers that a human can actually follow up.
- Each delivered lead should include source context, pain summary, intent judgment, priority, and a suggested opener.
- Current monitored channels are limited to Xiaohongshu, Douyin, X/Twitter, and Reddit.

## Target Customers

- IELTS and study-abroad institutions looking for students.
- Study-abroad consultants and agencies handling 26Fall late-stage work and 27Fall early demand.
- Cross-border ecommerce operators, overseas marketing agencies, export B2B manufacturers, and foreign-trade service teams.
- AI startups, B2B SaaS teams, indie hackers, and automation service providers.
- High-ticket service teams with clear customer acquisition pain and enough budget to pay for qualified opportunities.

## Safety Boundary

- The Xiaohongshu account is not used for blind discovery/search.
- No bulk sending, no hidden automation, no platform bypass language, and no claims about guaranteed conversion.
- No WeChat, phone number, website link, or price in the first platform message unless the prospect explicitly asks.
- No private-data claim. LeadPulse only discusses public posts, public comments, and public demand signals.
- If the platform shows a frequency warning or the prospect has not replied, wait instead of chasing.

## LLM Copy Gate

This is context-first. Do not generate or paste a message from a target name alone.

Before calling the gate, collect enough context for the LLM API to understand the prospect:

- Profile context: role, business, recent post title/body, dates, concrete numbers, and whether they look like a decision-maker.
- Comment context: comments that prove buyer identity, budget, pain, or that they are a peer/competitor.
- Chat context: the latest prospect reply and what has already been sent.
- Lead evidence: 1-2 matched public samples with account IDs/post URLs and why they match this prospect's business.

Before any copy is pasted into MuMu or any social platform, run:

```powershell
python sales/llm_copy_gate.py --platform "小红书" --prospect-name "<account>" --industry "<industry>" --stage "opener" --profile-context "<public profile/post context>" --chat-context "<current chat state>" --lead-evidence "<sample context>" --user-intent "<what we want to do>"
```

Allowed output:

- `should_send=true`
- `risk_level=low` or `risk_level=medium`
- non-empty `context_understanding`
- `prospect_type=buyer` or `prospect_type=service_provider`
- `evidence_strength=medium|strong`
- first-touch/sample stages require `sample_fit=medium|strong`
- non-empty `message_text`

Blocked output:

- `should_send=false`
- `risk_level=high`
- `prospect_type=unknown|consumer|peer_competitor`
- weak/missing context or weak/missing sample fit
- empty `message_text`

MuMu paste wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File sales/social_gate_fill.ps1 -PasteToMuMu ...
```

The wrapper refuses to paste if context is too thin. It only pastes approved text and does not click send.

## Current Rule

LeadPulse must find its own customers first. The operator should not manually invent targets. The operating loop is:

1. Read local/public snapshots and existing LeadPulse queues.
2. Open the candidate with the small account and collect post/profile/comment context.
3. Exclude already-contacted accounts and obvious competitors.
4. Match 1-2 real public samples to the prospect's exact business.
5. Score the remaining target with the LLM copy gate.
6. Paste only approved short copy into MuMu.
7. Human reviews and clicks send.
8. Record reply, rejection reason, or wait state in `sales/leadpulse_50_outreach_week_2026-05-17.md`.

## 2026-05-17 State

- Sent: 4 Xiaohongshu accounts.
- Warm lead: `商派跨境出海记` replied with a boss account route.
- Gate decision: do not continue messaging `商派跨境出海记` for at least 24 hours because samples were already sent and the platform showed a frequency warning.
- Approved next-class target from local snapshot: cross-border logistics / overseas service accounts with recent acquisition pain, after LLM approval.
