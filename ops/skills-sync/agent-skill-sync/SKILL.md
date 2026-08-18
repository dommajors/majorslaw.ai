---
name: agent-skill-sync
description: Keep AI agent implementations, workflow prompts, automations, and skills synchronized across every durable source that governs them. Use whenever any agent is created, developed, changed, configured, patched, deployed, audited, or materially revised — Bankruptcy.AI agents, MyCase/ECF agents, workflow agents, automation agents, or any agent-facing instruction set — in Codex, Claude Code, or Cowork.
---

# Agent Skill Sync

## Core rule

When creating or changing an agent, update the corresponding durable instruction source in the same workflow. Do not rely on chat memory alone for reusable operating rules.

## The durable sources — there is more than one

An MLG agent can be governed by up to three copies of the same instructions. A change to one that is not made to the others **is** the drift this skill exists to prevent.

| Source | Path | Who reads it |
|---|---|---|
| Codex skills | `C:\Users\Dom\.codex\skills\{name}\SKILL.md` | Codex sessions |
| Account skills | claude.ai account skills (synced to `~/.claude/skills/synced/`) | Cowork + Claude Code |
| Project skills | `.claude/skills/{name}/SKILL.md` in the repo | Claude Code in that repo |

Before editing, name which sources exist for this agent. After editing, state which you updated and which still need it. **Never report a source as updated when you only proposed a change to it.**

In Cowork the on-disk skill files are a **read-only cache** — editing them changes nothing in the account. Deliver the corrected `SKILL.md` or `.skill` package with `SendUserFile` and report it as *delivered*, never as *saved*.

## Required workflow

1. Identify the agent or workflow being created, changed, audited, or configured.
2. Identify **every** durable source that governs it (table above).
3. Run the invariant check below before writing any rule.
4. Update the source for any durable change involving:
   - behavior or routing;
   - safety, privacy, or client-communication rules;
   - source-of-truth changes;
   - tool, app, mailbox, portal, or file-system handling;
   - validation, logging, time-entry, or checklist requirements;
   - known failure modes or escalation paths.
5. If no durable source exists and the behavior should recur, create or propose a new skill.
6. Keep the skill concise. Save reusable rules, not chat history.
7. Validate the changed skill, or manually inspect the frontmatter and changed sections if validation tooling is unavailable.
8. Mention the skill/instruction update in the final response.

## Invariant check — run before writing any agent rule

MLG agent contracts are bounded by standing directives that a well-meaning prompt can silently violate. Check the rule you are about to write against each of these, and if it conflicts, **stop and escalate rather than writing it**:

- **P-drive access.** Four credentials were specified, all Vault-side: G2 (read), G3 (read + `_Readiness Reports\`), Custodian (read, proposes re-files), Interpreter (root `.bcb`/`.bci` read + `_Client Reports\`, post-approval only). Watchtower agents (svc-mlg7) hold no P-drive credential at all. **Never grant an agent a lane in prose that it does not hold in ACL.**

  **AMENDMENT — 2026-08-17, D. Majors ruling of 2026-08-16 evening.** The invariant *"No agent holds two write lanes"* is **superseded for local-execution nodes**. OMEN-2 (`MLG-AGENT-2`) holds four: BKQ pull, SM-1 filing, readiness reports, drafts. Roster re-cut ordered (BAN-145) — the Vault/Watchtower split assumed cloud-resident agents and no longer describes what is being built.

  **What this costs, and what you must therefore check.** The "never grant a lane in prose it does not hold in ACL" rule now runs in reverse on OMEN-2: the agent holds lanes in prose that the ACL does not constrain *at all*. The P: mount authenticates as `majorslawgroup\bkai`, which inherits Domain Users rights — FullControl on `P:\Client Docs`, delete included. **There is no ACL denying delete anywhere on that path (BAN-236).** Until it closes, treat every P: write rule you author as prompt-enforced only, say so explicitly in the skill you are writing, and never describe the never-delete rule as enforced.
- **Gate 5.** Nothing files, sends to a client, or finalizes without the attorney. A paralegal greenlight is QC, never authority.
- **One sender.** Comms Rails alone transmits. Vault drafts and cannot send. `info@` for status/fees/scheduling; `documents@` for every document ask.
- **Two nudges.** Two automated messages, then a named human. Never a third. Any other cadence in a spec is a human task's recurrence, not an extra email.
- **Never delete.** Supersede into `_superseded\`, version forward, hash-log. Nothing is overwritten.
- **Projected is not scheduled.** A computed 341 date is internal. Client-facing dates come only from OFFICIAL records or from our own document deadlines.

If a boundary rule is copied from an existing skill, **re-verify it against the directive rather than trusting the source skill** — a wrong clause propagates every time a new agent is cut from an old one.

## Safety defaults

- Treat security, privacy, and client-delivery rules as skill-worthy by default.
- For Majors Law Group, Bankruptcy.AI, ECF, MyCase, BKQ, and client-document agents, preserve secure delivery rules in durable instructions before repeating the workflow.
- Do not update unrelated skills merely because they are nearby; update the narrowest source that will reliably govern the future behavior.
- **If the agent changed but the skill update is blocked** — no write access, a pending attorney ruling, or an unresolved conflict with a standing directive — say so explicitly in the final response, name what is blocking it, and leave an `ATTORNEY TODO` or `SYNC PENDING` marker in the affected source. A silent skip is the failure this skill exists to prevent.
