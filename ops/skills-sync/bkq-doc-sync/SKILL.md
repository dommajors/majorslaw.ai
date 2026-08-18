---
name: bkq-doc-sync
description: >
  Pull client documents and the BCI creditor export from BKQuestionnaire.com and file them
  into the firm's P-drive client folder structure. Use when asked to "sync BKQ docs",
  "pull the BCI", "check BKQ for new uploads", or to update a bankruptcy client file from
  BKQuestionnaire. Requires Chrome browser automation (Claude in Chrome extension connected).
---

# BKQuestionnaire Document Sync (Majors Law Group)

## Prerequisites
- Claude in Chrome extension connected (browser automation available)
- P:\Client Docs connected as a folder, or the task running on the user's computer
- Attorney logged into bkquestionnaire.com in Chrome

## Client file URLs (pattern)
- Uploaded docs page: `https://www.bkquestionnaire.com/attorney/client/uploaded/documents/{CLIENT_ID}`
- Client view page:   `https://www.bkquestionnaire.com/attorney/form/submission/view/{CLIENT_ID}`

Example — Myers file: Travis Myers / Tina Myers, BKQ client ID **63881**,
destination `P:\Client Docs\Bankruptcy\Myers, Tina & Travis`

## Workflow — document sync
1. Open the uploaded documents page for the client ID.
2. Compare uploads against what is already saved in the destination client folder
   (list the folder first; match by document type and month).
3. Download only documents NOT already in the client folder.
4. File each download into the matching subfolder:

| Document type | Destination subfolder |
|---|---|
| Bank statements | `Sched A B – (Financial Accounts)\Bank Account Statements\{Personal or Business}\{Bank_name_ending_with_XXXX}` |
| PayPal / Cash App / Venmo / Apple Pay | `Sched A B – (Financial Accounts)\Paypal, Cash App, Venmo\{App + client name}` |
| Medical bills & misc | `Misc.Attorney Documents\Miscellaneous Documents` |
| IDs, SS cards, credit counseling certs | Appropriate `Petition\` or `Requested Documents\` subfolder if not already present |

Name statement files by month to match existing convention (e.g. `July 1.pdf`).

## Workflow — BCI creditor export
1. Go to the client view page (`/attorney/form/submission/view/{CLIENT_ID}`).
2. Find the **export dropdown** → select **"CSV (BCI)"**.
3. If a creditor export modal appears, choose **"Import All Creditors To BCI"**
   unless specifically instructed otherwise.
4. Wait for the download to complete.
5. Save the `.bci` file directly into the ROOT of the client folder
   (e.g. `P:\Client Docs\Bankruptcy\Myers, Tina & Travis`).
6. Keep the downloaded filename if reasonable, or rename clearly:
   `{FirstName}_{LastName}.bci` (e.g. `Travis_Myers.bci`).
7. **NEVER modify the contents of a .bci file.**

## Standing rules
- Do not delete or overwrite unrelated existing client documents unless specifically instructed.
- After the BCI is saved: when the petition is drafted, verify any pending lawsuit
  (e.g. a summons in the client folder) appears on **SOFA Part 4** AND that the plaintiff
  creditor is listed on **Schedule E/F with the lawsuit cross-referenced** to the same creditor.
- Before finishing, verify: (a) the .bci exists in the main client folder;
  (b) each downloaded doc landed in the correct subfolder.

## Known environment limitation
Cloud Cowork sessions cannot read file contents from mapped network drives (P:) —
directory listing works but staging/reads fail. For content-level review, run the task
on the user's computer, or work from a local copy of the client folder.
