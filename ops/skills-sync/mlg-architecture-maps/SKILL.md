---
name: mlg-architecture-maps
description: Build or update MLG's architecture diagrams from the current project record — the Fleet Architecture Map (hardware, agents, gates, failure domains) and the Total MLG Architecture (the whole business, lead through closure, across all rings and systems). Use when asked to update the fleet map, show the current architecture, regenerate the diagram, build a total/overall architecture view, or reconcile the map after a directive changes. Reads the project docs, rebuilds every zone from source, verifies claims before delivering, and versions rather than overwrites.
---

# MLG Architecture Maps

Two diagrams, one engine. Both are **reconciliations**, not drawings — the value is that every box traces to a project document, and that the gaps and contradictions show up as marked boxes instead of being smoothed over.

## Which diagram

| Ask | Build |
|---|---|
| "update the fleet map," "the architecture map," hardware/agents/gates | **Fleet Architecture Map** — §3 |
| "total architecture," "the whole thing," "overall MLG," lead-to-closure, how the business runs | **Total MLG Architecture** — §4 |
| Unclear | Ask which. They are different documents with different audiences — the fleet map is for Daniel and the build; the total map is for explaining MLG to a person. |

## 1. Read first — always

**Never build from memory or from a previous version of the map.** The record moves fast, and a stale map that looks current is worse than no map. Read the sources every time.

Use the `Projects` tool (`project_read`, `project_search`). These live in the project, not on disk.

**Core, read every time:**

- `claude/MLG-Agent-Roster-Master-Aug-13.md` — the agent population, ring assignments, autonomy, gates. **The authority on who exists.**
- `claude/Model-Standard-MLG-Fleet.md` — tier per contract. The authority on what model each agent runs.
- The **most recent** `Roadmap-Update-*.md` — current state, live exposure, blockers, open rulings.
- The **most recent** `Nightly-Metrics-*` and one or two recent `FileReview-Hourly-*` — measured operating state.
- `claude/P-Drive-Isolation-Directive.md` — the isolation model.
- `claude/Continuity-and-Local-Execution-Decision.md` — failure domains, continuity ladder.

**For the fleet map, also:**

- `claude/Desktop-Commander-Setup-and-Operating-Guide.md` — execution layer
- `claude/Fleet-Relocation-Plan-Home-Direct-Connect.md` — site topology
- `claude/Mac-Mini-Role-Proposal.md` · `claude/Local-Model-Options-For-Mac-Minis.md` — mini roles, local inference

**For the total map, also:**

- `claude/mlg-master-architecture-lead-to-closure.html` · `claude/mlg-client-journey-flow.html` — the stage sequence
- `claude/Directive-Two-Apps-Website-and-MVP.md` · `claude/Directive-Intake-Website-Buffer-Architecture.md` — the two-app split and the buffer
- `claude/Data-Exchange-Contract-v2-LOCK.md` — the bridge
- The most recent Master Report — live deviations

**Then check for anything newer.** `project_info` lists docs newest-first. Anything created since the last map version is by definition a change the map does not yet reflect. Read it.

## 2. The rules that make these maps trustworthy

These are not style preferences. Each one exists because breaking it produced a wrong diagram.

**Mark what is unresolved, do not resolve it.** Where two documents disagree, the map shows both and names the ruling. Where a count is unknown, the box says unknown. A map that silently picks an answer teaches everyone the wrong thing and buries the decision.

**Spec is not observation.** If a component appears on a build list and not in "what already works," the map must say so. Never draw an unbuilt safeguard as an active one — especially in the continuity zone, where the whole point is what happens when things fail.

**Ruled decisions that contradict standing directives get an amendment note, not a silent redraw.** When the principal rules something that reverses a written directive, the map records the reversal, quotes what it supersedes, and names what it costs. Otherwise the control quietly stops being enforced and nobody notices.

**Every number traces to a source.** Metrics, counts, dates, dollar figures — from the docs, verbatim. If a figure cannot be traced, it does not go on the map.

