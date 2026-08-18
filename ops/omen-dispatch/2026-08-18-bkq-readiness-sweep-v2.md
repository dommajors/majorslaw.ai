# Omen Dispatch v2 — Full BKQ Readiness Sweep, Heather Gate, and Roster Reconciliation

**Date issued:** 2026-08-18 (supersedes v1; v1 retained, never deleted)
**Authority:** D. Majors, directing personally this session
**Nodes:** Omen-1 = MLG-AGENT-1 (ODD client IDs) · Omen-2 = MLG-AGENT-2 (EVEN client IDs)
**Prereqs (already met):** Claude in Chrome connected; dedicated MyCase agent login per node; P: mounted; 17-skill set deployed.

## Mission

Every active BKQ client gets: full document pull + BCI export → R-1 readiness review → MyCase updated. Then one of two outcomes per client:

- **100% COMPLETE** (all questionnaire info + all required documents per SM-1 completeness bars): route to **Heather Benjamin** — MyCase task `{Last}, {First}: READY — final review for filing`, referencing the R-1 report path on P:.
- **NOT 100%:** prepare a **Client Readiness Report** (one consolidated draft per matter): states the matter targets filing **next month (September 2026)** and that filing requires ALL information completed and 100% of documents; lists every missing item with a need-by date. Draft saved to the matter folder — **for attorney review, never sent.**

## Standing rules (unchanged from today's rulings)

- Client-ID parity split; oldest first (intake/questionnaire date) within each half; MyCase claim task before starting any matter; skip if claimed.
- Direct-URL navigation in BKQ only; Delete/De-activate/Archive are forbidden controls; never delete anything (SM-1).
- MyCase follow-ups: client-facing due ≤ 2 business days, never later; BLOCKED/RED → same-day attorney-flagged task; internal rechecks staggered over 5 business days, max 6/assignee/day, oldest first; one consolidated task per matter; assignee = the matter's paralegal, else Legal Team.
- Reports to bare `_Readiness Reports\` in each matter folder, hash-logged. WA Bankruptcy matters held out pending taxonomy ruling — substitute and flag. Missing client folders: substitute and flag, never create.
- Batching: first 10 matters, stop and report for attorney sign-off; thereafter batches of 25 with a checkpoint report after each; stop on any anomaly.
- All client communications are drafts. Log everything, including node alias, for fleet standup.

## Reconciliation & old-case triage (Omen-1, Phase 0 — before its sweep)

1. Enumerate active clients from BKQ (Client Management) and from MyCase (open cases).
2. Build a crosswalk (name + IDs). Report: (a) in BKQ but not MyCase, (b) in MyCase but not BKQ, (c) name/ID mismatches or probable duplicates, (d) old-case triage — matters stale in either system (no activity/documents beyond the firm's refresh cycle) or closed in one but active in the other.
3. Write `P:\AgentConfig\reconciliation\BKQ_MyCase_crosswalk_2026-08-18.md`; create ONE MyCase task assigned to Heather Benjamin summarizing mismatches needing human resolution.
4. Then begin the ODD-ID sweep.
