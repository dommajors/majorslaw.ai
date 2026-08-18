# Omen Dispatch — BKQ Readiness Sweep & MyCase Follow-Up Spread

**Date issued:** 2026-08-18
**Issued by:** dominic@majorslawgroup.com (via Claude Code cloud session)
**Targets:** Omen-1 and Omen-2 (local agent workstations)
**Status:** PREPARED — must be launched on each Omen locally (requires Claude in Chrome for BKQ, P: drive access, and MyCase access; none are reachable from the cloud session that authored this).

---

## Mission (both machines)

Work the BKQ client queue **oldest first**. For each client:

1. **Pull from BKQ** — run the `bkq-doc-sync` skill: pull all new client uploads and the BCI creditor export from BKQuestionnaire.com and file them into the client's P-drive folder under the SM-1 taxonomy. Never delete anything (SM-1 never-delete rule).
2. **Update the readiness review** — run the `matter-file-readiness` skill and refresh the client's R-1 readiness report in the matter folder: petition-formalization answer first, statement coverage matrix, asset/account table, transaction detail page, and the READY / PENDING PULL / BLOCKED / RED state.
3. **Create MyCase follow-up tasks** — per the spreading rules below. All client-facing communications are drafts for attorney review only; never send.

## Queue split (no collisions)

Build one shared oldest-first list from BKQ (by original intake/questionnaire date, ascending), then:

- **Omen-1** takes positions 1, 3, 5, … (odd)
- **Omen-2** takes positions 2, 4, 6, … (even)

Before starting a matter, claim it by creating (or checking for) the MyCase readiness-review task for that matter assigned to your machine's queue; if a claim already exists from the other Omen, skip to your next position.

## MyCase task-spreading rules

Spread follow-up work out so no single day is overloaded, but **client follow-up must stay reasonable — spreading never delays a client-facing chase beyond the window below**:

- **Client follow-up (missing docs, unanswered questions):** due date within **2 business days** of the readiness review that surfaced it. Never later — client chases don't get pushed to smooth workload.
- **BLOCKED or RED matters:** same-day task, flagged for attorney (Dominic) review; escalate per firm rules (Heather Benjamin for staff-level blockers).
- **Internal / non-client tasks (re-pulls, PENDING PULL rechecks, statement-cycle refreshes):** stagger across the next **5 business days**, max **6 tasks per assignee per day**. Overflow rolls to the next business day, oldest matters first.
- **Deduplicate:** one consolidated follow-up task per matter per cycle — never one task per missing document.

## Reporting

Each Omen logs matters processed, resulting readiness states, and MyCase tasks created (with due dates) to its run log, so the fleet standup (`fleet-standup`) can verify the sweep against records actually created.

## Launch instructions (human step)

On each Omen, in a local Claude Code / Cowork session with Chrome connected and P: mounted, paste:

> Run the 2026-08-18 BKQ readiness sweep per `ops/omen-dispatch/2026-08-18-bkq-readiness-sweep.md` in majorslaw.ai. You are Omen-1 [or Omen-2]. Work the oldest-first BKQ queue on your split, sync docs (bkq-doc-sync), refresh each R-1 readiness report (matter-file-readiness), and create MyCase follow-ups per the spreading rules. Client follow-ups due within 2 business days; drafts only, never send.
