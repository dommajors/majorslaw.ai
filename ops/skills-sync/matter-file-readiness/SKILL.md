---
name: matter-file-readiness
description: >
  Majors Law Group · Bankruptcy.AI — Matter File Organization & Readiness Completeness
  Contract + Readiness Report Format (R-1). Use for ANY bankruptcy matter folder work:
  organizing a client file, running a file readiness review, verifying document completeness,
  filing/re-filing documents, or producing readiness or client reports. Defines the folder
  taxonomy (SM-1), the never-delete rule, per-folder completeness bars, the READY / PENDING
  PULL / BLOCKED / RED states, and the required report structure: petition-formalization
  answer first, statement coverage matrix, asset/account table, transaction detail page.
  Triggers: "readiness review", "file review", "organize the matter", "is this file ready",
  "check the client folder", "completeness check", "case readiness".
---

# MATTER FILE ORGANIZATION & READINESS COMPLETENESS CONTRACT

Majors Law Group · Bankruptcy.AI · defines how a client matter folder is
organized AND what must be present in each part before a readiness review
can pass. Paste to the organizing/verification agent. Never deletes anything.

## PRIME DIRECTIVE — NOTHING IS EVER DELETED

No file is ever deleted, moved out of the matter, or overwritten.

- A replaced document is superseded, not removed: the old version moves to `_superseded\`
  within the same folder, renamed with its date and a one-line reason
  (`Paystub_2026-05_SUPERSEDED_replaced-by-corrected.pdf`).
- Filenames are versioned, never reused: `..._v1`, `..._v2`.
- The current version is the one NOT in `_superseded\`. Every version's hash is logged.
  Litigation-hold matters are read-only end to end.

## FOLDER TAXONOMY (SM-1)

Under the jurisdiction root (`WA Bankruptcy\`, `AZ Bankruptcy\`, `CA Bankruptcy\`), each
matter is `{Last}, {First}` — joint `{Last}, {First1} & {First2}`. The root .bcb/.bci is
the matter's identity. Inside:

```
Intake & Retainer\
Petition\
Court Order\
Sched A B – (Financial Accounts)\
Sched A B – (Residence)\
Sched A B – (Taxes)\
Sched A B – (Vehicles)\
Sched I J MT – (Income)\
Trustee Docs\
_Readiness Reports\       (agent write lane)
_Client Reports\          (agent write lane)
_superseded\              (never-delete shelf; may appear in any folder)
```

Folder names are classification priors, not proof — a document is filed by its CONTENT,
not its filename or where it landed (the "Venmo rule"). A paystub found in the Vehicles
folder is still a paystub, and its misfiling is a finding for review.

## READINESS COMPLETENESS — WHAT "DONE" MEANS PER FOLDER

A readiness review passes only when every folder below meets its bar. Anything short is
not "empty" — it is a named gap (PENDING PULL / MISSING / STALE), never silently treated
as done.

### Intake & Retainer

- Both credit-counseling certificates (valid within 180 days of the projected filing
  date — expiry tracked, not assumed).
- Photo ID and SSN verification present (identity confirmed; last-four only in any report).
- **Attorney amendment 2026-08-10: the fee agreement / signed retainer is NOT a readiness
  requirement and is not reported as a gap.**

### Petition

- Root .bci present (matter identity) plus the supporting documents the petition is built
  from (IDs, SSNs, creditor data, income proof, tax returns, secured-debt docs,
  prior-bankruptcy info, lawsuit info).
- **Attorney amendment 2026-08-10: when the supporting documents are in hand, the petition
  is NOT flagged as an issue or a gap — the working petition set lives in case software.
  Report answers "can we formalize the petition today?" instead (see R-1).**

### Court Order

- Any entered orders (mirrors the ECF record; empty pre-filing is fine).

### Sched A B – (Financial Accounts)

- Every disclosed account has statements covering the full six-month CMI window through
  the petition date — no gaps, every page.
- Closed accounts show a closing statement or closure proof.
- Any deposit unexplained by disclosed income is flagged; ≥$600 questionable deposits
  carry an explanation or a register entry.
- **Byte-identical duplicate check is standard: statements (or W-2s, or any per-period
  document) whose file sizes/hashes match across different periods are presumed to be the
  same document uploaded repeatedly — flag for re-pull.**

### Sched A B – (Residence)

- Deed/title or lease; current mortgage statement; most recent tax-assessed or appraised
  value; HOA if any. Homestead basis documented. The client's good-faith value estimate
  is sufficient to formalize Schedule A/B.

### Sched A B – (Taxes)

- Most recent filed returns (per district requirement); refund status; any owed-tax
  documentation. The §521(e) trustee copy is staged.

### Sched A B – (Vehicles)

- Title or registration each vehicle; current payoff/statement if financed; valuation
  basis (NADA/KBB or client's good-faith estimate); statement of intention support.

### Sched I J MT – (Income)

- Six months of pay advices for every earner, plus proof for every non-wage income source.
  Self-employment: P&L reconciled to deposits.
- No wage earners (e.g., Social Security / retired): no pay advices required — stage a
  declaration of no payment advices instead. SS is excluded from CMI; check VA benefits
  for HAVEN Act exclusion.
- Enough to run the means test AND populate I/J — a number with no backing document is a
  gap, not an entry.

### Trustee Docs

- The predicted trustee-package checklist, staged to ~80% pre-filing; the petition-spanning
  statement is PENDING-BY-DESIGN, not an alarm.

### _Readiness Reports\ / _Client Reports\

- Agent-written only, versioned, hash-logged, never overwritten.
- **NAMING REALITY — verified on P: 2026-08-17.** On disk these lanes are commonly named
  with the matter as a *prefix* — `Myers, Tina & Travis_Readiness Reports\`,
  `Myers, Tina & Travis_Client Reports\` — not the bare `_Readiness Reports\` form used
  throughout this document. **Match what is on disk.** Never create a bare-underscore twin
  beside an existing prefixed lane; that silently splits a matter's report history across
  two folders. If neither form exists, raise it as a finding rather than guessing.
  Consequence for IT: an NTFS ACL written against the literal string `_Readiness Reports`
  matches nothing. See BAN-236.

## THE READINESS RULE

Every schedule/form is READY, PENDING PULL (identified, awaiting a document that exists),
BLOCKED (needs a human decision), or RED (a problem — missing where required, unexplained,
or stale). A matter is review-ready only when nothing sits in RED and every PENDING has a
name and an owner. A gap is always a labeled state — never a blank quietly passed as
complete. Thresholds, coverage windows, and validity periods come from the live rules
store, never from memory.

# READINESS REPORT FORMAT (R-1) — REQUIRED STRUCTURE

Every readiness report is produced exactly this way. Adopted by attorney instruction
2026-08-10 (Myers v3 is the model).

## Report identity — every report, no exceptions

- **Timestamped**: local time + UTC in the header AND in the filename:
  `Readiness_Report_{YYYY-MM-DD}_{HHMM}{TZ}_v{N}.docx`.
- **Versioned forward**: a refresh is a new version; the prior report is never edited or
  overwritten. Header states which version it supersedes and what changed on whose
  instruction.
- **Hash-logged**: SHA-256 of every version appended to `Hash_Log.txt` in
  `_Readiness Reports\` (a file cannot embed its own hash — the log carries it).
- **Scan basis stated**: recursive inventory at report time; entry count; note whether
  contents were readable or names/metadata only.

## Page 1 — THE ANSWER FIRST

Open with **"Can We Formalize the Petition Today?"** — YES or NO in bold, one paragraph,
followed by a checklist table: each item required to formalize, HAVE / NEED status, and a
one-line note. Client-side inputs (value estimates, confirmations) are listed as NEED with
owner = client, and do NOT flip the answer to NO if good-faith estimates suffice.
No hedging, no burying the answer under inventory.

## Page 2 — STATEMENT COVERAGE MATRIX

One row per account (banks AND payment apps), one column per month across the CMI window
(computed from the target filing month — e.g., Feb 1–Jul 31 for an August filing).
Each cell: ✓ in file / MISSING / — not required. Final column: date(s) each batch was
received into the matter. Below the matrix, one bold line totaling what is missing.
Byte-identical uploads across months are called out in the matrix row.

## Page 3 — ASSETS & ACCOUNTS TABLE

One row per asset and account: what documents are in file, the dates received, and
exactly what is missing ("Nothing" when complete). Covers residence, every vehicle,
trailers/toys, retirement/pension, every bank account, every payment app, each debtor's
income proof, and taxes.

## Page 4 — TRANSACTION DETAIL

A separate page scanning ALL bank statements at transaction level, showing per account
per month: opening/closing balances; every deposit source-matched against disclosed
income; flags on any deposit ≥$600 without an explanation; transfers between the debtors'
own accounts and apps; and payments to any single creditor ≥$600 in the 90 days
pre-filing (preference window). If content access is unavailable (e.g., network-drive
block), the page is included, marked **BLOCKED**, states exactly why and the two unblock
paths (run on the office computer, or connect a local copy) — never silently omitted.

## Standing case rules (carried into every report)

- When a .bci arrives: verify any pending lawsuit appears on **SOFA Part 4** AND the
  plaintiff creditor is on **Schedule E/F cross-referenced to the suit**. Never modify a
  .bci file.
- Fee agreement: not a requirement, not a gap (attorney 2026-08-10).
- Insurance declaration pages: do not hold up readiness on ID card vs. dec page
  (attorney 2026-08-10).
- Credit counseling cert dates are stated with the window math shown (cert date +180 days
  = last filing day covered).

# AGENT BEHAVIOR

Organizing agents propose re-files and flag misfilings; they never move a client's original
except into `_superseded\` under the never-delete rule, and only with a logged reason.
Discovery is by scanning the jurisdiction root: any child folder with a root .bci is a
matter. Reads are read-only; the only writes are the underscore lanes.

**AMENDMENT — 2026-08-17, D. Majors ruling of 2026-08-16 evening.** The sentence above
("the only writes are the underscore lanes") is **superseded for local-execution nodes**.
OMEN-2 (`MLG-AGENT-2`) was granted four write scopes: BKQ pull, **SM-1 filing**, readiness
reports, and drafts. SM-1 filing writes *into matter subfolders*, which is broader than the
underscore lanes. What did **not** change, and what still governs every write:

- **Nothing is deleted, renamed, or moved.** A misfile remains a FINDING, never a fix an
  agent performs. Superseding means writing a NEW versioned file, never overwriting.
- **Before any write, confirm the target path does not already exist.** If it does, bump
  the version. This is now the primary safeguard, because as of this amendment the
  never-delete rule is **prompt-enforced only** on OMEN-2 — there is no ACL denying delete
  (BAN-236). Treat every write as unprotected by the file system until that closes.
- Filing a newly-arrived document into its SM-1 subfolder is permitted. Reorganizing,
  consolidating, or cleaning up existing filings is **not**.

Report preparation sequence: (1) recursive inventory scan; (2) compute CMI window from
target filing month; (3) build coverage matrix + asset table from inventory; (4) run
byte-identical duplicate check; (5) transaction scan if contents readable, BLOCKED page
if not; (6) answer the formalization question; (7) timestamp, version, hash, write to
`_Readiness Reports\`.
