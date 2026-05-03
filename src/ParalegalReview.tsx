import { useState, useEffect } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, FileText, User, Scale,
  ChevronDown, ChevronRight, ExternalLink, RefreshCw, Send, Plus,
  Copy, ArrowRightLeft, Trash2, Check, X, Info, MessageSquare,
  ClipboardCheck, Eye, Loader2,
} from "lucide-react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CLIENT_ID     = "client-demo";

// ─── REST helpers ─────────────────────────────────────────────────────────────

const api = {
  get: async (path: string) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    return r.ok ? r.json() : [];
  },
  post: async (table: string, body: object) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    return r.ok ? r.json() : null;
  },
  patch: async (table: string, id: string, body: object) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    return r.ok ? r.json() : null;
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientDocument {
  id: string;
  client_id: string;
  document_type: string;
  document_category: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  ai_verified: boolean;
  ai_note: string | null;
  context_ref: string | null;
  uploaded_at: string;
}

interface DocConfirmation {
  id: string;
  review_id: string;
  client_document_id: string;
  section: string;
  status: "pending" | "confirmed" | "needs_info" | "rejected" | "transferred" | "duplicated";
  transfer_to_section: string | null;
  paralegal_note: string | null;
  confirmed_at: string | null;
}

interface SectionConfirmation {
  id: string;
  review_id: string;
  section_key: string;
  status: "pending" | "confirmed" | "needs_info";
  paralegal_note: string | null;
  confirmed_at: string | null;
}