**Supersede, never overwrite.** Write a new dated file. The firm's standing rule is nothing deleted. See §6.

**Don't editorialize about people.** The map names constraints ("the release queue filled and did not drain") not blame. Keep it structural.

## 3. Fleet Architecture Map — zones in order

1. **Header** — version, date, what it supersedes, legend.
2. **What changed** — the delta since the prior version, one line each. This is the most-read part of the document; write it last, after everything else is settled.
3. **Operating state** — six stat tiles from the most recent measured run. Label the date measured, not the date rendered.
4. **Physical layer** — sites, machines, storage, network segments. If topology spans sites, show the sites separately with the link between them and what that link costs.
5. **Execution layer** — how Claude reaches firm files. Local execution vs. local inference kept distinct; they get confused constantly.
6. **Cloud & identity** — M365, spine, Base44, Anthropic, client-facing surfaces. Flag unmapped or non-compliant surfaces in red.
7. **Tools in transition** — what is being phased out and what still depends on it.
8. **The rings** — three columns, every identity numbered, tier badge on each. Strike through anything recommended for retirement.
9. **Gates** — Gate 5, plus any gate awaiting signature, plus any gate not being worked.
10. **Failure domains** — ranked by what reaches a client, with mitigation per row. Re-rank when topology changes.
11. **Open rulings** — only the ones whose answer redraws a box.

## 4. Total MLG Architecture — the whole business

Different question: *how does a person become a filed, closed case, and what touches them along the way?* Left-to-right by stage, not by machine.

1. **Header + the one-sentence thesis** — what MLG actually is. Note that the firm's own identity statement is contested (F-5); reflect the contest rather than picking.
2. **The stages** — Lead → Consult → Retained → Intake → Chasing → Readiness → Pre-Filing → Filed → Post-Filing → 341 → Plan/Discharge → Closure. **Doc drift warning:** the Aug 12 master architecture and the Aug 10 journey docs sequence the early stages differently. Show the conflict.
3. **Per stage:** who owns it (agent, ring, or human), what system holds the data, which gate sits above it, what a client sees.
4. **The two apps and the buffer** — website and MVP, the narrow bridge, one direction only.
5. **The rails** — mail, SMS, voice, e-sign, ECF, trustee portal, records retrieval.
6. **Where humans sit** — Gate 5, REVIEWS, Exceptions, the release queue. Make it obvious the humans are load-bearing.
7. **What is live vs. built vs. blocked** — three visual states, honestly assigned.

## 5. Build

Start from `assets/template.html` — it carries the full design system (palette, type, every component class). See `references/design-system.md` for the visual language and when to use which component.

Single self-contained HTML file. Inline all CSS. Inline SVG icons, no icon libraries, no external JS. Fonts from Google Fonts is the one permitted external reference.

**Then verify before delivering** — `references/verification.md` has the pass. Do not skip it. On the last three builds it caught unbuilt components drawn as running, an open question drawn as settled fact, and a vendor drawn as integrated that the record says is not yet live. Spawn a subagent for it so the check is independent of the writing.

## 6. Deliver

1. Write a **new dated file**: `claude/mlg-fleet-architecture-map-v{N}-{YYYY-MM-DD}.html`. Never overwrite a prior version.
2. `project_write` it to the project.
3. `SendUserFile` with `display: "render"`.
4. `mcp__remote-devices__create_artifact` so it persists in the artifact gallery — these are reference documents people return to, which is exactly the case for persisting.
5. In the response: lead with what changed and anything that got flagged, not a tour of the document. They can read it.

## 7. When a directive changes mid-build

This happens often — the principal rules something new while the map is being built. Correct handling:

1. Apply the ruling to the map.
2. Add an amendment note quoting the directive text it reverses.
3. List the acceptance checks or documents that now need re-running or editing, as an open item.
4. Say so plainly in the response. Not as a warning — as a record. The value is that it gets written down while it is still fresh.
