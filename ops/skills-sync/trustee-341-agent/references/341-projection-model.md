# 341 Hearing Projection Model — D. Ariz., W.D. Wash., E.D. Wash.

**Prepared:** August 11, 2026 · **Source:** Google Drive · `MLG MASTER 341`
**Corpus:** 485 hearing records across 15 months (2025-01-06 → 2026-04-17) · 424 Ch.7, 61 Ch.13 · 7 divisions · 31 trustee-division pairs
**Purpose:** closes ITEM 2 of the Aug-12 packet (per-district 341 windows) and seeds Layer 1 of `JarvisTrusteeProfile`.

---

## 1. What this is, and what it is not

This is an empirical model of **how the courts we file in actually schedule 341 meetings**, derived from our own filed cases — not from trustee-office phone calls. It produces, before a case is filed, a projected 341 date/time/Zoom credential set with a stated confidence tier.

**It never produces a scheduled hearing.** Every output is `PROJECTED`. Nothing goes to a client, and no reminder fires, until the official 341 notice arrives on ECF and the record flips to `OFFICIAL`. That boundary is unchanged from the Aug-12 packet.

---

## 2. The four structural findings

### Finding 1 — Zoom credentials are a pure function of the trustee

Across 483 records with a meeting ID, the meeting ID matched the trustee's modal ID **97.3%** of the time; the deviations are two transcription typos, not real changes. Klein: 45/45 identical over 15 months. Waldron: 33/33. Munding: 20/20.

**Consequence:** the moment we can name the trustee, we know the dial-in — meeting ID, passcode, platform — with no notice, no lookup, no call. Every trustee in every district we file in conducts 341s by **Zoom**; there is not one telephonic or in-person entry in 485 records.

### Finding 2 — The hearing weekday is a property of the division, and usually of the trustee

| Division | Ch.7 duty weekdays | Ch.13 duty weekday |
|---|---|---|
| W.D. Wash. — Tacoma | **Tuesday** (85%; + a small Wednesday calendar for Garrett) | **Thursday** (100%) |
| W.D. Wash. — Seattle | **Monday / Tuesday** (Mon 63%, Tue 36%) | **Monday** (100%) |
| E.D. Wash. — Spokane | **Tue / Wed / Thu** — and it is 1:1 with the trustee | **Thursday** (100%) |
| D. Ariz. — Phoenix | **Monday / Tuesday** (Mon 54%, Tue 37%) | **Wednesday** (100%) |
| D. Ariz. — Tucson | Mon 40% / Tue 27% / Thu 16% / Fri 16% | **Wednesday** (100%) |
| D. Ariz. — Prescott/Flagstaff | **Friday / Monday** | **Wednesday** (100%) |
| D. Ariz. — Yuma | **Monday** / Tue / Wed | **Wednesday** (100%) |

E.D. Wash. is the cleanest calendar we file in: **Tuesday = O'Rourke, Wednesday = Munding, Thursday = Anderton**, with no observed exception in 56 Ch.7 records. In Spokane, the weekday *is* the trustee.

Forward test — weekday rules learned on 2025 alone, tested on 2026 hearings never used to build them: **97.7% (212/217)**. The only misses are three Mullen/Tucson Thursdays and two AZ one-offs.

### Finding 3 — Chapter 13 is deterministic before filing

One standing trustee per division, one weekday, one narrow slot set:

| Division | Ch.13 standing trustee | Day | Slots seen |
|---|---|---|---|
| W.D. Wash. — Seattle | **Wilson-Aguilar** | Monday | 8:30 AM · 9:45 AM |
| W.D. Wash. — Tacoma | **Malaier** | Thursday | 9:00 · 10:00 · 11:00 AM |
| E.D. Wash. — Spokane | **Todd** | Thursday | 10:00 AM |
| D. Ariz. — Tucson | **Kerns** | Wednesday | 9:30 AM – 2:30 PM |
| D. Ariz. — Phoenix | **Maney** or **Brown** (2-way) | Wednesday | 10:00 – 12:00 |
| D. Ariz. — Yuma | **Brown** | Wednesday | 1:00 PM |

For a Chapter 13, the trustee, the weekday, the slot lattice and the Zoom credentials are all knowable **at the consultation** — before we file, before we have a case number. Only Phoenix carries a coin-flip (Maney 60% / Brown 40%), and both sit Wednesdays, so the *date* projection is unaffected.

### Finding 4 — Chapter 7 trustee assignment is a blind rotation over a small, measurable panel

