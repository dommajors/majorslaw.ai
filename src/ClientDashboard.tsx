import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  CreditCard,
  FileText,
  AlertTriangle,
  Info,
  ArrowRight,
  User,
  Calendar,
  Briefcase,
  Hash,
  X,
  RefreshCw,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  Scale,
  MapPin,
  Flag,
  DollarSign,
  Send,
  Lock,
} from "lucide-react";
import CreditReportUploader from "./CreditReportUploader";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CLIENT_ID = "client-demo";

interface ClientQuestion {
  id: string;
  question: string;
  ai_response: string | null;
  status: 'answered' | 'needs_attorney' | 'pending_review';
  escalated: boolean;
  needs_additional_explanation: boolean;
  attorney_answer: string | null;
  answered_by: string | null;
  asked_at: string;
  section_context: string | null;
}

const CASE_DATA = {
  clientName: "David Kim",
  spouseName: "Jennifer Kim",
  chapter: "7",
  // "regular" = Ch. 7 Prepaid (full payment required before filing)
  // "bifurcated" = Ch. 7 Bifurcated (can file, then continue paying)
  case_type: "regular" as "regular" | "bifurcated",
  caseNumber: "Pending",
  attorney: "Jennifer Smith, Esq.",
  firm: "MAJORSLAW.ai Legal Group",
  filingType: "Individual — Non-Filing Spouse",
  retainerDate: "2026-03-15",
  estimatedFilingDate: "2026-06-10",
  totalFee: 1838,
  paidToDate: 900,
  payoffDate: "2026-05-28",
  currentStage: 2,
  paymentLink: "https://pay.example.com/bk-client",
};

// Mock payment history — in production this would come from the database
const PAYMENT_HISTORY = [
  { id: "p1", amount: 400, date: "2026-03-15", method: "Credit Card", confirmation: "TXN-7841209", confirmed_at: "2026-03-15T14:23:00Z", type: "Attorney Fee" },
  { id: "p2", amount: 300, date: "2026-04-01", method: "ACH", confirmation: "ACH-5529813", confirmed_at: "2026-04-01T09:15:00Z", type: "Attorney Fee" },
  { id: "p3", amount: 200, date: "2026-04-15", method: "Credit Card", confirmation: "TXN-9930041", confirmed_at: "2026-04-15T11:02:00Z", type: "Attorney Fee" },
];

// Mock upcoming payment schedule
const UPCOMING_SCHEDULE = [
  { id: "s1", installment: 4, due_date: "2026-05-01", amount: 246, status: "pending" as const },
  { id: "s2", installment: 5, due_date: "2026-05-15", amount: 246, status: "pending" as const },
  { id: "s3", installment: 6, due_date: "2026-05-28", amount: 246, status: "pending" as const },
];

const daysToPayoff = Math.ceil(
  (new Date(CASE_DATA.payoffDate).getTime() - new Date().getTime()) /
    (1000 * 60 * 60 * 24)
);

// For Ch.7 Prepaid: docs/info unlock within 90 days of payoff. For bifurcated: 60 days.
const DOC_UNLOCK_THRESHOLD = CASE_DATA.case_type === "regular" ? 90 : 60;
const isDocUnlocked = daysToPayoff <= DOC_UNLOCK_THRESHOLD;

const CASE_TYPE_LABEL = CASE_DATA.case_type === "regular" ? "Ch. 7 — Prepaid" : "Ch. 7 — Bifurcated";