interface ParalegalReview {
  id: string;
  client_id: string;
  paralegal_name: string;
  status: "in_progress" | "complete" | "needs_info";
  notes: string | null;
  info_request_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Review sections with scripts ─────────────────────────────────────────────

interface ReviewSection {
  key: string;
  label: string;
  documentName: string;
  schedule: string;
  script: string;
  docCategories: string[];
  docTypes?: string[];
}

// Opening disclosure read at the start of every review session — before any section
const OPENING_DISCLOSURE = `Before we begin, I want to make a few important disclosures. First, I am a paralegal, not an attorney. I am not able to provide legal advice, and nothing I say during this review should be taken as legal advice. If you have legal questions about your case, those will need to be directed to your attorney.

Second, your documents will need to stay current throughout this process. As your case moves forward, you will need to continue providing updated documents right up until your case is filed. Once filed, there will be a final set of documents required for your Meeting of Creditors — we will walk you through exactly what is needed at that time.

Third, once the attorney reviews and approves your case for filing, you will be notified through your client portal. At that point, you will be directed to pay the court filing fee. Once that payment is confirmed, you will be prompted to schedule your signing appointment with the attorney.

Finally, on the actual date your case is filed, you will need to provide the exact balances for all of your bank accounts as of that filing date. We will reach out to you at that time with instructions.

Do you have any questions about any of that before we begin?`;

const REVIEW_SECTIONS: ReviewSection[] = [
  {
    key: "petition",
    label: "Voluntary Petition",
    documentName: "Voluntary Petition for Individuals Filing for Bankruptcy (Form 101)",
    schedule: "Petition — Cover Page",
    script: "I have here your government-issued photo ID and your Social Security card. Please confirm these are current, valid documents and that the name and information on them matches exactly what we have on file for your case. Remember, these documents will need to remain valid through the date your case is filed. Can you confirm that everything shown here is correct?",
    docCategories: ["identity"],
    docTypes: ["id_front", "id_back", "ss_card"],
  },
  {
    key: "schedule_ab_real",
    label: "Schedule A/B — Real & Personal Property",
    documentName: "Schedule A/B: Property (Form 106A/B)",
    schedule: "Schedule A/B",
    script: "We are now reviewing Schedule A/B, which lists all of your real and personal property. This includes any real estate you own or have an interest in, as well as personal property such as bank accounts, vehicles, household goods, and other assets. Please review the documents we have for each item and confirm the information is accurate and current.",
    docCategories: ["bank", "real_estate", "vehicles", "retirement", "personal_property"],
    docTypes: ["bank_statement", "deed", "vehicle_registration", "retirement_stmt"],
  },
  {
    key: "schedule_c",
    label: "Schedule C — Exemptions",
    documentName: "Schedule C: The Property You Claim as Exempt (Form 106C)",
    schedule: "Schedule C",
    script: "Schedule C lists the property you are claiming as exempt from your bankruptcy estate. Exemptions protect certain assets — such as your home, vehicle, retirement accounts, and household goods — up to specified limits. Your attorney will determine which exemptions apply to your situation. For now, please confirm the documents supporting each exempt asset are current and complete.",
    docCategories: ["retirement", "real_estate", "vehicles"],
    docTypes: ["retirement_stmt", "deed", "vehicle_registration", "vehicle_insurance"],
  },
  {
    key: "schedule_d",
    label: "Schedule D — Secured Creditors",
    documentName: "Schedule D: Creditors Who Have Claims Secured by Property (Form 106D)",
    schedule: "Schedule D",
    script: "Schedule D covers your secured debts — these are debts tied to specific collateral, such as a mortgage on your home or a loan on your vehicle. We will review each secured creditor's most recent statement. Please confirm the creditor name, account number, and current balance are accurate for each one.",
    docCategories: ["secured-creditors", "real_estate", "vehicles", "hoa"],
    docTypes: ["mortgage_stmt", "vehicle_loan_stmt", "hoa_stmt", "deed"],
  },
  {
    key: "schedule_ef",
    label: "Schedule E/F — Unsecured Creditors",
    documentName: "Schedule E/F: Creditors Who Have Unsecured Claims (Form 106E/F)",
    schedule: "Schedule E/F",
    script: "Schedule E/F lists your unsecured debts — these include credit cards, medical bills, personal loans, and any other debts not secured by collateral. We will cross-reference the creditors listed in your questionnaire against the documents on file. Please confirm each creditor's name and balance are accurate. If you have received any recent statements or collection notices, those should be included here.",
    docCategories: ["unsecured-creditors", "credit_cards", "medical", "collections"],
    docTypes: ["credit_card_stmt", "medical_bill", "collection_notice", "loan_stmt"],
  },
  {
    key: "schedule_i",
    label: "Schedule I — Current Income",
    documentName: "Schedule I: Your Income (Form 106I)",
    schedule: "Schedule I",
    script: "We are now reviewing your current income for Schedule I. This covers all sources of income you are currently receiving — wages, self-employment, Social Security, disability, pension, rental income, or any other regular income. Please confirm each document shows your name, the income amount, and is from the most recent period available. These documents must stay current up to the filing date.",
    docCategories: ["income", "employment"],
    docTypes: ["paystub", "ss_award", "disability_award", "va_award", "unemployment", "pension_stmt"],
  },
  {
    key: "schedule_j",
    label: "Schedule J — Current Expenses",
    documentName: "Schedule J: Your Expenses (Form 106J)",
    schedule: "Schedule J",
    script: "Schedule J captures your current monthly expenses. This typically includes housing, utilities, food, transportation, insurance, and other regular costs. Most of this information comes directly from your questionnaire, but we may need supporting documents for certain expenses such as rent, utilities, or insurance payments. Please confirm the amounts listed accurately reflect your current monthly expenses.",
    docCategories: ["expenses", "utilities", "insurance"],
    docTypes: ["rent_stmt", "utility_bill", "insurance_stmt"],
  },
  {
    key: "sofa",
    label: "Statement of Financial Affairs",
    documentName: "Statement of Financial Affairs for Individuals Filing for Bankruptcy (Form 107)",
    schedule: "SOFA — Form 107",
    script: "The Statement of Financial Affairs requires disclosure of your financial history over the past several years. This includes income received in the last two years, payments made to creditors in the last 90 days, any property transferred in the last two years, lawsuits, and other financial transactions. The documents we are reviewing here — including tax returns and bank statements — support the disclosures in this form. Please confirm these records are complete and accurate.",
    docCategories: ["tax", "bank", "legal"],
    docTypes: ["tax_return", "bank_statement", "lawsuit_docs", "garnishment"],
  },
  {
    key: "means_test",
    label: "Means Test",
    documentName: "Chapter 7 Statement of Your Current Monthly Income (Form 122A-1)",
    schedule: "Form 122A-1 / 122A-2 — Means Test",
    script: "The means test determines whether you qualify to file Chapter 7 bankruptcy. It compares your average monthly income over the last six months against the median income for your state. We need your pay stubs and income records for the six full calendar months prior to filing. Please confirm these documents cover the correct time period and reflect all sources of income received.",
    docCategories: ["income", "employment", "benefits"],
    docTypes: ["paystub", "ss_award", "disability_award", "va_award", "unemployment", "pension_stmt"],
  },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function docLabel(doc: ClientDocument): string {
  return doc.original_filename || `${doc.document_type} (${doc.document_category})`;
}

function storageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/client-documents/${path}`;
}

function fmtDate(ts: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(ts));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:     { label: "Pending",     cls: "text-slate-400 bg-slate-800 border-slate-700" },
  confirmed:   { label: "Confirmed",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  needs_info:  { label: "Needs Info",  cls: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
  rejected:    { label: "Rejected",    cls: "text-red-400 bg-red-500/10 border-red-500/25" },
  transferred: { label: "Transferred", cls: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
  duplicated:  { label: "Duplicated",  cls: "text-violet-400 bg-violet-500/10 border-violet-500/25" },
};

function StatusBadge({ status }: { status: keyof typeof STATUS_CFG }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Document action modal ────────────────────────────────────────────────────

function DocActionModal({ doc, confirmation, sections, onClose, onAction, crossSectionKeys }: {
  doc: ClientDocument;
  confirmation: DocConfirmation | null;
  sections: ReviewSection[];
  onClose: () => void;
  onAction: (action: DocConfirmation["status"], note: string, transferTo?: string) => void;
  crossSectionKeys?: string[];
}) {
  const [note, setNote]       = useState(confirmation?.paralegal_note ?? "");
  const [transferTo, setTransferTo] = useState("");
  const [action, setAction]   = useState<DocConfirmation["status"] | null>(null);
  const [saving, setSaving]   = useState(false);

  async function commit(a: DocConfirmation["status"]) {
    if (a === "transferred" && !transferTo) return;
    setSaving(true);
    await onAction(a, note, transferTo || undefined);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white truncate max-w-xs">{docLabel(doc)}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Document link */}
          <a
            href={storageUrl(doc.storage_path)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="flex-1 truncate">{doc.original_filename}</span>
            <ExternalLink className="w-3 h-3 text-slate-600 flex-shrink-0" />
          </a>

          {/* Cross-section notice */}
          {crossSectionKeys && crossSectionKeys.length > 1 && (
            <div className="flex items-start gap-2 bg-sky-500/8 border border-sky-500/20 rounded-xl px-3 py-2.5">
              <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-sky-300 leading-snug">
                This document applies to <span className="font-bold">{crossSectionKeys.length} sections</span>. Confirming will auto-apply to:&nbsp;
                {crossSectionKeys.map(k => REVIEW_SECTIONS.find(s => s.key === k)?.label).filter(Boolean).join(", ")}.
              </p>
            </div>
          )}

          {/* Actions */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Action</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => commit("confirmed")}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 font-bold text-xs px-3 py-2.5 rounded-xl transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Confirm
              </button>
              <button
                onClick={() => commit("needs_info")}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 font-bold text-xs px-3 py-2.5 rounded-xl transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Needs Info
              </button>
              <button
                onClick={() => commit("duplicated")}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs px-3 py-2.5 rounded-xl transition-all"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              <button
                onClick={() => commit("rejected")}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-bold text-xs px-3 py-2.5 rounded-xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>

          {/* Transfer */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Transfer to Section</p>
            <div className="flex gap-2">
              <select
                value={transferTo}
                onChange={e => setTransferTo(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500"
              >
                <option value="">Select section…</option>
                {sections.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={() => commit("transferred")}
                disabled={saving || !transferTo}
                className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-400 font-bold text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Paralegal Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note about this document…"
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocRow({ doc, confirmation, sections, sectionKey, onUpdate }: {
  doc: ClientDocument;
  confirmation: DocConfirmation | null;
  sections: ReviewSection[];
  sectionKey?: string;
  onUpdate: (docId: string, action: DocConfirmation["status"], note: string, transferTo?: string, sectionKeyOverride?: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const status = confirmation?.status ?? "pending";

  const crossSectionKeys = REVIEW_SECTIONS.filter(s =>
    s.docCategories.includes(doc.document_category) ||
    (s.docTypes ?? []).includes(doc.document_type)
  ).map(s => s.key);

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        status === "confirmed"   ? "bg-emerald-500/5 border-emerald-500/20" :
        status === "needs_info"  ? "bg-amber-500/5 border-amber-500/20" :
        status === "rejected"    ? "bg-red-500/5 border-red-500/20" :
        status === "transferred" ? "bg-sky-500/5 border-sky-500/20" :
                                   "bg-slate-800/60 border-slate-700/60"
      }`}>
        {/* Status icon */}
        <div className="flex-shrink-0">
          {status === "confirmed"   && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {status === "needs_info"  && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          {status === "rejected"    && <XCircle className="w-4 h-4 text-red-400" />}
          {status === "transferred" && <ArrowRightLeft className="w-4 h-4 text-sky-400" />}
          {status === "duplicated"  && <Copy className="w-4 h-4 text-violet-400" />}
          {status === "pending"     && <FileText className="w-4 h-4 text-slate-500" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-slate-200 truncate">{docLabel(doc)}</p>
            <StatusBadge status={status} />
            {crossSectionKeys.length > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-sky-400 bg-sky-500/10 border-sky-500/20" title={`Also applies to: ${crossSectionKeys.filter(k => k !== sectionKey).map(k => REVIEW_SECTIONS.find(s => s.key === k)?.label).join(", ")}`}>
                {crossSectionKeys.length} sections
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-600 capitalize">{doc.document_category.replace("-", " ")}</span>
            <span className="text-[10px] text-slate-700">·</span>
            <span className="text-[10px] text-slate-600">{fmtDate(doc.uploaded_at)}</span>
            {doc.ai_verified && (
              <span className="text-[10px] text-emerald-600">AI verified</span>
            )}
            {confirmation?.paralegal_note && (
              <span className="text-[10px] text-slate-500 italic truncate max-w-[180px]">{confirmation.paralegal_note}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={storageUrl(doc.storage_path)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
            title="View document"
          >
            <Eye className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
          >
            Review
          </button>
        </div>
      </div>

      {showModal && (
        <DocActionModal
          doc={doc}
          confirmation={confirmation}
          sections={sections}
          crossSectionKeys={crossSectionKeys}
          onClose={() => setShowModal(false)}
          onAction={async (action, note, transferTo) => {
            await onUpdate(doc.id, action, note, transferTo, sectionKey);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section, docs, confirmations, sectionConf, onDocUpdate, onSectionConfirm, onSectionNeedsInfo }: {
  section: ReviewSection;
  docs: ClientDocument[];
  confirmations: DocConfirmation[];
  sectionConf: SectionConfirmation | null;
  onDocUpdate: (docId: string, action: DocConfirmation["status"], note: string, transferTo?: string, sectionKeyOverride?: string) => void;
  onSectionConfirm: (sectionKey: string, note: string) => void;
  onSectionNeedsInfo: (sectionKey: string, note: string) => void;
}) {
  const [expanded, setExpanded]     = useState(true);
  const [scriptVisible, setScript]  = useState(false);
  const [note, setNote]             = useState("");
  const [showNoteBox, setShowNote]  = useState(false);

  const sectionDocs = docs.filter(d =>
    section.docCategories.includes(d.document_category) ||
    (section.docTypes ?? []).includes(d.document_type)
  );

  const confirmedCount = sectionDocs.filter(d => {
    const c = confirmations.find(c => c.client_document_id === d.id);
    return c?.status === "confirmed";
  }).length;

  const hasIssues = sectionDocs.some(d => {
    const c = confirmations.find(c => c.client_document_id === d.id);
    return c?.status === "needs_info" || c?.status === "rejected";
  });

  const allConfirmed = sectionDocs.length > 0 && confirmedCount === sectionDocs.length;
  const secStatus = sectionConf?.status ?? "pending";

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      secStatus === "confirmed"  ? "border-emerald-500/30 bg-emerald-500/5" :
      secStatus === "needs_info" ? "border-amber-500/30 bg-amber-500/5" :
                                   "border-slate-700/60 bg-[#0d1221]"
    }`}>
      {/* Section header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-800/20 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          secStatus === "confirmed"  ? "bg-emerald-500/15" :
          secStatus === "needs_info" ? "bg-amber-500/15" :
                                       "bg-slate-800"
        }`}>
          {secStatus === "confirmed"  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
           secStatus === "needs_info" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                                        <ClipboardCheck className="w-4 h-4 text-slate-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{section.label}</span>
            {secStatus !== "pending" && <StatusBadge status={secStatus} />}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{section.documentName}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{section.schedule}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-500">
            {confirmedCount}/{sectionDocs.length} docs
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">

          {/* Script */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
            <button
              onClick={() => setScript(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-800/30 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-amber-300 flex-1">Review Script</span>
              {scriptVisible ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
            </button>
            {scriptVisible && (
              <div className="px-4 pb-4">
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-xs text-amber-100 leading-relaxed italic">"{section.script}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          {sectionDocs.length === 0 ? (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <Info className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <p className="text-xs text-slate-600">No documents uploaded for this section.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sectionDocs.map(d => (
                <DocRow
                  key={d.id}
                  doc={d}
                  confirmation={confirmations.find(c => c.client_document_id === d.id && c.section === section.key) ?? confirmations.find(c => c.client_document_id === d.id) ?? null}
                  sections={REVIEW_SECTIONS}
                  sectionKey={section.key}
                  onUpdate={onDocUpdate}
                />
              ))}
            </div>
          )}

          {/* Section sign-off */}
          {secStatus === "pending" && (
            <div className="pt-2 border-t border-slate-800/60 space-y-3">
              {showNoteBox && (
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add a note for this section…"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
                />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onSectionConfirm(section.key, note)}
                  disabled={sectionDocs.length > 0 && !allConfirmed && !hasIssues}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Section Confirmed
                </button>
                <button
                  onClick={() => onSectionNeedsInfo(section.key, note)}
                  className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs px-4 py-2 rounded-xl transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Needs Additional Info
                </button>
                <button
                  onClick={() => setShowNote(v => !v)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNoteBox ? "Hide note" : "Add note"}
                </button>
              </div>
            </div>
          )}

          {secStatus !== "pending" && sectionConf?.paralegal_note && (
            <div className="flex items-start gap-2 bg-slate-800/40 rounded-xl px-3 py-2.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 italic">{sectionConf.paralegal_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Start Review Modal ───────────────────────────────────────────────────────

function StartReviewModal({ onStart, onClose }: {
  onStart: (name: string, clientId: string) => void;
  onClose: () => void;
}) {
  const [name, setName]         = useState("");
  const [clientId, setClientId] = useState(CLIENT_ID);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">Start Paralegal Review</h3>
          <p className="text-xs text-slate-500 mt-0.5">Begin a new document review session with the client.</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Paralegal Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Client ID</label>
            <input
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => onStart(name, clientId)}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition-all"
          >
            <ClipboardCheck className="w-4 h-4" />
            Begin Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ParalegalReview() {
  const [review, setReview]                 = useState<ParalegalReview | null>(null);
  const [docs, setDocs]                     = useState<ClientDocument[]>([]);
  const [confirmations, setConfirmations]   = useState<DocConfirmation[]>([]);
  const [sectionConfs, setSectionConfs]     = useState<SectionConfirmation[]>([]);
  const [loading, setLoading]               = useState(false);
  const [showStart, setShowStart]           = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [finalizing, setFinalizing]         = useState(false);
  const [disclosureRead, setDisclosureRead] = useState(false);
  const [disclosureExpanded, setDisclosureExpanded] = useState(true);

  async function startReview(paralegalName: string, clientId: string) {
    setLoading(true);
    setShowStart(false);

    const [existingReviews, clientDocs] = await Promise.all([
      api.get(`paralegal_reviews?client_id=eq.${clientId}&status=eq.in_progress&order=created_at.desc&limit=1`),
      api.get(`client_documents?client_id=eq.${clientId}&order=uploaded_at.desc`),
    ]);

    let r: ParalegalReview;
    if (existingReviews?.[0]) {
      r = existingReviews[0];
    } else {
      const created = await api.post("paralegal_reviews", {
        client_id: clientId,
        paralegal_name: paralegalName,
        status: "in_progress",
      });
      r = created?.[0];
    }

    if (r) {
      setReview(r);
      // Load existing confirmations
      const [docConfs, secConfs] = await Promise.all([
        api.get(`paralegal_doc_confirmations?review_id=eq.${r.id}`),
        api.get(`paralegal_section_confirmations?review_id=eq.${r.id}`),
      ]);
      setConfirmations(docConfs ?? []);
      setSectionConfs(secConfs ?? []);
    }

    setDocs(clientDocs ?? []);
    setLoading(false);
  }

  async function handleDocUpdate(docId: string, action: DocConfirmation["status"], note: string, transferTo?: string, sectionKeyOverride?: string) {
    if (!review) return;
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    // Find all sections this document belongs to
    const matchingSections = REVIEW_SECTIONS.filter(s =>
      s.docCategories.includes(doc.document_category) ||
      (s.docTypes ?? []).includes(doc.document_type)
    );

    const primarySection = sectionKeyOverride ?? matchingSections[0]?.key ?? "other";
    const now = new Date().toISOString();
    const newConfs: DocConfirmation[] = [];

    for (const sec of matchingSections.length > 0 ? matchingSections : [{ key: "other" } as ReviewSection]) {
      const secKey = sec.key;
      // For sections other than the one being acted on, only auto-apply if action is "confirmed"
      const isActedSection = secKey === primarySection || matchingSections.length === 1;
      const effectiveAction: DocConfirmation["status"] = isActedSection ? action : (action === "confirmed" ? "confirmed" : "pending");
      // Skip propagating non-confirmed status to other sections
      if (!isActedSection && action !== "confirmed") continue;

      const existing = confirmations.find(c => c.client_document_id === docId && c.section === secKey);
      const payload = {
        review_id: review.id,
        client_document_id: docId,
        section: secKey,
        status: effectiveAction,
        paralegal_note: isActedSection ? (note || null) : null,
        transfer_to_section: isActedSection ? (transferTo ?? null) : null,
        confirmed_at: effectiveAction === "confirmed" ? now : null,
      };

      if (existing) {
        const updated = await api.patch("paralegal_doc_confirmations", existing.id, payload);
        if (updated?.[0]) newConfs.push(updated[0]);
      } else {
        const created = await api.post("paralegal_doc_confirmations", payload);
        if (created?.[0]) newConfs.push(created[0]);
      }
    }

    if (newConfs.length > 0) {
      setConfirmations(prev => {
        const updatedIds = new Set(newConfs.map(c => c.id));
        const filtered = prev.filter(c => !updatedIds.has(c.id) && !newConfs.some(nc => nc.client_document_id === c.client_document_id && nc.section === c.section));
        return [...filtered, ...newConfs];
      });
    }
  }

  async function handleSectionConfirm(sectionKey: string, note: string) {
    if (!review) return;
    const existing = sectionConfs.find(s => s.section_key === sectionKey);
    const payload = {
      review_id: review.id,
      section_key: sectionKey,
      status: "confirmed",
      paralegal_note: note || null,
      confirmed_at: new Date().toISOString(),
    };
    if (existing) {
      const updated = await api.patch("paralegal_section_confirmations", existing.id, payload);
      if (updated?.[0]) setSectionConfs(prev => prev.map(s => s.id === existing.id ? updated[0] : s));
    } else {
      const created = await api.post("paralegal_section_confirmations", payload);
      if (created?.[0]) setSectionConfs(prev => [...prev, created[0]]);
    }
  }

  async function handleSectionNeedsInfo(sectionKey: string, note: string) {
    if (!review) return;
    const existing = sectionConfs.find(s => s.section_key === sectionKey);
    const payload = {
      review_id: review.id,
      section_key: sectionKey,
      status: "needs_info",
      paralegal_note: note || null,
      confirmed_at: null,
    };
    if (existing) {
      const updated = await api.patch("paralegal_section_confirmations", existing.id, payload);
      if (updated?.[0]) setSectionConfs(prev => prev.map(s => s.id === existing.id ? updated[0] : s));
    } else {
      const created = await api.post("paralegal_section_confirmations", payload);
      if (created?.[0]) setSectionConfs(prev => [...prev, created[0]]);
    }
  }

  async function sendInfoRequest() {
    if (!review) return;
    setSendingRequest(true);
    await api.patch("paralegal_reviews", review.id, {
      status: "needs_info",
      info_request_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setReview(r => r ? { ...r, status: "needs_info", info_request_sent_at: new Date().toISOString() } : r);
    setSendingRequest(false);
  }

  async function finalizeReview() {
    if (!review) return;
    setFinalizing(true);
    await api.patch("paralegal_reviews", review.id, {
      status: "complete",
      updated_at: new Date().toISOString(),
    });
    setReview(r => r ? { ...r, status: "complete" } : r);
    setFinalizing(false);
  }

  // Totals
  const allSectionKeys = REVIEW_SECTIONS.map(s => s.key);
  const confirmedSections = sectionConfs.filter(s => s.status === "confirmed").length;
  const needsInfoSections = sectionConfs.filter(s => s.status === "needs_info").length;
  const allDone = confirmedSections === allSectionKeys.length;

  const totalDocs = docs.length;
  const confirmedDocs = confirmations.filter(c => c.status === "confirmed").length;

  if (showStart) {
    return (
      <div className="min-h-screen bg-[#0a0e1a]" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>
        <StartReviewModal onStart={startReview} onClose={() => {}} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading review session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>

      {/* Header */}
      <header className="bg-[#0d1221]/95 border-b border-slate-800/60 sticky top-0 z-30 backdrop-blur">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                MAJORSLAW<span className="text-amber-400">.ai</span>
              </span>
              <span className="hidden sm:inline text-slate-600 mx-2">|</span>
              <span className="hidden sm:inline text-slate-500 text-xs font-medium uppercase tracking-wide">Paralegal Review</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {review && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                {review.paralegal_name} · Client: {review.client_id}
              </span>
            )}
            {review?.status === "in_progress" && (
              <>
                <button
                  onClick={sendInfoRequest}
                  disabled={sendingRequest}
                  className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  {sendingRequest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Needs Additional Info</span>
                  <span className="sm:hidden">Needs Info</span>
                </button>
                <button
                  onClick={finalizeReview}
                  disabled={finalizing || !allDone}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  {finalizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Finalize Review
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">

        {/* Status banner */}
        {review?.status === "complete" && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-5 py-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-300">Review Complete</p>
              <p className="text-xs text-emerald-600 mt-0.5">All sections have been confirmed. This case is ready for attorney review.</p>
            </div>
          </div>
        )}
        {review?.status === "needs_info" && (
          <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/25 rounded-2xl px-5 py-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-300">Additional Information Requested</p>
              <p className="text-xs text-amber-600 mt-0.5">
                A request was sent to the client on {review.info_request_sent_at ? fmtDate(review.info_request_sent_at) : "—"}.
                The client has been directed back to their portal to provide missing documents.
              </p>
            </div>
          </div>
        )}

        {/* Opening Disclosure — must be confirmed before sections unlock */}
        <div className={`rounded-2xl border overflow-hidden transition-all ${
          disclosureRead
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/40 bg-amber-500/5"
        }`}>
          <button
            onClick={() => setDisclosureExpanded(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              disclosureRead ? "bg-emerald-500/15" : "bg-amber-500/15"
            }`}>
              {disclosureRead
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : <Info className="w-5 h-5 text-amber-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">Opening Disclosure</span>
                {disclosureRead
                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/25">Read & Confirmed</span>
                  : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/25 animate-pulse">Required — Read to Client First</span>
                }
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Must be read aloud to the client before beginning document review</p>
            </div>
            {disclosureExpanded ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          </button>

          {disclosureExpanded && (
            <div className="px-5 pb-5 space-y-4">
              <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Read Aloud to Client</span>
                </div>
                {OPENING_DISCLOSURE.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-amber-100 leading-relaxed italic mb-3 last:mb-0">
                    "{para}"
                  </p>
                ))}
              </div>

              {/* Key points summary for quick reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: <User className="w-3.5 h-3.5" />, color: "text-slate-400", label: "Not Legal Advice", desc: "Paralegal cannot provide legal advice — all legal questions go to the attorney." },
                  { icon: <RefreshCw className="w-3.5 h-3.5" />, color: "text-sky-400", label: "Docs Must Stay Current", desc: "Documents must be updated through the filing date. Final docs needed for Meeting of Creditors." },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-400", label: "Filing Fee & Signing Appt", desc: "After attorney approval, client pays filing fee then schedules signing appointment." },
                  { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-amber-400", label: "Bank Balances on Filing Date", desc: "Client must provide all account balances as of the exact date the case is filed." },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-3">
                    <span className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${item.color}`}>{item.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {!disclosureRead && (
                <button
                  onClick={() => { setDisclosureRead(true); setDisclosureExpanded(false); }}
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-amber-400/20"
                >
                  <Check className="w-4 h-4" />
                  Disclosure Read Aloud — Client Confirmed Understanding
                </button>
              )}
              {disclosureRead && (
                <div className="flex items-center gap-2 text-xs text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmed — proceeding to document review
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="bg-[#0d1221] border border-slate-800 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Review Progress</p>
            <p className="text-xs text-slate-500">{confirmedSections} of {REVIEW_SECTIONS.length} sections complete</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
            <div
              className="h-2 rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: `${REVIEW_SECTIONS.length > 0 ? (confirmedSections / REVIEW_SECTIONS.length) * 100 : 0}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{totalDocs}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Total Docs</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{confirmedDocs}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Confirmed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{needsInfoSections}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Sections w/ Issues</p>
            </div>
          </div>
        </div>

        {/* Gate: sections locked until disclosure is confirmed */}
        {!disclosureRead && (
          <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-5">
            <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400">Document Review Sections Locked</p>
              <p className="text-xs text-slate-600 mt-0.5">Read the opening disclosure to the client and confirm before proceeding.</p>
            </div>
          </div>
        )}

        {disclosureRead && <>
        {/* Section index */}
        <div className="bg-[#0d1221] border border-slate-800 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sections</p>
          <div className="flex flex-wrap gap-2">
            {REVIEW_SECTIONS.map(s => {
              const sc = sectionConfs.find(c => c.section_key === s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    const el = document.getElementById(`section-${s.key}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                    sc?.status === "confirmed"  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                    sc?.status === "needs_info" ? "bg-amber-500/10 border-amber-500/25 text-amber-400" :
                                                  "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {sc?.status === "confirmed"  && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {sc?.status === "needs_info" && <AlertTriangle className="w-2.5 h-2.5" />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section cards */}
        {REVIEW_SECTIONS.map(section => (
          <div key={section.key} id={`section-${section.key}`} className="scroll-mt-20">
            <SectionCard
              section={section}
              docs={docs}
              confirmations={confirmations}
              sectionConf={sectionConfs.find(s => s.section_key === section.key) ?? null}
              onDocUpdate={handleDocUpdate}
              onSectionConfirm={handleSectionConfirm}
              onSectionNeedsInfo={handleSectionNeedsInfo}
            />
          </div>
        ))}

        {/* Uncategorized docs */}
        {(() => {
          const categorizedIds = new Set(
            REVIEW_SECTIONS.flatMap(s =>
              docs.filter(d =>
                s.docCategories.includes(d.document_category) ||
                (s.docTypes ?? []).includes(d.document_type)
              ).map(d => d.id)
            )
          );
          const uncategorized = docs.filter(d => !categorizedIds.has(d.id));
          if (uncategorized.length === 0) return null;
          return (
            <div className="rounded-2xl border border-slate-700/60 bg-[#0d1221] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm font-bold text-white">Other Documents</p>
                  <p className="text-xs text-slate-500 mt-0.5">Documents not matched to a specific review section</p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2">
                {uncategorized.map(d => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    confirmation={confirmations.find(c => c.client_document_id === d.id) ?? null}
                    sections={REVIEW_SECTIONS}
                    sectionKey="other"
                    onUpdate={handleDocUpdate}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        {/* Bottom action */}
        {review?.status === "in_progress" && needsInfoSections > 0 && (
          <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-300">{needsInfoSections} section{needsInfoSections !== 1 ? "s" : ""} need additional information</p>
                <p className="text-xs text-amber-600 mt-0.5">Send the client a link to return to their portal and upload or correct the missing documents.</p>
              </div>
            </div>
            <button
              onClick={sendInfoRequest}
              disabled={sendingRequest}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50 flex-shrink-0"
            >
              {sendingRequest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Info Request
            </button>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