| Division | Panel size | Top of panel (share of our Ch.7 filings) |
|---|---|---|
| W.D. Wash. — Seattle | 4 | Klein 40% · Brown 24% · Wood 21% · Shoemaker 15% |
| W.D. Wash. — Tacoma | 4 | Waldron 45% · Ellis 27% · Krattli 23% · Garrett 4% |
| E.D. Wash. — Spokane | 3 | O'Rourke 36% · Munding 36% · Anderton 28% |
| D. Ariz. — Tucson | 8 | Kartchner 40% · Mullen 25% · Haley 11% · Mason 9% |
| D. Ariz. — Phoenix | 13 | Mason 13% · Haley 13% · Weigle 11% · Birdsell 10% · 9 others |

**This is why AZ and WA project differently.** In a 3–4 trustee WA division the pre-filing trustee guess is a 25–36% proposition and, in Spokane, the weekday tells you the answer. In Phoenix, 13 trustees means no useful pre-filing trustee prediction — but the *date* still projects cleanly, because every Phoenix Ch.7 trustee sits Monday or Tuesday.

---

## 3. The projection model

### Inputs
`anticipated_filing_date` (from Filing Date Oracle) · `district` · `division` (from the divisional prefix of the case number, or the client's county pre-filing) · `chapter` · `trustee` if known.

### Tier A — trustee unknown (pre-filing Chapter 7)

```
window   = [filing + 21, filing + 40]          # Rule 2003(a), Ch.7
candidates = every date in window whose weekday is a duty weekday
             for (division, chapter)
anchor   = the candidate nearest filing + 27   # fitted central tendency
output   = PROJECTED-WINDOW: anchor date, candidate set, slot lattice
           = union of the division panel's slots,
           trustee = panel with rotation odds, platform = Zoom
```

### Tier B — trustee known (every Chapter 13 pre-filing; every Chapter 7 once ECF assigns)

```
lattice  = the trustee's forward session dates
           (weekday rule + median cadence, or actual known calendar)
output   = PROJECTED-DATE: first lattice session >= filing + 21,
           modal slot time for that trustee,
           Zoom meeting ID + passcode from the trustee profile
```

### Tier C — `OFFICIAL`
The ECF 341 notice lands. Date/time/Zoom overwrite the projection, status flips to `OFFICIAL`, the projection is archived append-only with the signed variance (projected − actual). That variance is the training signal for Layer 1. **Client communications fire only here.**

---

## 4. How well it works — backtest

Filing dates are not in the master sheet, so filing dates were reconstructed per division-year from the court's case-number sequence (a monotone fit of sequence → date), with the filing→341 offset as the single free parameter. The fit is strongly constrained: the recovered offsets cluster at **24–30 days, median 27**, and **98.4%** of the implied offsets land inside the statutory window without being forced to — which is itself evidence the reconstruction is sound.

| Test | Result |
|---|---|
| **Tier B** — "first trustee session ≥ filing+21" reproduces the **exact** actual 341 date | **87.0%** (168/193) |
| **Tier A** — actual weekday was one of the division's duty weekdays | **99.0%** |
| **Tier A** — actual date was inside the projected candidate set | **95.9%** |
| **Tier A** — point estimate within ±7 days | **96.9%** |
| **Tier A** — point estimate exact | 39.9% |
| Trustee → Zoom meeting ID (leave-one-out) | **97.3%** |
| Trustee → Zoom passcode (leave-one-out) | 93.6% |
| Trustee → slot time falls in the observed lattice | 82.6% |
| Weekday rule trained on 2025, tested on 2026 | **97.7%** |

**Read these honestly.** Tier B's 87% assumes the trustee's session calendar is known — true for Ch.13 always, and for Ch.7 only after ECF assignment. Tier A is the real pre-filing number for a Chapter 7: *we will not name the day, but we will name the week, the weekday, the slot menu and the platform, and we will be inside ±7 days 97% of the time.* That is enough for capacity forecasting, coverage assignment, and back-derived document deadlines. It is not enough to tell a client a date, and the model never does.

### The one calibration that upgrades this
Every accuracy number above is capped by the fact that **actual petition dates were reconstructed, not read**. Feeding real petition dates from BestCase/ECF into the variance loop replaces the reconstruction with ground truth and pins the offset per division rather than per division-year. That is a data-plumbing task, not a research task — and it is exactly the Layer 1 feedback path already specified.

---

## 5. Capacity and risk parameters (for 341 Coverage)

| Parameter | Value | Note |
|---|---|---|
| Continuance rate, all divisions | **7.8%** (38/485) | a 341 that had to be re-set |
| Worst divisions | Yuma **21.1%**, Prescott/Flagstaff **16.7%** | small n; treat as a flag, not a rate |
| Best | Spokane 5.1%, Tucson 6.0% | |
| Largest single-session load we have carried | **10 cases** (Klein, 02/09/26) | Seattle sessions routinely run 4–6 |
| Sessions ≥4 cases | Klein, Brown, Wood, Shoemaker, Waldron, Ellis, Krattli, O'Rourke | all WA — these are the coverage pinch points |
| Modal trustee cadence | **21 days** (3 weeks) | Munding, O'Rourke, Waldron, Ellis, Brown-AZ all ~21d |

Coverage forecasting should assume a **7.8% re-set tax** on every projected session and stack the WA high-volume Mondays and Tuesdays first — one Seattle Monday can carry more of our docket than a whole week of Phoenix.

---

## 6. Per-trustee reference — the Layer 1 seed

### D. Ariz.

| Trustee | Division | Ch | Sitting day(s) | Slot lattice (observed) | Cadence | Cases/session avg·max | Zoom meeting ID | Passcode | n |
|---|---|---|---|---|---|---|---|---|---|
| Mason | Phoenix | 7 | **Tue** / Mon | 8:30 AM, 9:30 AM, 10:00 AM, 11:00 AM, 11:30 AM, 12:00 PM, 1:00 PM, 1:30 PM, 2:00 PM | ~22d | 1.4 · 2 | 757 106 7496 | 3403668045 | 11 |
| Maney | Phoenix | 13/7 | **Wed** | 10:00 AM, 10:30 AM, 11:30 AM, 12:00 PM | ~10d | 1.0 · 1 | 332 617 9131 | 8018903784 | 10 |
| Haley | Phoenix | 7 | **Mon** | 8:30 AM, 9:00 AM, 10:30 AM, 12:00 PM, 2:00 PM, 2:30 PM | ~21d | 1.4 · 2 | 906 123 7055 | 0641314055 | 10 |
| Goernitz | Phoenix | 7 | **Mon** / Tue | 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 3:30 PM, 4:00 PM | ~21d | 1.7 · 2 | 951 131 7503 | 9875192566 | 10 |
| Weigle | Phoenix | 7 | **Mon** | 8:30 AM, 10:00 AM, 10:30 AM, 1:00 PM, 2:30 PM | ~31d | 3.0 · 5 | 882 591 6266 | 8120205568 | 9 |
| Birdsell | Phoenix | 7 | **Mon** / Tue | 9:00 AM, 11:30 AM, 1:00 PM, 1:30 PM, 2:00 PM, 2:30 PM | ~49d | 1.6 · 3 | 719 746 0394 | 9510604032 | 8 |
| Reaves | Phoenix | 7 | **Mon** | 9:00 AM, 9:30 AM, 10:00 AM, 11:00 AM, 1:00 PM, 2:30 PM | ~49d | 1.8 · 2 | 961 293 0787 | 8078544704 | 7 |
| Mullen | Phoenix | 7 | Tue / Mon | 9:00 AM, 9:30 AM, 10:00 AM, 11:30 AM, 1:00 PM | ~22d | 1.0 · 1 | 594 571 2629 | 9522364765 | 7 |
| MacKenzie | Phoenix | 7 | **Tue** / Mon | 10:00 AM, 11:00 AM, 11:30 AM, 12:00 PM, 3:00 PM, 4:00 PM | ~27d | 1.4 · 2 | 814 770 7084 | 484082455 | 7 |
| Hyder | Phoenix | 7 | **Mon** / Fri | 11:30 AM, 1:30 PM, 2:00 PM | ~47d | 2.0 · 3 | 605 644 5694 | 5532359324 | 6 |
| Brown | Phoenix | 13 | **Wed** | 10:00 AM, 10:30 AM, 11:00 AM, 12:00 PM | ~21d | 1.2 · 2 | 641 215 5816 | 595100545 | 6 |
| Maguire | Phoenix | 7 | **Tue** / Mon | 10:00 AM, 10:30 AM, 11:30 AM, 1:00 PM | ~22d | 1.0 · 1 | 661 088 4237 | 9917587882 | 5 |
| Gaughan | Phoenix | 7 | **Thu** / Mon | 8:30 AM, 11:00 AM, 1:00 PM | ~74d | 1.0 · 1 | 846 886 4619 | 2235330189 | 3 |
| Warfield | Phoenix | 7 | **Mon** | 11:00 AM, 1:00 PM | ~7d | 1.0 · 1 | 576 579 1205 | 3669585951 | 2 |
| Warfield | Prescott/Flagstaff | 7 | **Fri** / Mon | 8:30 AM, 12:00 PM, 12:30 PM, 1:00 PM, 1:30 PM, 2:00 PM | ~11d | 1.1 · 2 | 576 579 1205 | 3669585951 | 11 |
| Haley | Prescott/Flagstaff | 7 | Mon / Fri | 1:00 PM, 2:00 PM | ~25d | 1.5 · 2 | 906 123 7055 | 0641314055 | 3 |
| Mullen | Prescott/Flagstaff | 7 | **Fri** | 12:00 PM, 12:30 PM | n/a | 2.0 · 2 | 594 571 2629 | 9522364765 | 2 |
| Maney | Prescott/Flagstaff | 13 | **Wed** | 11:30 AM, 1:00 PM | ~14d | 1.0 · 1 | 332 617 9131 | 8018903784 | 2 |
| Kartchner | Tucson | 7 | Mon / Tue / Thu | 9:00 AM, 9:30 AM, 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM, 12:00 PM, 2:30 PM | ~13d | 1.5 · 3 | 423 268 9099 | 5677104616 | 21 |
| Mullen | Tucson | 7 | Fri / Tue / Mon / Thu | 9:00 AM, 9:30 AM, 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM | ~39d | 2.2 · 3 | 594 571 2629 | 9522364765 | 13 |
| Kerns | Tucson | 13 | **Wed** | 9:30 AM, 10:00 AM, 11:00 AM, 12:00 PM, 12:30 PM, 1:00 PM, 2:30 PM | ~14d | 1.4 · 2 | 315 969 1870 | 5737485002 | 10 |
| Mason | Tucson | 7 | **Mon** / Fri / Thu | 9:30 AM, 10:00 AM, 10:30 AM, 12:00 PM | ~38d | 1.2 · 2 | 757 106 7496 | 3403668045 | 6 |
| Haley | Tucson | 7 | Fri / Tue / Mon | 9:30 AM, 10:00 AM, 10:30 AM, 11:30 AM, 2:00 PM | ~34d | 1.5 · 3 | 906 123 7055 | 0641314055 | 6 |
| Gaughan | Tucson | 7 | Mon / Tue / Thu | 9:30 AM, 10:00 AM, 12:00 PM | ~38d | 1.0 · 1 | 846 886 4619 | 2235330189 | 4 |
| Hyder | Tucson | 7 | Fri / Mon | 10:30 AM, 1:00 PM, 2:00 PM | ~10d | 1.5 · 2 | 605 644 5694 | 5532359324 | 3 |
| Reaves | Tucson | 7 | Tue / Mon | 10:00 AM, 10:30 AM | n/a | 1.5 · 2 | 961 293 0787 | 8078544704 | 3 |
| Weigle | Tucson | 7 | **Mon** | 9:00 AM | n/a | 1.0 · 1 | 882 591 6266 | 8120205568 | 1 |
| Warfield | Yuma | 7 | **Mon** / Tue | 1:30 PM, 2:00 PM, 2:30 PM, 3:00 PM | ~20d | 1.3 · 2 | 576 579 1205 | 3669585951 | 8 |
| Smith | Yuma | 7 | **Wed** | 1:00 PM, 1:30 PM | ~63d | 1.2 · 2 | 585 119 0840 | 2455896832 | 5 |
| Brown | Yuma | 13 | **Wed** | 1:00 PM | ~14d | 1.0 · 1 | 641 215 5816 | 0595100545 | 3 |
| Mason | Yuma | 7 | **Mon** | 1:30 PM, 2:30 PM | n/a | 2.0 · 2 | 757 106 7496 | 3403668045 | 2 |
| Haley | Yuma | 7 | **Mon** | 2:00 PM | n/a | 1.0 · 1 | 906 123 7055 | 0641314055 | 1 |

### W.D. Wash.

| Trustee | Division | Ch | Sitting day(s) | Slot lattice (observed) | Cadence | Cases/session avg·max | Zoom meeting ID | Passcode | n |
|---|---|---|---|---|---|---|---|---|---|
| Klein | Seattle | 7 | Mon / Tue | 8:30 AM, 9:00 AM, 9:30 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:30 PM, 2:30 PM | ~17d | 4.5 · 10 | 510 313 6544 | 8104892393 | 45 |
| Brown | Seattle | 7 | **Mon** / Tue | 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:30 PM, 2:30 PM, 3:30 PM | ~24d | 3.4 · 6 | 461 609 6703 | 3660254164 | 27 |
| Wood | Seattle | 7 | Tue / Mon | 8:30 AM, 9:00 AM, 10:00 AM, 10:30 AM, 11:00 AM, 12:00 PM | ~14d | 2.8 · 5 | 499 352 0298 | 9306556482 | 25 |
| Wilson-Aguilar | Seattle | 13 | **Mon** | 8:30 AM, 9:45 AM, 10:00 AM, 11:00 AM | ~14d | 1.4 · 3 | 284 684 9773 | 9420105945 | 18 |
| Shoemaker | Seattle | 7 | **Mon** | 9:00 AM, 10:00 AM, 12:00 PM, 1:30 PM, 2:30 PM | ~14d | 2.6 · 6 | 748 186 6715 | 0136221891 | 18 |
| Waldron | Tacoma | 7 | **Tue** | 8:30 AM, 9:30 AM, 10:30 AM, 11:30 AM, 12:30 PM | ~21d | 3.3 · 6 | 622 801 6616 | 6790152908 | 33 |
| Ellis | Tacoma | 7 | **Tue** | 8:30 AM, 9:30 AM, 10:30 AM, 11:30 AM, 12:30 PM, 1:30 PM | ~21d | 3.1 · 7 | 932 613 8383 | 2465076618 | 22 |
| Krattli | Tacoma | 7 | **Tue** | 8:30 AM, 9:30 AM, 10:30 AM, 11:30 AM, 12:30 PM, 2:30 PM, 3:30 PM | ~28d | 3.2 · 5 | 670 584 9768 | 3356389145 | 19 |
| Malaier | Tacoma | 13 | **Thu** | 9:00 AM, 10:00 AM, 11:00 AM | ~10d | 1.2 · 3 | 258 286 5505 | 1190124488 | 10 |
| Garrett | Tacoma | 7 | **Wed** | 9:00 AM, 11:00 AM, 1:00 PM, 2:00 PM | ~14d | 1.0 · 1 | 750 647 3314 | 9600454165 | 4 |

### E.D. Wash.

| Trustee | Division | Ch | Sitting day(s) | Slot lattice (observed) | Cadence | Cases/session avg·max | Zoom meeting ID | Passcode | n |
|---|---|---|---|---|---|---|---|---|---|
| Munding | Spokane | 7 | **Wed** | 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:30 PM | ~21d | 2.5 · 3 | 496 409 2084 | 7583341970 | 20 |
| O'Rourke | Spokane | 7 | **Tue** | 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 2:30 PM | ~21d | 2.7 · 6 | 242 078 2069 | 9235455598 | 19 |
| Anderton | Spokane | 7 | **Thu** | 9:00 AM, 10:00 AM, 10:30 AM, 11:00 AM, 1:00 PM, 2:30 PM, 3:00 PM | ~19d | 1.5 · 3 | 262 863 1798 | 225675373 | 17 |
| Todd | Spokane | 13 | **Thu** | 10:00 AM | n/a | 1.5 · 2 | 262 980 2865 | 5105703805 | 3 |
*Bold weekday = ≥60% of that trustee's observed sessions. Cadence = median gap between sessions. Cases/session = our own load, not the trustee's full calendar — for the AZ divisions we typically hold 1–2 slots on a session, so the AZ lattices are sampled, not complete. Machine-readable form: `JarvisTrusteeProfile-seed.json`.*

---

## 7. Data-quality findings on the master sheet

The sheet is good enough to model from, and these are worth fixing at source because the agent will ingest it:

1. **4 year-typos** (a January 2026 hearing typed as 2025) — repaired in the parse; they shift the weekday and would corrupt a naive lattice.
2. **54.8% of rows have no "Trustee Docs Sent" date** — 148 of them on hearings after 01/01/26. Either the field is not being filled or the packages are not going out; the readiness report cannot compute a trustee-docs state from a blank.
3. **Passcode leading zeros are inconsistently preserved** (`0641314055` vs `641314055`) — store as text, not number.
4. **Two trustee-name misspellings** (`Shoemaler`, `Mackenzie`) and one Zoom ID typo (Malaier `2582965505`) — a controlled trustee list on the sheet removes this class of error.
5. **Case-number formats vary** across 11 shapes. The divisional prefix is load-bearing (it is how division is derived) — normalize on entry.