const STAGES = [
  {
    id: 1,
    label: "Intake & Retention",
    sub: "Signed retainer, completed intake questionnaire",
    status: "complete",
    date: "March 15, 2026",
    icon: "📋",
    purpose:
      "You retained our firm to represent you in your Chapter 7 bankruptcy case. During this stage, you completed the initial intake questionnaire and signed the retainer agreement.",
    whatToDo: [] as string[],
    whatHappensNext:
      "Your case moves to Stage 2 — Information and Documents Collection, where you will complete the detailed financial questionnaire and begin gathering your required documents.",
  },
  {
    id: 2,
    label: "Information & Documents",
    sub: "Complete financial questionnaire and upload documents",
    status: "active",
    date: "In Progress",
    icon: "📝",
    purpose:
      "This is where your fresh start truly begins. Here we gather everything your attorney needs to prepare your bankruptcy petition — your income, assets, debts, and a financial history covering the past 10 years. Take your time, be thorough, and know that every section you complete moves you one step closer to being debt-free.",
    whatToDo: [
      "Income from all sources — employment, self-employment, Social Security, rental, and more",
      "Assets — real estate, vehicles, bank accounts, retirement accounts, and personal property",
      "All debts and creditors — secured loans, priority debts, and every unsecured creditor",
      "Monthly living expenses",
      "Financial history — transfers, large payments, lawsuits, garnishments (past 10 years)",
      "Lawsuits, collections, repossessions, or foreclosures",
    ],
    uploadDocuments:
      "Once your questionnaire is underway, you will be asked to submit supporting documents — pay stubs, bank statements, tax returns, identification, and statements for each creditor. Our AI tools can read and scan your documents for faster, more accurate entry. Every AI result is reviewed by your attorney before anything is filed.",
    whyLater:
      "We collect documents as close to your filing date as possible. Bankruptcy law requires that all financial records reflect your situation at the time of filing — not months earlier. Documents collected too early become stale and must be re-collected, which delays your case. When we enter a new calendar month, updated statements will be required.",
    monthlyUpdates: true,
    whatHappensNext:
      "Once all information is provided and all documents are submitted, we will schedule a review to confirm everything is complete and gathered. After that, your case moves to Stage 3 — Attorney Review & Case Preparation, where your attorney prepares your petition for filing.",
  },
  {
    id: 3,
    label: "Attorney Review",
    sub: "Attorney reviews your petition and schedules",
    status: "upcoming",
    date: "Est. Late May 2026",
    icon: "⚖️",
    purpose:
      "Our legal team will review all information and documents you submitted to verify accuracy and completeness. Your attorney will prepare your bankruptcy petition and all required schedules.",
    whatToDo: [
      "Respond promptly to any follow-up questions from your attorney",
      "Review your draft petition for accuracy",
      "Sign the declaration verifying the information is true and correct",
    ],
    whatHappensNext:
      "Once your petition is finalized and all documents are verified, your case moves to Stage 4 — Signing Appointment, where you will sign the official bankruptcy documents.",
  },
  {
    id: 4,
    label: "Signing Appointment",
    sub: "Sign official bankruptcy petition and schedules",
    status: "upcoming",
    date: "Est. June 2026",
    icon: "✍️",
    purpose:
      "You will meet with your attorney (in-person or virtually) to review and sign your completed bankruptcy petition, schedules, and all required official forms before filing.",
    whatToDo: [
      "Bring a current bank balance screenshot (day-of)",
      "Bring government-issued photo ID",
      "Review all documents carefully before signing",
      "Bring any outstanding required documents",
    ],
    whatHappensNext:
      "After signing, your case moves immediately to Stage 5 — Filing with the Court. Your attorney will submit your bankruptcy petition electronically.",
  },
  {
    id: 5,
    label: "Filing with the Court",
    sub: "Case filed with the U.S. Bankruptcy Court",
    status: "upcoming",
    date: "Est. June 2026",
    icon: "🏛️",
    purpose:
      "Your attorney files your completed bankruptcy petition with the U.S. Bankruptcy Court. This triggers the automatic stay, which immediately stops most collection actions, wage garnishments, and foreclosures.",
    whatToDo: [
      "No action needed — your attorney handles filing",
      "Watch for your case number from the court",
      "Review your Notice of Bankruptcy Case Filing",
    ],
    whatHappensNext:
      "The court will schedule your 341 Meeting of Creditors, typically 21–40 days after filing. You will receive a notice with the date, time, and instructions.",
  },
  {
    id: 6,
    label: "341 Meeting of Creditors",
    sub: "Mandatory hearing — typically 10–15 minutes",
    status: "upcoming",
    date: "Est. July 2026",
    icon: "🗣️",
    purpose:
      "The 341 Meeting is a brief, informal hearing required by law. You will answer questions from the bankruptcy trustee under oath about your financial affairs. Creditors may attend but rarely do in Chapter 7 cases.",
    whatToDo: [
      "Bring government-issued photo ID",
      "Bring your Social Security card",
      "Arrive 15 minutes early",
      "Answer all questions truthfully",
    ],
    whatHappensNext:
      "After the 341 Meeting, there is a 60-day objection period. If no objections are filed, your case moves to Stage 7 — Discharge.",
  },
  {
    id: 7,
    label: "Discharge",
    sub: "Eligible debts legally discharged by the court",
    status: "upcoming",
    date: "Est. September 2026",
    icon: "🎯",
    purpose:
      "The court issues a discharge order, legally eliminating your eligible debts. Most unsecured debts (credit cards, medical bills, personal loans) will be discharged. Certain debts like student loans and recent taxes are generally non-dischargeable.",
    whatToDo: [] as string[],
    whatHappensNext:
      "Your case is closed. You will receive the official discharge order by mail. Keep this document permanently — it is proof that your debts were legally discharged.",
  },
];

const FORM_STEPS = [
  { id: "b101",      label: "Personal Information",       step: "1",  status: "complete" },
  { id: "b106ab",    label: "Property & Assets",          step: "2",  status: "active"   },
  { id: "secured",   label: "Secured Creditors",          step: "3",  status: "pending"  },
  { id: "unsecured", label: "Priority & Unsecured Debts", step: "4",  status: "pending"  },
  { id: "leases",    label: "Leases & Contracts",         step: "5",  status: "pending"  },
  { id: "income",    label: "Monthly Income",             step: "6",  status: "pending"  },
  { id: "expenses",  label: "Monthly Expenses",           step: "7",  status: "pending"  },
  { id: "sofa",      label: "Financial History",          step: "8",  status: "pending"  },
  { id: "docs",      label: "Document Upload",            step: "9",  status: "pending"  },
  { id: "ack",       label: "Review & Submit",            step: "10", status: "pending"  },
];

