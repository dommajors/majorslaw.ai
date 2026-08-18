# Verification Pass

Run this before delivering any MLG architecture diagram. **Spawn a subagent** so the check is independent of whoever wrote the map — self-checking finds far less.

## The prompt to give the verifier

> Read the file at [path] — an HTML architecture map for a law firm's AI agent fleet. Verify its factual claims against these project docs, using the `Projects` tool (`project_read` / `project_search`) — they live in the project, not on disk: [list the docs read during the build].
>
> Check specifically:
> 1. Every agent name, number, and ring assignment against the roster.
> 2. Every model tier badge against the Model Standard §4, including which identities have no tier.
> 3. Any ranked table — order and the content of every cell.
> 4. Every statistic and count against the source run.
> 5. Storage, credential, and access claims against the isolation directive.
> 6. Hardware claims — models, specs, counts, addresses, destinations.
> 7. Every date, quote, and specific figure.
>
> Report ONLY actual errors or unsupported claims — things that contradict a source or that no doc supports. Quote the map's text, quote the source, explain the discrepancy. If a claim is a reasonable paraphrase, do not flag it. If a category checks out, say so in one line. Do not rewrite the file.

## The four failure modes this exists to catch

Ranked by how often they have actually happened.

**1. Spec drawn as running.** A component on the build list rendered as an active safeguard. Worst in the continuity zone — a map that says the Warden trips agents safely, when the Warden is not built, is actively misleading about the thing it exists to explain. **Check every durability, monitoring, and failover claim against what the build prompt lists as already working versus on the build list.**

**2. An open question drawn as settled.** The record says "either A or B"; the map picks one — usually the more dramatic one, because it makes a better box. Check every red box against its source: is the alarming reading actually established, or is it one of two branches?

**3. A vendor or integration drawn as live when it is planned.** The record often carries an explicit no-live-claims ruling: it stays future-tense until it ships. Check integrations against those rulings, not against whether the name appears somewhere in the project.

**4. A superseded document treated as current.** Several project docs explicitly supersede earlier ones, sometimes hours later the same day. Building from the superseded version produces a confidently wrong recommendation. Check dates and look for "supersedes" headers.

## After the report

Fix every confirmed error before delivering. If a finding is a judgment call rather than a factual error, prefer the more conservative wording — these documents get quoted in decisions.

Mention in the response what verification caught. It is evidence the map can be trusted, and it tells the reader which parts were closest to wrong.