function PaymentPanel({
  onClose,
  changeTarget,
  setChangeTarget,
  payInFullRequested,
  setPayInFullRequested,
  changeRequestSent,
  setChangeRequestSent,
}: {
  onClose: () => void;
  changeTarget: typeof UPCOMING_SCHEDULE[0] | null;
  setChangeTarget: (v: typeof UPCOMING_SCHEDULE[0] | null) => void;
  payInFullRequested: boolean;
  setPayInFullRequested: (v: boolean) => void;
  changeRequestSent: string | null;
  setChangeRequestSent: (v: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "upcoming">("history");
  const [changeNote, setChangeNote] = useState("");
  const [payInFullNote, setPayInFullNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const paidPct = Math.round((CASE_DATA.paidToDate / CASE_DATA.totalFee) * 100);
  const remaining = CASE_DATA.totalFee - CASE_DATA.paidToDate;

  function isWithin24Hours(dueDateStr: string) {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
  }

  async function submitChangeRequest() {
    if (!changeTarget || !changeNote.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/client_payment_change_requests`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          requested_by_client_id: CLIENT_ID,
          request_type: "change_date",
          notes: changeNote,
        }),
      });
      setChangeRequestSent(changeTarget.id);
      setChangeTarget(null);
      setChangeNote("");
    } catch { /* silently fail */ }
    setSubmitting(false);
  }

  async function submitPayInFull() {
    setSubmitting(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/client_payment_change_requests`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          requested_by_client_id: CLIENT_ID,
          request_type: "pay_in_full",
          notes: payInFullNote || null,
        }),
      });
      setPayInFullRequested(true);
      setPayInFullNote("");
    } catch { /* silently fail */ }
    setSubmitting(false);
  }

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
  const fmtDateTime = (d: string) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(d));
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-[#0d1221] border border-slate-700 rounded-none sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[90vh] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400">{CASE_TYPE_LABEL}</span>
            </div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>Payment Summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">{CASE_DATA.clientName} · Chapter {CASE_DATA.chapter}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors flex-shrink-0 mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">{fmt(CASE_DATA.paidToDate)} paid</span>
            <span className="text-xs font-semibold text-slate-400">{fmt(remaining)} remaining</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="h-2 rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${paidPct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-600">{paidPct}% of {fmt(CASE_DATA.totalFee)}</span>
            <span className="text-[11px] text-slate-600">Payoff by {fmtDate(CASE_DATA.payoffDate)}</span>
          </div>

          {CASE_DATA.case_type === "regular" && (
            <div className="mt-3 flex items-start gap-2 bg-sky-500/8 border border-sky-500/20 rounded-xl px-3.5 py-2.5">
              <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-sky-200/80 leading-relaxed">
                <strong className="text-white">Ch. 7 — Prepaid:</strong> Your case cannot be filed until the full attorney fee is paid. Once paid in full, your case moves to signing and filing.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          {(["history", "upcoming"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2 -mb-px ${activeTab === t ? "border-sky-500 text-sky-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              {t === "history" ? "Payments Made" : "Upcoming Payments"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "history" && (
            <div className="space-y-2.5">
              {PAYMENT_HISTORY.length === 0 ? (
                <p className="text-xs text-slate-600 py-6 text-center">No payments recorded yet.</p>
              ) : PAYMENT_HISTORY.map(p => (
                <div key={p.id} className="bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-white">{fmt(p.amount)}</span>
                      <span className="text-[10px] text-slate-500">{p.type}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Paid</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="text-[11px] text-slate-500">{fmtDate(p.date)} · {p.method}</span>
                    {p.confirmation && (
                      <span className="text-[11px] font-mono text-sky-400">Conf: {p.confirmation}</span>
                    )}
                  </div>
                  {p.confirmed_at && (
                    <p className="text-[10px] text-slate-600 mt-0.5">Confirmed by processor: {fmtDateTime(p.confirmed_at)}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "upcoming" && (
            <div className="space-y-2.5">
              {changeRequestSent && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3.5 py-3 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-300 font-semibold">Your change request has been sent. Our team will follow up with you.</p>
                </div>
              )}
              {UPCOMING_SCHEDULE.map(s => {
                const withinWindow = isWithin24Hours(s.due_date);
                const alreadyRequested = changeRequestSent === s.id;
                return (
                  <div key={s.id} className="bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-slate-400">#{s.installment}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{fmt(s.amount)}</span>
                        <span className="text-[10px] text-slate-500">due {fmtDate(s.due_date)}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-700/50 border border-slate-700 px-2 py-0.5 rounded-full capitalize">{s.status}</span>
                    </div>
                    {!alreadyRequested && (
                      <div className="mt-2.5 flex gap-2">
                        <button
                          onClick={() => setChangeTarget(s)}
                          disabled={!withinWindow}
                          title={!withinWindow ? "Change requests must be submitted within 24 hours of the payment due date" : undefined}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${withinWindow ? "text-amber-400 bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20 cursor-pointer" : "text-slate-600 bg-slate-800/50 border-slate-800 cursor-not-allowed"}`}
                        >
                          <Clock className="w-3 h-3" /> Request Change
                          {!withinWindow && <Lock className="w-3 h-3 ml-0.5" />}
                        </button>
                      </div>
                    )}
                    {alreadyRequested && (
                      <p className="text-[10px] text-emerald-400 mt-2">Change request submitted</p>
                    )}
                    {!withinWindow && (
                      <p className="text-[10px] text-slate-600 mt-1.5">Change requests open within 24 hrs of due date</p>
                    )}
                  </div>
                );
              })}

              {/* Pay in full */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                {payInFullRequested ? (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-300">Pay in Full Request Received</p>
                      <p className="text-xs text-slate-500 mt-0.5">Our team will reach out with payment instructions shortly.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-sky-500/6 border border-sky-500/20 rounded-xl px-4 py-4">
                    <div className="flex items-start gap-3 mb-3">
                      <DollarSign className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-white">Pay Remaining Balance in Full</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          Pay the remaining {fmt(remaining)} now to complete your retainer. For Ch. 7 — Prepaid cases, full payment is required before your case can be filed.
                        </p>
                      </div>
                    </div>
                    <textarea
                      value={payInFullNote}
                      onChange={e => setPayInFullNote(e.target.value)}
                      rows={2}
                      placeholder="Optional: preferred payment method or timing note…"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none mb-3"
                    />
                    <button
                      onClick={submitPayInFull}
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl transition-all"
                    >
                      {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Request Pay in Full
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Change request sub-modal */}
        {changeTarget && (
          <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm rounded-2xl">
            <div className="w-full max-w-sm bg-[#111827] border border-slate-700 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">Request Payment Change</p>
                <button onClick={() => { setChangeTarget(null); setChangeNote(""); }} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                You are requesting a change to installment #{changeTarget.installment} (
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(changeTarget.amount)}{" "}
                due {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(changeTarget.due_date))}).
                Requests must be submitted at least 24 hours before the due date.
              </p>
              <textarea
                value={changeNote}
                onChange={e => setChangeNote(e.target.value)}
                rows={3}
                placeholder="Describe the change you need (new date, amount adjustment, etc.)…"
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => { setChangeTarget(null); setChangeNote(""); }} className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-all">Cancel</button>
                <button
                  onClick={submitChangeRequest}
                  disabled={!changeNote.trim() || submitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-40 rounded-xl transition-all"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionsPanel({ questions, expanded, onToggle }: {
  questions: ClientQuestion[];
  expanded: string | null;
  onToggle: (id: string | null) => void;
}) {
  const pending = questions.filter(q => q.status === 'needs_attorney' || q.status === 'pending_review');
  const answered = questions.filter(q => q.status === 'answered' || q.attorney_answer);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const displayList = tab === 'pending' ? pending : questions;

  function statusBadge(q: ClientQuestion) {
    if (q.attorney_answer) return <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full whitespace-nowrap">Answered</span>;
    if (q.status === 'needs_attorney') return <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full whitespace-nowrap">Pending Attorney</span>;
    if (q.status === 'answered') return <span className="text-xs font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">Answered by AI</span>;
    return <span className="text-xs font-bold text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">Logged</span>;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white leading-none">My Questions</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {questions.length} total
                {pending.length > 0 && <> · <span className="text-amber-400 font-semibold">{pending.length} pending attorney review</span></>}
                {answered.length > 0 && !pending.length && <> · <span className="text-emerald-400 font-semibold">{answered.length} answered</span></>}
              </p>
            </div>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/25 rounded-full px-2.5 py-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{pending.length} needs review</span>
            </div>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <HelpCircle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium mb-1">No questions yet</p>
          <p className="text-slate-600 text-xs max-w-xs mx-auto">
            Use the Case Assistant chat button to ask questions about your bankruptcy case. All questions are saved here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex border-b border-slate-800">
            {(['pending', 'all'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  tab === t
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t === 'pending' ? `Pending Review (${pending.length})` : `All Questions (${questions.length})`}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
            {displayList.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No questions pending attorney review.</p>
              </div>
            ) : (
              displayList.map(q => {
                const isExpanded = expanded === q.id;
                return (
                  <div key={q.id} className={`px-5 py-3.5 transition-colors ${q.status === 'needs_attorney' ? 'bg-amber-400/3' : ''}`}>
                    <button onClick={() => onToggle(isExpanded ? null : q.id)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-white font-medium leading-snug flex-1 pr-2">{q.question}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {statusBadge(q)}
                          <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {q.section_context && <span className="text-xs text-slate-600">In: {q.section_context}</span>}
                        <span className="text-xs text-slate-700">
                          {new Date(q.asked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {q.needs_additional_explanation && (
                          <span className="text-xs text-amber-400/70 italic">Requested more detail</span>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {q.ai_response && (
                          <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5">
                            <p className="text-xs font-semibold text-slate-400 mb-1">Case Assistant:</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{q.ai_response}</p>
                          </div>
                        )}
                        {q.attorney_answer && (
                          <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl px-3 py-2.5">
                            <p className="text-xs font-semibold text-emerald-400 mb-1">
                              Attorney{q.answered_by ? ` (${q.answered_by})` : ''}:
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed">{q.attorney_answer}</p>
                          </div>
                        )}
                        {q.status === 'needs_attorney' && !q.attorney_answer && (
                          <div className="flex items-start gap-2 bg-amber-400/8 border border-amber-400/20 rounded-xl px-3 py-2.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                              This question has been sent to your attorney team. You will receive a response within 24–48 hours.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface ClientDashboardProps {
  onOpenQuestionnaire: () => void;
  onUpdateInformation: () => void;
}

export default function ClientDashboard({ onOpenQuestionnaire, onUpdateInformation }: ClientDashboardProps) {
  const [activeStageId, setActiveStageId] = useState<number | null>(null);
  const [showStage2Panel, setShowStage2Panel] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showCreditUploader, setShowCreditUploader] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentChangeTarget, setPaymentChangeTarget] = useState<typeof UPCOMING_SCHEDULE[0] | null>(null);
  const [payInFullRequested, setPayInFullRequested] = useState(false);
  const [changeRequestSent, setChangeRequestSent] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/client_questions?client_id=eq.${CLIENT_ID}&order=asked_at.desc`,
          { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        if (res.ok) setQuestions(await res.json());
      } catch { /* silently fail */ }
    }
    loadQuestions();
    const interval = setInterval(loadQuestions, 30000);
    return () => clearInterval(interval);
  }, []);

  const detailStage = STAGES.find(s => s.id === activeStageId) ?? null;
  const stage2 = STAGES.find(s => s.id === 2)!;
  const paidPct = Math.round((CASE_DATA.paidToDate / CASE_DATA.totalFee) * 100);
  const remaining = CASE_DATA.totalFee - CASE_DATA.paidToDate;
  const stepsComplete = FORM_STEPS.filter(s => s.status === "complete").length;
  const currentActiveStep = FORM_STEPS.find(s => s.status === "active");
  const completedStages = STAGES.filter(s => s.status === "complete").length;
  const currentStageData = STAGES.find(s => s.id === CASE_DATA.currentStage)!;
  const nextStage = STAGES.find(s => s.id === CASE_DATA.currentStage + 1);

  function handleContinueClick() {
    setShowStage2Panel(true);
    setAcknowledged(false);
  }

  function handleLaunchQuestionnaire() {
    setShowStage2Panel(false);
    onOpenQuestionnaire();
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>

      {/* ── Top Navigation ── */}
      <header className="bg-[#0d1221]/95 border-b border-slate-800/60 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
                <Scale className="w-4 h-4 text-slate-950" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                MAJORSLAW<span className="text-amber-400">.ai</span>
              </span>
            </div>
            <span className="hidden sm:block text-slate-700">|</span>
            <span className="hidden sm:block text-slate-500 text-xs font-medium tracking-wide uppercase">Client Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={isDocUnlocked ? onUpdateInformation : undefined}
              title={!isDocUnlocked ? `Locked — available within ${DOC_UNLOCK_THRESHOLD} days of payoff` : undefined}
              className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isDocUnlocked ? "bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white cursor-pointer" : "bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed"}`}
            >
              {isDocUnlocked ? <RefreshCw className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Update My Information</span>
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-semibold">{CASE_DATA.clientName}</p>
              <p className="text-slate-500 text-xs">Chapter {CASE_DATA.chapter} · Case # {CASE_DATA.caseNumber}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 text-sm font-bold">
              {CASE_DATA.clientName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Where You Are Right Now — Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[#141b2e] via-[#111827] to-[#0d1221]">
          {/* Background accent */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative px-6 py-7 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

              {/* Left: Current position */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    <MapPin className="w-3 h-3" /> You Are Here
                  </span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-slate-500 text-xs">{completedStages} of {STAGES.length} stages complete</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                  Stage {CASE_DATA.currentStage} — {currentStageData.label}
                </h1>
                <p className="text-slate-400 text-sm mb-4 max-w-lg">{currentStageData.sub}</p>

                {/* Questionnaire progress */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 max-w-xs bg-slate-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all"
                      style={{ width: `${(stepsComplete / FORM_STEPS.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    <strong className="text-white">{stepsComplete}</strong>/{FORM_STEPS.length} sections done
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Currently on: <span className="text-slate-400 font-medium">{currentActiveStep?.label}</span>
                </p>
              </div>

              {/* Right: Action */}
              <div className="flex flex-col gap-3 sm:items-end flex-shrink-0">
                <button
                  onClick={handleContinueClick}
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30"
                >
                  Continue Questionnaire
                  <ArrowRight className="w-4 h-4" />
                </button>
                {nextStage && (
                  <p className="text-xs text-slate-500 sm:text-right">
                    Up next: <span className="text-slate-400">Stage {nextStage.id} — {nextStage.label}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Journey Tracker + Detail ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Journey Tracker */}
          <div className="xl:col-span-1">
            <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Case Journey</p>
                <p className="text-white font-semibold text-sm mt-0.5" style={{ fontFamily: "'Georgia', serif" }}>
                  Chapter {CASE_DATA.chapter} Bankruptcy
                </p>
              </div>

              {/* Stage list */}
              <div className="px-3 py-3 space-y-0.5">
                {STAGES.map((stage, idx) => {
                  const isSelected = activeStageId === stage.id;
                  const isCurrent = CASE_DATA.currentStage === stage.id;
                  const isComplete = stage.status === "complete";
                  const isActive = stage.status === "active";
                  const isLast = idx === STAGES.length - 1;

                  return (
                    <div key={stage.id} className="flex gap-2.5">
                      {/* Track line */}
                      <div className="flex flex-col items-center flex-shrink-0 pt-3">
                        {/* Node */}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isComplete
                            ? "bg-emerald-500 border-emerald-500"
                            : isActive
                              ? "bg-amber-400 border-amber-400 ring-4 ring-amber-400/20"
                              : "border-slate-700 bg-slate-900"
                        }`}>
                          {isComplete
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            : isActive
                              ? <span className="w-1.5 h-1.5 bg-slate-950 rounded-full block" />
                              : <span className="text-[10px] font-bold text-slate-600">{stage.id}</span>
                          }
                        </div>
                        {/* Connector */}
                        {!isLast && (
                          <div className={`w-px flex-1 my-1 min-h-[16px] ${isComplete ? "bg-emerald-500/40" : "bg-slate-800"}`} />
                        )}
                      </div>

                      {/* Row button */}
                      <button
                        onClick={() => setActiveStageId(isSelected ? null : stage.id)}
                        className={`flex-1 text-left px-3 py-2.5 rounded-xl mb-0.5 transition-all group ${
                          isSelected
                            ? isCurrent
                              ? "bg-amber-400/10 border border-amber-400/30"
                              : isComplete
                                ? "bg-emerald-500/10 border border-emerald-500/20"
                                : "bg-slate-800 border border-slate-700"
                            : "hover:bg-slate-800/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isCurrent && (
                              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            )}
                            <p className={`text-xs font-semibold leading-snug truncate ${
                              isComplete ? "text-slate-300"
                              : isActive   ? "text-white"
                              :              "text-slate-500"
                            }`}>
                              {stage.label}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-400/15 text-amber-400 border border-amber-400/25 px-1.5 py-px rounded-full font-bold leading-none whitespace-nowrap">
                                Now
                              </span>
                            )}
                            <ChevronRight className={`w-3 h-3 text-slate-700 group-hover:text-slate-500 transition-all ${isSelected ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate">{stage.date}</p>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Journey footer — finish line */}
              <div className="mx-3 mb-3 px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-400">Finish Line</p>
                    <p className="text-[10px] text-slate-500">Discharge — Est. September 2026</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Pane */}
          <div className="xl:col-span-2 space-y-5">

            {/* Stage detail or default cards */}
            {detailStage ? (
              <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
                <div className={`px-6 py-5 border-b border-slate-800 ${detailStage.status === "active" ? "bg-amber-400/5" : detailStage.status === "complete" ? "bg-emerald-500/5" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                          detailStage.status === "complete" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" :
                          detailStage.status === "active"   ? "text-amber-400 bg-amber-400/10 border-amber-400/30" :
                                                              "text-slate-500 bg-slate-800 border-slate-700"
                        }`}>
                          {detailStage.status === "complete"
                            ? <><CheckCircle2 className="w-3 h-3" /> Completed</>
                            : detailStage.status === "active"
                              ? <><Clock className="w-3 h-3" /> In Progress</>
                              : <><Circle className="w-3 h-3" /> Upcoming</>
                          }
                        </span>
                        <span className="text-xs text-slate-500">{detailStage.date}</span>
                      </div>
                      <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>
                        Stage {detailStage.id} — {detailStage.label}
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">{detailStage.sub}</p>
                    </div>
                    <button onClick={() => setActiveStageId(null)} className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <section className="px-6 py-5 border-b border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">About This Stage</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{detailStage.purpose}</p>
                </section>

                {detailStage.whatToDo.length > 0 && (
                  <section className="px-6 py-5 border-b border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">What You Need to Do</p>
                    <ul className="space-y-2">
                      {detailStage.whatToDo.map(item => (
                        <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                          <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="px-6 py-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">What Happens Next</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{detailStage.whatHappensNext}</p>
                </section>
              </div>
            ) : (
              /* Default "no stage selected" state — show action cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Action: questionnaire */}
                <button
                  onClick={handleContinueClick}
                  className="group bg-[#0d1221] border border-amber-400/20 hover:border-amber-400/40 rounded-2xl p-5 text-left transition-all hover:bg-amber-400/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">Action Required</p>
                      <p className="text-sm font-bold text-white mb-1">Continue Questionnaire</p>
                      <p className="text-xs text-slate-500 leading-snug">
                        Step {currentActiveStep?.step} of {FORM_STEPS.length} · {currentActiveStep?.label}
                      </p>
                      <div className="mt-2 bg-slate-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-amber-400 transition-all"
                          style={{ width: `${(stepsComplete / FORM_STEPS.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* Action: payment */}
                <button
                  onClick={() => setShowPaymentPanel(true)}
                  className="group bg-[#0d1221] border border-slate-800 hover:border-sky-500/30 rounded-2xl p-5 text-left transition-all hover:bg-sky-500/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-sky-500">{CASE_TYPE_LABEL}</p>
                      </div>
                      <p className="text-sm font-bold text-white mb-1">${CASE_DATA.paidToDate.toLocaleString()} of ${CASE_DATA.totalFee.toLocaleString()} paid</p>
                      <p className="text-xs text-slate-500">${remaining.toLocaleString()} remaining · payoff by {CASE_DATA.payoffDate}</p>
                      <div className="mt-2 bg-slate-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-sky-500 transition-all"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sky-600 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* What's blocking */}
                {(stepsComplete < FORM_STEPS.length || daysToPayoff > 0) && (
                  <div className="sm:col-span-2 bg-[#0d1221] border border-red-500/20 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">What Must Be Done Before Filing</p>
                        <ul className="space-y-1.5">
                          {stepsComplete < FORM_STEPS.length && (
                            <li className="text-xs text-slate-300 flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                              Questionnaire incomplete — {FORM_STEPS.length - stepsComplete} section{FORM_STEPS.length - stepsComplete !== 1 ? "s" : ""} remaining
                            </li>
                          )}
                          {daysToPayoff > 0 && (
                            <li className="text-xs text-slate-300 flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                              Attorney fees not paid in full — ${remaining.toLocaleString()} still due by {CASE_DATA.payoffDate}
                            </li>
                          )}
                          {!isDocUnlocked && (
                            <li className="text-xs text-slate-300 flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-slate-500 flex-shrink-0" />
                              Document upload unlocks within {DOC_UNLOCK_THRESHOLD} days of payoff ({daysToPayoff} days away)
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hint to explore stages */}
                <div className="sm:col-span-2 flex items-center gap-3 px-5 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl">
                  <Briefcase className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <p className="text-xs text-slate-600">
                    Select any stage in the journey tracker to learn what happens at each point in your case.
                  </p>
                </div>
              </div>
            )}

            {/* ── Case Reference ── */}
            <div className="bg-[#0d1221] border border-slate-800 rounded-2xl px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  <span className="text-slate-300 font-medium">{CASE_DATA.clientName}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Scale className="w-3 h-3" />
                  <span>Chapter {CASE_DATA.chapter}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />
                  <span>{CASE_DATA.attorney}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>Est. filing {CASE_DATA.estimatedFilingDate}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3" />
                  <span>Case # {CASE_DATA.caseNumber}</span>
                </span>
              </div>
            </div>

            {/* ── Credit Report Import ── */}
            <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowCreditUploader(v => !v)}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white leading-none">Credit Report — Creditor Import</p>
                    <p className="text-xs text-slate-500 mt-0.5">Upload from Stretto, Experian, TransUnion, or Equifax</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showCreditUploader ? "rotate-180" : ""}`} />
              </button>
              {showCreditUploader && (
                <div className="border-t border-slate-800 p-5">
                  <CreditReportUploader />
                </div>
              )}
            </div>

            {/* ── Questions Panel ── */}
            <QuestionsPanel questions={questions} expanded={expandedQuestion} onToggle={setExpandedQuestion} />

          </div>
        </div>
      </div>

      {/* ── Payment Panel ── */}
      {showPaymentPanel && (
        <PaymentPanel
          onClose={() => setShowPaymentPanel(false)}
          changeTarget={paymentChangeTarget}
          setChangeTarget={setPaymentChangeTarget}
          payInFullRequested={payInFullRequested}
          setPayInFullRequested={setPayInFullRequested}
          changeRequestSent={changeRequestSent}
          setChangeRequestSent={setChangeRequestSent}
        />
      )}

      {/* ── Stage 2 Detail Panel ── */}
      {showStage2Panel && (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6 bg-slate-950/90 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl bg-[#0d1221] border border-slate-700 rounded-none sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[90vh] shadow-2xl">

            <div className="px-6 py-5 border-b border-slate-800 bg-amber-400/5 flex items-start justify-between gap-4 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border text-amber-400 bg-amber-400/10 border-amber-400/30">
                    <Clock className="w-3 h-3" /> In Progress
                  </span>
                  <span className="text-xs text-slate-500">{stage2.date}</span>
                </div>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>
                  Stage 2 — {stage2.label}
                </h2>
                <p className="text-slate-400 text-sm mt-1">{stage2.sub}</p>
              </div>
              <button onClick={() => setShowStage2Panel(false)} className="text-slate-500 hover:text-white transition-colors flex-shrink-0 mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <section className="px-6 py-5 border-b border-slate-800 bg-amber-400/3">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Your Fresh Start Begins Here</p>
                <p className="text-slate-200 text-sm leading-relaxed">{stage2.purpose}</p>
              </section>

              <section className="px-6 py-5 border-b border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">What We Are Gathering</p>
                <ul className="space-y-2.5">
                  {stage2.whatToDo.map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="px-6 py-5 border-b border-slate-800">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2">AI Tools for Faster, More Accurate Entry</p>
                    <p className="text-slate-300 text-sm leading-relaxed mb-3">{stage2.uploadDocuments}</p>
                    {isDocUnlocked ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-emerald-300 text-sm font-semibold">
                          Document uploads are now unlocked — you are {daysToPayoff} days from payoff.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                        <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-300 text-sm font-semibold mb-0.5">Document uploads are locked</p>
                          <p className="text-slate-400 text-sm">
                            {CASE_DATA.case_type === "regular"
                              ? `Your case is Ch. 7 — Prepaid. Documents and detailed information must be fully updated within 90 days of your payoff date to ensure records are current at the time of filing. Currently `
                              : `Document uploads unlock when you are within ${DOC_UNLOCK_THRESHOLD} days of payoff — currently `}
                            <strong className="text-white">{daysToPayoff} days</strong> away.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="px-6 py-5 border-b border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">Ongoing Document Requirements</p>
                <div className="space-y-4">
                  {[
                    {
                      num: "1",
                      color: "amber",
                      title: "While Completing the Questionnaire",
                      body: <>All information and documents must be complete before your case can be filed. <strong className="text-white">When we enter a new calendar month</strong>, updated bank statements, pay stubs, and any other time-sensitive documents will be required before we can proceed.</>,
                    },
                    {
                      num: "2",
                      color: "amber",
                      title: "Before Filing — Signing Appointment",
                      body: <>Once your petition is drafted and your signing appointment is scheduled, you must provide <strong className="text-white">current pay stubs and bank statements</strong> reflecting that month's records. If your signing falls in a new calendar month, updated documents are required before we can proceed.</>,
                    },
                    {
                      num: "3",
                      color: "sky",
                      title: "After Filing — Trustee Requirements",
                      body: <>Once your case is filed, <strong className="text-white">your obligations continue.</strong> The bankruptcy trustee may request updated bank statements, tax returns, proof of income, or other records at any time. You are required by law to cooperate fully and promptly.</>,
                      warning: "Failure to comply with trustee requests can result in dismissal of your case or denial of your discharge.",
                    },
                  ].map(({ num, color, title, body, warning }) => (
                    <div key={num} className="flex gap-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        color === "amber" ? "bg-amber-400/15 border border-amber-400/30" : "bg-sky-500/15 border border-sky-500/30"
                      }`}>
                        <span className={`font-bold text-xs ${color === "amber" ? "text-amber-400" : "text-sky-400"}`}>{num}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold mb-1 ${color === "amber" ? "text-amber-300" : "text-sky-300"}`}>{title}</p>
                        <p className="text-slate-300 text-sm leading-relaxed mb-2">{body}</p>
                        {warning && (
                          <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300 leading-relaxed"><strong className="text-white">{warning}</strong></p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="px-6 py-5 border-b border-slate-800">
                <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-4">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-300 mb-2">All Information Must Be True, Accurate, and Complete</p>
                    <p className="text-slate-300 text-sm leading-relaxed mb-2">
                      Bankruptcy is a <strong className="text-white">federal legal procedure.</strong> Every answer is submitted under penalty of perjury. Intentionally omitting information, concealing assets, or providing false answers can result in your case being dismissed, denial of your discharge, federal criminal charges, and up to 5 years in federal prison and fines up to $250,000.
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      If you are unsure whether something needs to be disclosed — <strong className="text-white">include it.</strong> Let your attorney decide. It is always better to over-disclose than to leave something out.
                    </p>
                  </div>
                </div>
              </section>

              <section className="px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">What Happens When You're Done</p>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">{stage2.whatHappensNext}</p>
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-white mb-1">Take Your Time — We Are With You Every Step</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    There is no rush. Work at your own pace, save your progress anytime, and ask your attorney questions whenever you need to.{" "}
                    <strong className="text-amber-400">We cannot wait to get you through this.</strong>
                  </p>
                </div>
              </section>
            </div>

            <div className="px-6 py-5 border-t border-slate-800 bg-[#0d1221] flex-shrink-0">
              <label className="flex items-start gap-3 cursor-pointer mb-4 group">
                <div
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    acknowledged ? "bg-amber-400 border-amber-400" : "border-slate-600 group-hover:border-amber-400/60"
                  }`}
                  onClick={() => setAcknowledged(v => !v)}
                >
                  {acknowledged && (
                    <svg className="w-3 h-3 text-slate-950" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5 1 6.5l4 4 6-6.5z" />
                    </svg>
                  )}
                </div>
                <span className="text-slate-300 text-sm leading-relaxed">
                  I have read and understand what is required in Stage 2. I confirm that all information I provide will be true, accurate, and complete, and I understand my ongoing document obligations before and after filing.
                </span>
              </label>

              <button
                onClick={handleLaunchQuestionnaire}
                disabled={!acknowledged}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all text-sm uppercase tracking-wide ${
                  acknowledged
                    ? "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow-lg shadow-amber-400/20"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                }`}
              >
                Open My Questionnaire
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
