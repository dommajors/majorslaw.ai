import { useState, useEffect, useCallback } from "react";
import { DollarSign, Users, TrendingUp, FileText, Plus, Check, X, AlertTriangle, CheckCircle2, Clock, RefreshCw, Scale, CreditCard as Edit2, Unlock, BarChart2, Search, ArrowUpRight, CreditCard, Building, Landmark, ChevronUp, ChevronDown, ChevronRight, Info, Banknote, Receipt, Bell, ArrowLeftRight, Shield, Eye, EyeOff } from "lucide-react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

const ACTIVE_STATES = ["AZ", "WA", "TX"] as const;
type ActiveState = typeof ACTIVE_STATES[number];

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

interface AClient {
  id: string;
  client_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  state: string | null;
  chapter: 7 | 13;
  case_type: "regular" | "bifurcated" | "flat_fee" | "hourly";
  status: "active" | "filed" | "closed" | "on_hold";
  case_number: string | null;
  filed_date: string | null;
  intake_date: string | null;
  notes: string | null;
  created_at: string;
}

interface FeeStructure {
  id: string;
  client_id: string;
  attorney_fee: number;
  court_filing_fee: number;
  total_fee: number;
  payment_frequency: "weekly" | "biweekly" | "semi_monthly" | "monthly" | "paid_in_full";
  bifurcated_signing_threshold: number;
  threshold_bypassed: boolean;
  threshold_bypass_reason: string | null;
  threshold_bypassed_by: string | null;
  ch13_upfront_amount: number | null;
  ch13_plan_remainder: number | null;
  hourly_rate: number | null;
  retainer_amount: number | null;
  iolta_balance: number;
}

interface Payment {
  id: string;
  client_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: string;
  is_iolta: boolean;
  destination_account: "operating" | "iolta" | null;
  account_state: string | null;
  applied_to: string | null;
  notes: string | null;
  recorded_by: string | null;
  voided: boolean;
  processor_confirmation: string | null;
  confirmed_at: string | null;
}

interface ScheduleEntry {
  id: string;
  client_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: "pending" | "paid" | "late" | "waived" | "partial";
  paid_date: string | null;
}

interface TrustAccount {
  id: string;
  state: ActiveState;
  account_type: "operating" | "iolta";
  account_name: string;
  account_number_last4: string | null;
  bank_name: string | null;
  current_balance: number;
  is_active: boolean;
}

interface FundTransfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  reason: string;
  related_client_id: string | null;
  executed_by: string;
  status: "pending" | "executed" | "cancelled";
  notes: string | null;
  created_at: string;
}

interface TransferNotification {
  id: string;
  client_id: string;
  case_number: string;
  filed_date: string;
  amount: number;
  state: ActiveState;
  notify_after: string;
  status: "pending" | "actioned" | "dismissed";
  actioned_by: string | null;
  actioned_at: string | null;
  transfer_id: string | null;
  created_at: string;
}

type TabId = "clients" | "accounts" | "filed" | "reports";
type ClientTab = "overview" | "payments" | "schedule";

interface FiledCaseRegistry {
  id: string;
  client_id: string;
  case_number: string;
  filed_date: string;
  chapter: 7 | 13;
  state: string;
  case_number_verified: boolean;
  case_number_verified_by: string | null;
  case_number_verified_at: string | null;
  verification_notes: string | null;
  iolta_balance_verified: boolean;
  iolta_verified_by: string | null;
  iolta_verified_at: string | null;
  iolta_verified_amount: number | null;
  iolta_signoff_notes: string | null;
  transfer_status: "not_ready" | "pending_signoff" | "signed_off" | "transferred";
  transferred_at: string | null;
  transferred_by: string | null;
  transfer_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface IoltaSignoff {
  id: string;
  registry_id: string;
  client_id: string;
  attorney_name: string;
  action: "verified" | "rejected" | "transfer_approved";
  iolta_amount: number;
  notes: string | null;
  signed_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d)) : "—";

const fmtDateTime = (d: string | null) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(d)) : "—";

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly", biweekly: "Bi-Weekly", semi_monthly: "Semi-Monthly",
  monthly: "Monthly", paid_in_full: "Paid in Full",
};

const CASE_TYPE_LABELS: Record<string, string> = {
  regular: "Ch. 7 — Prepaid", bifurcated: "Ch. 7 — Bifurcated", flat_fee: "Ch. 13 — Flat Fee", hourly: "Ch. 13 — Hourly",
};

const METHOD_ICONS: Record<string, JSX.Element> = {
  credit_card: <CreditCard className="w-3 h-3" />,
  debit_card:  <CreditCard className="w-3 h-3" />,
  check:       <FileText   className="w-3 h-3" />,
  cash:        <Banknote   className="w-3 h-3" />,
  wire:        <ArrowUpRight className="w-3 h-3" />,
  ach:         <Building   className="w-3 h-3" />,
  other:       <Receipt    className="w-3 h-3" />,
};

// Determines correct account destination based on case type + payment type
function resolveDestination(caseType: AClient["case_type"], paymentType: string): "operating" | "iolta" {
  // Court filing fees always go to IOLTA until case is filed
  if (paymentType === "court_filing_fee") return "iolta";
  // Retainers always go to IOLTA
  if (paymentType === "retainer") return "iolta";
  // Hourly case payments go to IOLTA
  if (caseType === "hourly") return "iolta";
  // Ch.13 upfront/plan go to operating (non-retainer)
  // Regular and bifurcated Ch.7 attorney fees go to operating
  return "operating";
}

function chapterBadge(chapter: 7 | 13) {
  return chapter === 7
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-500/10 border-sky-500/25 text-sky-400">Ch. 7</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/25 text-amber-400">Ch. 13</span>;
}

function statusBadge(status: AClient["status"]) {
  const cfgs = {
    active:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    filed:   "text-sky-400 bg-sky-500/10 border-sky-500/25",
    closed:  "text-slate-500 bg-slate-700/30 border-slate-700",
    on_hold: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  };
  const labels = { active: "Active", filed: "Filed", closed: "Closed", on_hold: "On Hold" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfgs[status]}`}>
      {labels[status]}
    </span>
  );
}

function destBadge(dest: "operating" | "iolta" | null) {
  if (!dest) return null;
  return dest === "iolta"
    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/20">IOLTA</span>
    : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Operating</span>;
}

// ─── Admin Auth Context ───────────────────────────────────────────────────────

// In-session admin auth (no backend auth in this demo — role is scoped to session)
function AdminLoginModal({ onLogin, onClose }: { onLogin: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [pin, setPin]   = useState("");
  const [err, setErr]   = useState(false);
  const [show, setShow] = useState(false);

  function attempt() {
    // Demo pin: 9999
    if (pin === "9999" && name.trim()) { onLogin(name.trim()); }
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Accounting Admin Login</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Elevated privileges required for fund transfers</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Admin PIN</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="••••" className={`w-full bg-slate-800 border text-white text-sm rounded-xl px-3 py-2.5 pr-10 placeholder-slate-600 focus:outline-none ${err ? "border-red-500" : "border-slate-700 focus:border-slate-500"}`} />
              <button onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {err && <p className="text-xs text-red-400 mt-1">Invalid PIN. Try again.</p>}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={attempt} disabled={!name.trim() || !pin} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition-all">
            <Shield className="w-4 h-4" /> Authenticate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────

function AddClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", state: "IL",
    chapter: "7" as "7" | "13", case_type: "regular" as AClient["case_type"],
    intake_date: new Date().toISOString().slice(0, 10),
  });
  const [fee, setFee] = useState({
    attorney_fee: "", court_filing_fee: "",
    payment_frequency: "monthly",
    bifurcated_signing_threshold: "400",
    ch13_upfront_amount: "", ch13_plan_remainder: "",
    hourly_rate: "", retainer_amount: "",
  });
  const [saving, setSaving] = useState(false);

  const ch = form.chapter;
  const ct = form.case_type;

  const caseTypeOptions: { value: AClient["case_type"]; label: string }[] =
    ch === "7"
      ? [{ value: "regular", label: "Regular (all fees paid before filing)" }, { value: "bifurcated", label: "Bifurcated (file then pay)" }]
      : [{ value: "flat_fee", label: "Flat Fee" }, { value: "hourly", label: "Hourly / IOLTA" }];

  async function save() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const clientRes = await api.post("accounting_clients", {
      client_id: `client-${Date.now()}`,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      state: form.state,
      chapter: parseInt(form.chapter),
      case_type: form.case_type,
      status: "active",
      intake_date: form.intake_date,
    });
    const client = clientRes?.[0];
    if (client) {
      const courtFee = fee.court_filing_fee ? parseFloat(fee.court_filing_fee) : (ch === "7" ? 338 : 313);
      await api.post("accounting_fee_structures", {
        client_id: client.id,
        attorney_fee: parseFloat(fee.attorney_fee) || 0,
        court_filing_fee: courtFee,
        payment_frequency: fee.payment_frequency,
        bifurcated_signing_threshold: parseFloat(fee.bifurcated_signing_threshold) || 400,
        ch13_upfront_amount: fee.ch13_upfront_amount ? parseFloat(fee.ch13_upfront_amount) : null,
        ch13_plan_remainder: fee.ch13_plan_remainder ? parseFloat(fee.ch13_plan_remainder) : null,
        hourly_rate: fee.hourly_rate ? parseFloat(fee.hourly_rate) : null,
        retainer_amount: fee.retainer_amount ? parseFloat(fee.retainer_amount) : null,
        iolta_balance: ct === "hourly" && fee.retainer_amount ? parseFloat(fee.retainer_amount) : 0,
      });
    }
    setSaving(false);
    onSaved();
  }

  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">Add New Client</h3>
            <p className="text-xs text-slate-500 mt-0.5">Set up client billing and fee structure</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Client Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Full Name *</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full legal name" className={inp} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className={inp} />
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(xxx) xxx-xxxx" className={inp} />
              </div>
              <div>
                <label className={lbl}>State</label>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inp}>
                  {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Intake Date</label>
                <input type="date" value={form.intake_date} onChange={e => setForm(f => ({ ...f, intake_date: e.target.value }))} className={inp} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Case Type</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Chapter</label>
                <select value={form.chapter} onChange={e => {
                  const c = e.target.value as "7" | "13";
                  setForm(f => ({ ...f, chapter: c, case_type: c === "7" ? "regular" : "flat_fee" }));
                  setFee(f => ({ ...f, court_filing_fee: c === "7" ? "338" : "313" }));
                }} className={inp}>
                  <option value="7">Chapter 7</option>
                  <option value="13">Chapter 13</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Case Structure</label>
                <select value={form.case_type} onChange={e => setForm(f => ({ ...f, case_type: e.target.value as AClient["case_type"] }))} className={inp}>
                  {caseTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Fee Structure</p>
            <div className="grid grid-cols-2 gap-3">
              {ct !== "hourly" && (
                <div>
                  <label className={lbl}>Attorney Fee</label>
                  <input value={fee.attorney_fee} onChange={e => setFee(f => ({ ...f, attorney_fee: e.target.value }))} placeholder="e.g. 1500" className={inp} />
                </div>
              )}
              <div>
                <label className={lbl}>Court Filing Fee</label>
                <input value={fee.court_filing_fee} onChange={e => setFee(f => ({ ...f, court_filing_fee: e.target.value }))} placeholder={ch === "7" ? "338" : "313"} className={inp} />
              </div>
              <div>
                <label className={lbl}>Payment Frequency</label>
                <select value={fee.payment_frequency} onChange={e => setFee(f => ({ ...f, payment_frequency: e.target.value }))} className={inp}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="semi_monthly">Semi-Monthly</option>
                  <option value="monthly">Monthly</option>
                  <option value="paid_in_full">Paid in Full</option>
                </select>
              </div>
              {ct === "bifurcated" && (
                <div>
                  <label className={lbl}>Signing Threshold</label>
                  <input value={fee.bifurcated_signing_threshold} onChange={e => setFee(f => ({ ...f, bifurcated_signing_threshold: e.target.value }))} placeholder="400" className={inp} />
                </div>
              )}
              {ct === "flat_fee" && <>
                <div>
                  <label className={lbl}>Upfront Amount</label>
                  <input value={fee.ch13_upfront_amount} onChange={e => setFee(f => ({ ...f, ch13_upfront_amount: e.target.value }))} placeholder="e.g. 2500" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Plan Remainder</label>
                  <input value={fee.ch13_plan_remainder} onChange={e => setFee(f => ({ ...f, ch13_plan_remainder: e.target.value }))} placeholder="e.g. 2500" className={inp} />
                </div>
              </>}
              {ct === "hourly" && <>
                <div>
                  <label className={lbl}>Hourly Rate</label>
                  <input value={fee.hourly_rate} onChange={e => setFee(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="e.g. 350" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Retainer (IOLTA)</label>
                  <input value={fee.retainer_amount} onChange={e => setFee(f => ({ ...f, retainer_amount: e.target.value }))} placeholder="e.g. 2500" className={inp} />
                </div>
              </>}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={saving || !form.full_name.trim()} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition-all">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Client
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ client, onClose, onSaved }: {
  client: AClient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    amount: "", payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "credit_card", payment_type: "attorney_fee",
    notes: "", recorded_by: "",
  });
  const [saving, setSaving] = useState(false);

  const destination = resolveDestination(client.case_type, form.payment_type);
  const isActiveState = (ACTIVE_STATES as readonly string[]).includes(client.state ?? "");
  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";

  async function save() {
    if (!form.amount) return;
    setSaving(true);
    await api.post("accounting_payments", {
      client_id: client.id,
      amount: parseFloat(form.amount),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      payment_type: form.payment_type,
      is_iolta: destination === "iolta",
      destination_account: destination,
      account_state: client.state,
      notes: form.notes || null,
      recorded_by: form.recorded_by || null,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Record Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">{client.full_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Amount *</label>
              <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className={inp} />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Method</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className={inp}>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="wire">Wire</option>
                <option value="ach">ACH</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Payment Type</label>
              <select value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))} className={inp}>
                <option value="attorney_fee">Attorney Fee</option>
                <option value="court_filing_fee">Court Filing Fee</option>
                <option value="retainer">Retainer</option>
                <option value="plan_payment">Plan Payment</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Auto-routing indicator */}
          <div className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border ${destination === "iolta" ? "bg-amber-500/8 border-amber-500/20" : "bg-emerald-500/8 border-emerald-500/20"}`}>
            {destination === "iolta"
              ? <Landmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              : <Building className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${destination === "iolta" ? "text-amber-300" : "text-emerald-300"}`}>
                {destination === "iolta" ? "IOLTA Trust Account" : "Operating Account"}
                {isActiveState && client.state ? ` — ${client.state}` : ""}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {form.payment_type === "court_filing_fee"
                  ? "Filing fees held in IOLTA until case is filed + 48 hrs, then released to operating"
                  : form.payment_type === "retainer" || client.case_type === "hourly"
                    ? "Retainers and hourly funds held in IOLTA trust account"
                    : "Attorney fees deposited to operating account"}
              </p>
            </div>
          </div>

          <div>
            <label className={lbl}>Recorded By</label>
            <input value={form.recorded_by} onChange={e => setForm(f => ({ ...f, recorded_by: e.target.value }))} placeholder="Staff name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional note…" className={inp + " resize-none"} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={saving || !form.amount} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Threshold Modal ──────────────────────────────────────────────────────────

function ThresholdModal({ client, feeStructure, onClose, onSaved }: {
  client: AClient;
  feeStructure: FeeStructure;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode]         = useState<"edit" | "bypass">("edit");
  const [threshold, setThreshold] = useState(String(feeStructure.bifurcated_signing_threshold));
  const [reason, setReason]     = useState("");
  const [bypassedBy, setBypassedBy] = useState("");
  const [saving, setSaving]     = useState(false);
  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";

  async function save() {
    setSaving(true);
    const payload = mode === "bypass"
      ? { threshold_bypassed: true, threshold_bypass_reason: reason || null, threshold_bypassed_by: bypassedBy || null }
      : { bifurcated_signing_threshold: parseFloat(threshold) || 400, threshold_bypassed: false };
    await api.patch("accounting_fee_structures", feeStructure.id, payload);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Signing Threshold</h3>
            <p className="text-xs text-slate-500 mt-0.5">{client.full_name} — Bifurcated Ch. 7</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            <button onClick={() => setMode("edit")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${mode === "edit" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
              <Edit2 className="w-3.5 h-3.5" /> Modify Threshold
            </button>
            <button onClick={() => setMode("bypass")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${mode === "bypass" ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-slate-300"}`}>
              <Unlock className="w-3.5 h-3.5" /> Bypass Threshold
            </button>
          </div>
          {mode === "edit" ? (
            <div>
              <label className={lbl}>Minimum Payment to Schedule Signing</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input value={threshold} onChange={e => setThreshold(e.target.value)} className={inp + " pl-7"} placeholder="400" />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">Default is $400. Client must have this amount paid before scheduling.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/25 rounded-xl px-3 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">Bypassing allows the client to schedule their signing appointment immediately regardless of payment amount.</p>
              </div>
              <div>
                <label className={lbl}>Bypassed By</label>
                <input value={bypassedBy} onChange={e => setBypassedBy(e.target.value)} placeholder="Staff name" className={inp} />
              </div>
              <div>
                <label className={lbl}>Reason</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Reason for bypass…" className={inp + " resize-none"} />
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition-all">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {mode === "bypass" ? "Bypass Threshold" : "Update Threshold"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Notification Card ───────────────────────────────────────────────

function TransferNotificationCard({ notification, client, adminUser, trustAccounts, onActioned, onDismiss }: {
  notification: TransferNotification;
  client: AClient | undefined;
  adminUser: string | null;
  trustAccounts: TrustAccount[];
  onActioned: () => void;
  onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);
  const [showAdminReq, setShowAdminReq] = useState(false);
  const [form, setForm] = useState({ processor_confirmation: "", confirmed_at: "" });
  const isReady = new Date() >= new Date(notification.notify_after);
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";
  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const fromAcct = trustAccounts.find(a => a.state === notification.state && a.account_type === "iolta");
  const toAcct   = trustAccounts.find(a => a.state === notification.state && a.account_type === "operating");

  async function executeTransfer() {
    if (!adminUser) { setShowAdminReq(true); return; }
    if (!fromAcct || !toAcct) return;
    setExecuting(true);
    const transfer = await api.post("accounting_fund_transfers", {
      from_account_id: fromAcct.id,
      to_account_id: toAcct.id,
      amount: notification.amount,
      transfer_date: new Date().toISOString().slice(0, 10),
      reason: `Filing fee release — Case ${notification.case_number} (filed ${notification.filed_date})`,
      related_client_id: notification.client_id,
      executed_by: adminUser,
      status: "executed",
    });
    if (transfer?.[0]) {
      // Update account balances
      await Promise.all([
        api.patch("accounting_trust_accounts", fromAcct.id, { current_balance: Math.max(0, fromAcct.current_balance - notification.amount), updated_at: new Date().toISOString() }),
        api.patch("accounting_trust_accounts", toAcct.id, { current_balance: toAcct.current_balance + notification.amount, updated_at: new Date().toISOString() }),
      ]);
      await api.patch("accounting_transfer_notifications", notification.id, {
        status: "actioned",
        actioned_by: adminUser,
        actioned_at: new Date().toISOString(),
        transfer_id: transfer[0].id,
      });
    }
    setExecuting(false);
    onActioned();
  }

  async function dismiss() {
    if (!adminUser) { setShowAdminReq(true); return; }
    await api.patch("accounting_transfer_notifications", notification.id, {
      status: "dismissed",
      actioned_by: adminUser,
      actioned_at: new Date().toISOString(),
    });
    onDismiss();
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isReady ? "border-amber-500/30 bg-amber-500/5" : "border-slate-700/60 bg-[#0d1221]"}`}>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isReady ? "bg-amber-500/15" : "bg-slate-800"}`}>
            {isReady ? <Bell className="w-4 h-4 text-amber-400" /> : <Clock className="w-4 h-4 text-slate-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-bold ${isReady ? "text-amber-300" : "text-white"}`}>
                {isReady ? "Filing Fee Ready to Transfer" : "Filing Fee Transfer Pending"}
              </p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isReady ? "text-amber-400 bg-amber-500/10 border-amber-500/25" : "text-slate-500 bg-slate-700/30 border-slate-700"}`}>
                {notification.state}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {client && <span className="text-xs text-slate-400">{client.full_name}</span>}
              <span className="text-slate-700 text-[10px]">·</span>
              <span className="text-xs text-slate-500">Case {notification.case_number}</span>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className="text-xs text-slate-500">Filed {fmtDate(notification.filed_date)}</span>
            </div>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Landmark className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] text-amber-300">IOLTA → </span>
                <Building className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-300">Operating</span>
                <span className="text-[11px] font-bold text-white ml-1">{fmt(notification.amount)}</span>
              </div>
              {!isReady && (
                <span className="text-[10px] text-slate-500">Available {fmtDateTime(notification.notify_after)}</span>
              )}
            </div>
          </div>
          {isReady && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={dismiss}
                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={executeTransfer}
                disabled={executing}
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
              >
                {executing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowLeftRight className="w-3 h-3" />}
                {adminUser ? "Execute Transfer" : "Transfer (Admin)"}
              </button>
            </div>
          )}
        </div>
        {!adminUser && isReady && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Processor Confirmation #</label>
                <input value={form.processor_confirmation} onChange={e => setForm(f => ({ ...f, processor_confirmation: e.target.value }))} placeholder="e.g. TXN-123456" className={inp} />
              </div>
              <div>
                <label className={lbl}>Confirmation Date/Time</label>
                <input type="datetime-local" value={form.confirmed_at} onChange={e => setForm(f => ({ ...f, confirmed_at: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2">
              <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-slate-400">Accounting admin authentication required to execute transfers.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Accounts View ────────────────────────────────────────────────────────────

function AccountsView({ trustAccounts, transfers, notifications, clients, adminUser, onRequestAdmin, onRefresh }: {
  trustAccounts: TrustAccount[];
  transfers: FundTransfer[];
  notifications: TransferNotification[];
  clients: AClient[];
  adminUser: string | null;
  onRequestAdmin: () => void;
  onRefresh: () => void;
}) {
  const pendingNotifs = notifications.filter(n => n.status === "pending");

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto overflow-y-auto h-full">

      {/* Admin badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Trust & Operating Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">AZ · WA · TX — Per-state operating and IOLTA trust accounts</p>
        </div>
        {adminUser
          ? <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 rounded-xl px-3 py-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Admin: {adminUser}</span>
            </div>
          : <button onClick={onRequestAdmin} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-xl transition-all">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Authenticate as Admin
            </button>}
      </div>

      {/* Transfer Notifications */}
      {pendingNotifs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Filing Fee Transfer Alerts</p>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/25 px-1.5 py-0.5 rounded-full">{pendingNotifs.length}</span>
          </div>
          <div className="space-y-3">
            {pendingNotifs.map(n => (
              <TransferNotificationCard
                key={n.id}
                notification={n}
                client={clients.find(c => c.id === n.client_id)}
                adminUser={adminUser}
                trustAccounts={trustAccounts}
                onActioned={onRefresh}
                onDismiss={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Per-state account pairs */}
      {ACTIVE_STATES.map(state => {
        const operating = trustAccounts.find(a => a.state === state && a.account_type === "operating");
        const iolta     = trustAccounts.find(a => a.state === state && a.account_type === "iolta");
        const stateTransfers = transfers.filter(t =>
          (operating && (t.from_account_id === operating.id || t.to_account_id === operating.id)) ||
          (iolta && (t.from_account_id === iolta.id || t.to_account_id === iolta.id))
        ).slice(0, 5);

        return (
          <div key={state} className="rounded-2xl border border-slate-700/60 bg-[#0d1221] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-400">{state}</span>
              </div>
              <p className="text-sm font-bold text-white">{state} Accounts</p>
            </div>
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/40">
              {/* Operating */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Operating Account</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(operating?.current_balance ?? 0)}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{operating?.account_name ?? "—"}</p>
                {operating?.bank_name && <p className="text-[10px] text-slate-600">{operating.bank_name}</p>}
                <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                  Attorney fees for Ch.7 cases. Filing fees transferred here 48hrs after filing.
                </p>
              </div>
              {/* IOLTA */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">IOLTA Trust Account</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(iolta?.current_balance ?? 0)}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{iolta?.account_name ?? "—"}</p>
                {iolta?.bank_name && <p className="text-[10px] text-slate-600">{iolta.bank_name}</p>}
                <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                  Court filing fees (pre-filing), retainers, hourly Ch.13 client funds.
                </p>
              </div>
            </div>

            {/* Recent transfers for this state */}
            {stateTransfers.length > 0 && (
              <div className="border-t border-slate-800/40 px-5 py-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recent Transfers</p>
                <div className="space-y-1.5">
                  {stateTransfers.map(t => {
                    const fromOp = operating && t.from_account_id === operating.id;
                    return (
                      <div key={t.id} className="flex items-center gap-2 text-[11px]">
                        <ArrowLeftRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        <span className={fromOp ? "text-red-400" : "text-emerald-400"}>{fromOp ? "−" : "+"}{fmt(t.amount)}</span>
                        <span className="text-slate-600 truncate flex-1">{t.reason}</span>
                        <span className="text-slate-700 flex-shrink-0">{fmtDate(t.transfer_date)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Filing fee rules summary */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1221] px-5 py-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Account Routing Rules</p>
        <div className="space-y-2">
          {[
            { label: "Ch. 7 Regular — Attorney Fee",    dest: "Operating", color: "text-emerald-400", note: "Deposited immediately upon receipt" },
            { label: "Ch. 7 Regular — Court Filing Fee", dest: "IOLTA",    color: "text-amber-400",   note: "Held until case filed + 48 hrs, then admin transfers to operating" },
            { label: "Ch. 7 Bifurcated — Attorney Fee", dest: "Operating", color: "text-emerald-400", note: "Deposited to operating as received" },
            { label: "Ch. 7 Bifurcated — Filing Fee",   dest: "IOLTA",    color: "text-amber-400",   note: "Held in IOLTA — same 48hr release rule applies" },
            { label: "Ch. 13 Flat Fee — Upfront",       dest: "Operating", color: "text-emerald-400", note: "Attorney fee portion to operating" },
            { label: "Ch. 13 Flat Fee — Filing Fee",    dest: "IOLTA",    color: "text-amber-400",   note: "Held in IOLTA until filed + 48 hrs" },
            { label: "Ch. 13 Hourly — Retainer",        dest: "IOLTA",    color: "text-amber-400",   note: "Held in IOLTA trust, earned fees transferred as billed" },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-3 py-1.5 border-b border-slate-800/40 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
              <span className="text-xs text-slate-300 flex-1">{r.label}</span>
              <span className={`text-xs font-bold flex-shrink-0 ${r.color}`}>{r.dest}</span>
              <span className="text-[10px] text-slate-600 hidden sm:block w-64 text-right">{r.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Client Detail Panel ──────────────────────────────────────────────────────

function ClientDetail({ client, payments, feeStructure, schedule, onRefresh }: {
  client: AClient;
  payments: Payment[];
  feeStructure: FeeStructure | null;
  schedule: ScheduleEntry[];
  onRefresh: () => void;
}) {
  const [tab, setTab]               = useState<ClientTab>("overview");
  const [showPayModal, setShowPayModal]   = useState(false);
  const [showThreshModal, setShowThreshModal] = useState(false);

  const clientPayments = payments.filter(p => p.client_id === client.id && !p.voided);
  const totalPaid    = clientPayments.reduce((s, p) => s + p.amount, 0);
  const ioltaHeld    = clientPayments.filter(p => p.destination_account === "iolta").reduce((s, p) => s + p.amount, 0);
  const operatingHeld = clientPayments.filter(p => p.destination_account === "operating").reduce((s, p) => s + p.amount, 0);
  const ioltaBalance = feeStructure?.iolta_balance ?? 0;
  const totalFee     = feeStructure?.total_fee ?? 0;
  const balance      = totalFee - totalPaid;
  const threshold    = feeStructure?.bifurcated_signing_threshold ?? 400;
  const thresholdMet = feeStructure?.threshold_bypassed || totalPaid >= threshold;
  const pct          = totalFee > 0 ? Math.min(100, (totalPaid / totalFee) * 100) : 0;
  const isActiveState = (ACTIVE_STATES as readonly string[]).includes(client.state ?? "");

  const TABS: { id: ClientTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: `Payments (${clientPayments.length})` },
    { id: "schedule", label: `Schedule (${schedule.length})` },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-white">{client.full_name}</h2>
              {statusBadge(client.status)}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${client.chapter === 7 ? "text-sky-400 bg-sky-500/10 border-sky-500/25" : "text-amber-400 bg-amber-500/10 border-amber-500/25"}`}>{CASE_TYPE_LABELS[client.case_type]}</span>
              {client.state && <><span className="text-slate-700">·</span><span className="text-xs text-slate-500">{client.state}{isActiveState ? " ✓" : ""}</span></>}
              {client.case_number && <><span className="text-slate-700">·</span><span className="text-xs text-slate-400 font-mono">{client.case_number}</span></>}
              {client.intake_date && <><span className="text-slate-700">·</span><span className="text-xs text-slate-500">Intake: {fmtDate(client.intake_date)}</span></>}
            </div>
          </div>
          <button onClick={() => setShowPayModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex-shrink-0">
            <Plus className="w-3.5 h-3.5" /> Record Payment
          </button>
        </div>

        {totalFee > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-500">Total Collected</span>
              <span className="text-[11px] text-slate-400">{fmt(totalPaid)} / {fmt(totalFee)}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Account routing breakdown */}
        {(operatingHeld > 0 || ioltaHeld > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2.5">
              <Building className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500">Operating{isActiveState && client.state ? ` (${client.state})` : ""}</p>
                <p className="text-sm font-bold text-emerald-400">{fmt(operatingHeld)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2.5">
              <Landmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500">IOLTA{isActiveState && client.state ? ` (${client.state})` : ""}</p>
                <p className="text-sm font-bold text-amber-400">{fmt(ioltaHeld)}</p>
              </div>
            </div>
          </div>
        )}

        {client.case_type === "bifurcated" && (
          <div className={`mt-3 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 border ${thresholdMet ? "bg-emerald-500/8 border-emerald-500/20" : "bg-amber-500/8 border-amber-500/20"}`}>
            <div className="flex items-center gap-2">
              {thresholdMet ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
              <div>
                <p className={`text-xs font-bold ${thresholdMet ? "text-emerald-300" : "text-amber-300"}`}>
                  {feeStructure?.threshold_bypassed ? "Threshold Bypassed" : thresholdMet ? "Signing Threshold Met" : `Signing Threshold: ${fmt(threshold)} required`}
                </p>
                {!feeStructure?.threshold_bypassed && (
                  <p className="text-[10px] text-slate-500 mt-0.5">{fmt(totalPaid)} paid · {fmt(Math.max(0, threshold - totalPaid))} remaining</p>
                )}
                {feeStructure?.threshold_bypass_reason && <p className="text-[10px] text-slate-500 mt-0.5 italic">{feeStructure.threshold_bypass_reason}</p>}
              </div>
            </div>
            <button onClick={() => setShowThreshModal(true)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0">
              <Edit2 className="w-3 h-3" /> Modify
            </button>
          </div>
        )}

        {client.case_type === "hourly" && (
          <div className="mt-3 flex items-center gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
            <Landmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">IOLTA Trust Balance: {fmt(ioltaBalance)}</p>
              {feeStructure?.hourly_rate && <p className="text-[10px] text-slate-500 mt-0.5">Rate: {fmt(feeStructure.hourly_rate)}/hr</p>}
            </div>
          </div>
        )}

        {client.case_type === "flat_fee" && feeStructure?.ch13_upfront_amount && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Upfront Required</p>
              <p className="text-sm font-bold text-white mt-0.5">{fmt(feeStructure.ch13_upfront_amount)}</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Through Plan</p>
              <p className="text-sm font-bold text-white mt-0.5">{fmt(feeStructure.ch13_plan_remainder ?? 0)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-slate-800/60 px-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`py-3 px-1 mr-5 text-xs font-semibold border-b-2 transition-all -mb-px ${tab === t.id ? "border-amber-400 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-4 space-y-4">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Attorney Fee",       val: fmt(feeStructure?.attorney_fee ?? 0) },
                { label: "Court Filing Fee",   val: fmt(feeStructure?.court_filing_fee ?? 0) },
                { label: "Total Fee",          val: fmt(totalFee), highlight: true },
                { label: "Total Paid",         val: fmt(totalPaid), color: "text-emerald-400" },
                { label: "Balance Due",        val: fmt(Math.max(0, balance)), color: balance > 0 ? "text-red-400" : "text-emerald-400" },
                { label: "Payment Frequency",  val: FREQ_LABELS[feeStructure?.payment_frequency ?? ""] ?? "—" },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/40 border border-slate-700/60 rounded-xl px-3.5 py-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${item.color ?? "text-white"}`}>{item.val}</p>
                </div>
              ))}
            </div>
            {client.notes && (
              <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/60 rounded-xl px-3.5 py-3">
                <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">{client.notes}</p>
              </div>
            )}
          </>
        )}

        {tab === "payments" && (
          <div className="space-y-2">
            {clientPayments.length === 0 ? (
              <p className="text-xs text-slate-600 py-4 text-center">No payments recorded yet.</p>
            ) : clientPayments.slice().reverse().map(p => (
              <div key={p.id} className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border ${p.destination_account === "iolta" ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/15"}`}>
                <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-slate-400">
                  {METHOD_ICONS[p.payment_method] ?? <DollarSign className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{fmt(p.amount)}</span>
                    <span className="text-[10px] font-semibold text-slate-400 capitalize">{p.payment_type.replace(/_/g, " ")}</span>
                    {destBadge(p.destination_account)}
                    {p.account_state && (ACTIVE_STATES as readonly string[]).includes(p.account_state) && (
                      <span className="text-[10px] text-slate-600">{p.account_state}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-slate-600">{fmtDate(p.payment_date)}</span>
                    <span className="text-[10px] text-slate-700">·</span>
                    <span className="text-[10px] text-slate-600 capitalize">{p.payment_method.replace("_", " ")}</span>
                    {p.notes && <><span className="text-[10px] text-slate-700">·</span><span className="text-[10px] text-slate-500 italic truncate max-w-[180px]">{p.notes}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "schedule" && (
          <div className="space-y-2">
            {schedule.length === 0 ? (
              <p className="text-xs text-slate-600 py-4 text-center">No payment schedule set up.</p>
            ) : schedule.map(s => (
              <div key={s.id} className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border ${
                s.status === "paid" ? "bg-emerald-500/5 border-emerald-500/20" :
                s.status === "late" ? "bg-red-500/5 border-red-500/20" :
                s.status === "partial" ? "bg-amber-500/5 border-amber-500/20" :
                "bg-slate-800/40 border-slate-700/60"
              }`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400">#{s.installment_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{fmt(s.amount_due)}</span>
                    {s.amount_paid > 0 && s.amount_paid < s.amount_due && <span className="text-[10px] text-amber-400">{fmt(s.amount_paid)} paid</span>}
                  </div>
                  <span className="text-[10px] text-slate-600">Due {fmtDate(s.due_date)}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                  s.status === "paid"    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" :
                  s.status === "late"    ? "text-red-400 bg-red-500/10 border-red-500/25" :
                  s.status === "partial" ? "text-amber-400 bg-amber-500/10 border-amber-500/25" :
                  s.status === "waived"  ? "text-slate-500 bg-slate-700/30 border-slate-700" :
                                           "text-slate-400 bg-slate-700/30 border-slate-700"
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPayModal && (
        <RecordPaymentModal client={client} onClose={() => setShowPayModal(false)} onSaved={() => { setShowPayModal(false); onRefresh(); }} />
      )}
      {showThreshModal && feeStructure && (
        <ThresholdModal client={client} feeStructure={feeStructure} onClose={() => setShowThreshModal(false)} onSaved={() => { setShowThreshModal(false); onRefresh(); }} />
      )}
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────

type ReportSection = "overview" | "collection" | "filing" | "nonpaying";

function ReportsView({ clients, payments, feeStructures }: {
  clients: AClient[];
  payments: Payment[];
  feeStructures: FeeStructure[];
}) {
  const [section, setSection] = useState<ReportSection>("overview");

  // ── Filters ──
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [fState,   setFState]   = useState("all");
  const [fChapter, setFChapter] = useState<"all" | "7" | "13">("all");

  const allStates = Array.from(new Set(clients.map(c => c.state).filter(Boolean) as string[])).sort();

  // Apply client-level filters
  const filteredClients = clients.filter(c => {
    if (fState   !== "all" && c.state !== fState) return false;
    if (fChapter !== "all" && String(c.chapter) !== fChapter) return false;
    // date filter on intake_date
    if (dateFrom && (c.intake_date ?? "") < dateFrom) return false;
    if (dateTo   && (c.intake_date ?? "") > dateTo)   return false;
    return true;
  });

  const clientIds = new Set(filteredClients.map(c => c.id));

  // Payments scoped to filtered clients + optional date range on payment_date
  const filteredPayments = payments.filter(p => {
    if (!clientIds.has(p.client_id)) return false;
    if (dateFrom && p.payment_date < dateFrom) return false;
    if (dateTo   && p.payment_date > dateTo)   return false;
    return true;
  });

  const activePayments  = filteredPayments.filter(p => !p.voided);
  const voidedPayments  = filteredPayments.filter(p => p.voided);
  const refundPayments  = filteredPayments.filter(p => p.payment_type === "refund");
  const cancelPayments  = filteredPayments.filter(p => p.payment_type === "cancellation" || p.payment_type === "cancel");

  // ── Overview metrics ──
  const totalRevenue   = activePayments.reduce((s, p) => s + p.amount, 0);
  const totalVoided    = voidedPayments.reduce((s, p) => s + p.amount, 0);
  const totalRefunds   = refundPayments.reduce((s, p) => s + p.amount, 0);
  const ioltaTotal     = feeStructures
    .filter(f => clientIds.has(f.client_id))
    .reduce((s, f) => s + (f.iolta_balance ?? 0), 0);

  const collectionRates = filteredClients.map(c => {
    const fs   = feeStructures.find(f => f.client_id === c.id);
    const paid = activePayments.filter(p => p.client_id === c.id).reduce((s, p) => s + p.amount, 0);
    const total = fs?.total_fee ?? 0;
    return { client: c, paid, total, rate: total > 0 ? paid / total : 0 };
  });

  const avgCollectionRate = collectionRates.length > 0
    ? collectionRates.reduce((s, r) => s + r.rate, 0) / collectionRates.length * 100
    : 0;

  const avgPayment = activePayments.length > 0
    ? totalRevenue / activePayments.length
    : 0;

  // ── Filing metrics ──
  const retainedClients = filteredClients; // everyone in the system has been retained
  const filedClients    = filteredClients.filter(c => c.status === "filed" || c.status === "closed");
  const filedRate       = retainedClients.length > 0 ? filedClients.length / retainedClients.length * 100 : 0;
  const closedClients   = filteredClients.filter(c => c.status === "closed");
  const onHoldClients   = filteredClients.filter(c => c.status === "on_hold");

  // ── Non-paying clients: retained but $0 paid ──
  const nonPayingClients = filteredClients.filter(c => {
    const paid = activePayments.filter(p => p.client_id === c.id).reduce((s, p) => s + p.amount, 0);
    return paid === 0;
  });

  // ── By-state breakdown ──
  const byState = filteredClients.reduce((acc, c) => {
    const key = c.state ?? "Unknown";
    if (!acc[key]) acc[key] = { count: 0, revenue: 0, filed: 0, iolta: 0, operating: 0 };
    acc[key].count++;
    if (c.status === "filed" || c.status === "closed") acc[key].filed++;
    const cp = activePayments.filter(p => p.client_id === c.id);
    acc[key].revenue   += cp.reduce((s, p) => s + p.amount, 0);
    acc[key].iolta     += cp.filter(p => p.destination_account === "iolta").reduce((s, p) => s + p.amount, 0);
    acc[key].operating += cp.filter(p => p.destination_account === "operating").reduce((s, p) => s + p.amount, 0);
    return acc;
  }, {} as Record<string, { count: number; revenue: number; filed: number; iolta: number; operating: number }>);

  // ── Monthly bar chart ──
  const monthlyRevenue = activePayments.reduce((acc, p) => {
    const key = p.payment_date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);
  const monthKeys = Object.keys(monthlyRevenue).sort().slice(-6);

  // ── Stat card helper ──
  const sc = (label: string, value: string, sub?: string, color?: string) => (
    <div className="bg-[#0d1221] border border-slate-800 rounded-2xl px-5 py-4">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );

  const filterBar = (
    <div className="flex flex-wrap gap-2 items-center bg-[#0d1221] border border-slate-800 rounded-2xl px-4 py-3 mb-5">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filters</span>
      </div>
      <div className="flex flex-wrap gap-2 flex-1">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-slate-500 whitespace-nowrap">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-500 w-32" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-slate-500 whitespace-nowrap">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-500 w-32" />
        </div>
        <select value={fState} onChange={e => setFState(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="all">All States</option>
          {allStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fChapter} onChange={e => setFChapter(e.target.value as typeof fChapter)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="all">All Chapters</option>
          <option value="7">Chapter 7</option>
          <option value="13">Chapter 13</option>
        </select>
        {(dateFrom || dateTo || fState !== "all" || fChapter !== "all") && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); setFState("all"); setFChapter("all"); }}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5 transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      <span className="text-[10px] text-slate-600 flex-shrink-0">{filteredClients.length} clients</span>
    </div>
  );

  const SECTIONS: { id: ReportSection; label: string }[] = [
    { id: "overview",   label: "Overview" },
    { id: "collection", label: "Collection Rates" },
    { id: "filing",     label: "Retain → File" },
    { id: "nonpaying",  label: `Non-Paying (${nonPayingClients.length})` },
  ];

  return (
    <div className="px-6 py-6 overflow-y-auto h-full space-y-0">

      {/* Section tabs */}
      <div className="flex gap-1 mb-5 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${section === s.id ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-300"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      {filterBar}

      {/* ── Overview ── */}
      {section === "overview" && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Key Metrics</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sc("Total Clients", String(filteredClients.length),
                `${filteredClients.filter(c => c.status === "active").length} active · ${filedClients.length} filed`)}
              {sc("Total Collected", fmt(totalRevenue), `${activePayments.length} payments`, "text-emerald-400")}
              {sc("Avg. Payment", fmt(avgPayment), "Per transaction", "text-sky-400")}
              {sc("Avg. Collection Rate", `${avgCollectionRate.toFixed(0)}%`, "Fee collected vs. total",
                avgCollectionRate >= 75 ? "text-emerald-400" : "text-amber-400")}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Cancellations & Refunds</p>
            <div className="grid grid-cols-3 gap-3">
              {sc("Voided Payments", String(voidedPayments.length), fmt(totalVoided), "text-red-400")}
              {sc("Refunds", String(refundPayments.length), fmt(totalRefunds), "text-orange-400")}
              {sc("IOLTA Held", fmt(ioltaTotal), "Trust accounts", "text-amber-400")}
            </div>
          </div>

          {monthKeys.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Monthly Collections</p>
              <div className="bg-[#0d1221] border border-slate-800 rounded-2xl px-5 py-4">
                <div className="flex items-end gap-3 h-28">
                  {(() => {
                    const maxVal = Math.max(...monthKeys.map(k => monthlyRevenue[k]));
                    return monthKeys.map(k => (
                      <div key={k} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">{fmt(monthlyRevenue[k])}</span>
                        <div className="w-full bg-amber-400 rounded-t transition-all" style={{ height: `${maxVal > 0 ? (monthlyRevenue[k] / maxVal) * 80 : 0}px` }} />
                        <span className="text-[10px] text-slate-600">
                          {new Date(k + "-01").toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {Object.keys(byState).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">By State</p>
              <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">State</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clients</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filed</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Operating</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">IOLTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byState).sort((a, b) => b[1].count - a[1].count).map(([state, d]) => (
                      <tr key={state} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{state}</span>
                            {(ACTIVE_STATES as readonly string[]).includes(state) && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Active</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">{d.count}</td>
                        <td className="px-4 py-3 text-sm text-sky-400 text-right">{d.filed}</td>
                        <td className="px-4 py-3 text-sm text-white font-semibold text-right">{fmt(d.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400 font-semibold text-right hidden sm:table-cell">{fmt(d.operating)}</td>
                        <td className="px-4 py-3 text-sm text-amber-400 font-semibold text-right hidden sm:table-cell">{fmt(d.iolta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Collection Rates ── */}
      {section === "collection" && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sc("Avg. Collection Rate", `${avgCollectionRate.toFixed(0)}%`, "Across filtered clients",
                avgCollectionRate >= 75 ? "text-emerald-400" : "text-amber-400")}
              {sc("Fully Paid", String(collectionRates.filter(r => r.rate >= 1).length),
                "At or above 100%", "text-emerald-400")}
              {sc("Partial (>50%)", String(collectionRates.filter(r => r.rate >= 0.5 && r.rate < 1).length),
                "50–99% collected", "text-amber-400")}
              {sc("Under 50%", String(collectionRates.filter(r => r.rate < 0.5).length),
                "Below 50%", "text-red-400")}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Per-Client Collection Rate</p>
            <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
              {collectionRates.length === 0
                ? <p className="text-xs text-slate-600 text-center py-8">No clients match filters.</p>
                : (
                <div className="divide-y divide-slate-800/40">
                  {collectionRates.sort((a, b) => a.rate - b.rate).map(({ client, paid, total, rate }) => (
                    <div key={client.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate">{client.full_name}</span>
                          {chapterBadge(client.chapter)}
                          {client.state && <span className="text-[10px] text-slate-600">{client.state}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-slate-800 rounded-full h-1">
                            <div className={`h-1 rounded-full transition-all ${rate >= 1 ? "bg-emerald-500" : rate >= 0.5 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(100, rate * 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 flex-shrink-0 w-28 text-right">{fmt(paid)} / {fmt(total)}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 w-12 text-right ${rate >= 1 ? "text-emerald-400" : rate >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                        {(rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Retain → File ── */}
      {section === "filing" && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Retention to Filing</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sc("Retained", String(retainedClients.length), "Total clients", "text-white")}
              {sc("Filed", String(filedClients.length), `${filedRate.toFixed(0)}% of retained`, "text-sky-400")}
              {sc("Closed", String(closedClients.length), "Completed cases", "text-slate-400")}
              {sc("On Hold", String(onHoldClients.length), "Paused cases", "text-amber-400")}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Retain → File Funnel</p>
            <div className="bg-[#0d1221] border border-slate-800 rounded-2xl px-5 py-5 space-y-4">
              {([
                { label: "Retained (All Clients)", count: retainedClients.length, color: "bg-slate-600", pct: 100 },
                { label: "Active", count: filteredClients.filter(c => c.status === "active").length, color: "bg-amber-500", pct: retainedClients.length > 0 ? filteredClients.filter(c => c.status === "active").length / retainedClients.length * 100 : 0 },
                { label: "Filed / Case Active", count: filedClients.length, color: "bg-sky-500", pct: filedRate },
                { label: "Closed / Discharged", count: closedClients.length, color: "bg-emerald-500", pct: retainedClients.length > 0 ? closedClients.length / retainedClients.length * 100 : 0 },
              ] as const).map(({ label, count, color, pct }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-300">{label}</span>
                    <span className="text-xs font-bold text-white">{count} <span className="text-slate-500 font-normal">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Avg. Payment by Status</p>
            <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clients</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Paid</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg. Paid</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(["active", "filed", "closed", "on_hold"] as const).map(st => {
                    const sts = filteredClients.filter(c => c.status === st);
                    if (sts.length === 0) return null;
                    const stPaid  = sts.map(c => activePayments.filter(p => p.client_id === c.id).reduce((s, p) => s + p.amount, 0));
                    const total   = stPaid.reduce((s, v) => s + v, 0);
                    const avg     = total / sts.length;
                    const avgRate = sts.map(c => {
                      const fs   = feeStructures.find(f => f.client_id === c.id);
                      const paid = activePayments.filter(p => p.client_id === c.id).reduce((s, p) => s + p.amount, 0);
                      return fs?.total_fee ? paid / fs.total_fee : 0;
                    }).reduce((s, v) => s + v, 0) / sts.length * 100;
                    const labels = { active: "Active", filed: "Filed", closed: "Closed", on_hold: "On Hold" };
                    const colors = { active: "text-emerald-400", filed: "text-sky-400", closed: "text-slate-400", on_hold: "text-amber-400" };
                    return (
                      <tr key={st} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${colors[st]}`}>{labels[st]}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">{sts.length}</td>
                        <td className="px-4 py-3 text-sm text-white font-semibold text-right">{fmt(total)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">{fmt(avg)}</td>
                        <td className={`px-4 py-3 text-sm font-semibold text-right ${avgRate >= 75 ? "text-emerald-400" : avgRate >= 40 ? "text-amber-400" : "text-red-400"}`}>
                          {avgRate.toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Non-Paying Clients ── */}
      {section === "nonpaying" && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Retained with No Payments</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sc("Non-Paying Clients", String(nonPayingClients.length),
                `${filteredClients.length > 0 ? (nonPayingClients.length / filteredClients.length * 100).toFixed(0) : 0}% of filtered`, "text-red-400")}
              {sc("Outstanding Owed", fmt(nonPayingClients.reduce((s, c) => {
                const fs = feeStructures.find(f => f.client_id === c.id);
                return s + (fs?.total_fee ?? 0);
              }, 0)), "Total fees not yet paid", "text-orange-400")}
              {sc("Paying Clients", String(filteredClients.length - nonPayingClients.length),
                "Have made at least 1 payment", "text-emerald-400")}
            </div>
          </div>

          {nonPayingClients.length === 0 ? (
            <div className="bg-[#0d1221] border border-slate-800 rounded-2xl px-5 py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">All clients have made at least one payment</p>
              <p className="text-xs text-slate-500 mt-1">No non-paying clients found for the current filters.</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Client List</p>
              <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">State</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Status</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fee Owed</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Intake</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonPayingClients.sort((a, b) => (a.intake_date ?? "").localeCompare(b.intake_date ?? "")).map(c => {
                      const fs = feeStructures.find(f => f.client_id === c.id);
                      return (
                        <tr key={c.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-white">{c.full_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {chapterBadge(c.chapter)}
                                  <span className="text-[10px] text-slate-600">{CASE_TYPE_LABELS[c.case_type]}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400 hidden sm:table-cell">{c.state ?? "—"}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">{statusBadge(c.status)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-red-400 text-right">{fmt(fs?.total_fee ?? 0)}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(c.intake_date)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filed Cases View ─────────────────────────────────────────────────────────

function FiledCasesView({ clients, payments, feeStructures, filedRegistry, ioltaSignoffs, adminUser, onRequestAdmin, onRefresh }: {
  clients: AClient[];
  payments: Payment[];
  feeStructures: FeeStructure[];
  filedRegistry: FiledCaseRegistry[];
  ioltaSignoffs: IoltaSignoff[];
  adminUser: string | null;
  onRequestAdmin: () => void;
  onRefresh: () => void;
}) {
  const [filterState, setFilterState]     = useState("all");
  const [filterStatus, setFilterStatus]   = useState<"all" | FiledCaseRegistry["transfer_status"]>("all");
  const [filterChapter, setFilterChapter] = useState<"all" | "7" | "13">("all");
  const [search, setSearch]               = useState("");

  const [verifyModal, setVerifyModal]     = useState<FiledCaseRegistry | null>(null);
  const [signoffModal, setSignoffModal]   = useState<FiledCaseRegistry | null>(null);
  const [transferModal, setTransferModal] = useState<FiledCaseRegistry | null>(null);
  const [addModal, setAddModal]           = useState(false);

  const allStates = Array.from(new Set(filedRegistry.map(r => r.state).filter(Boolean))).sort();

  const filtered = filedRegistry.filter(r => {
    const client = clients.find(c => c.id === r.client_id);
    if (filterState   !== "all" && r.state !== filterState) return false;
    if (filterStatus  !== "all" && r.transfer_status !== filterStatus) return false;
    if (filterChapter !== "all" && String(r.chapter) !== filterChapter) return false;
    if (search && !client?.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !r.case_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.filed_date).getTime() - new Date(a.filed_date).getTime());

  const pendingSignoff  = filedRegistry.filter(r => r.transfer_status === "pending_signoff").length;
  const signedOff       = filedRegistry.filter(r => r.transfer_status === "signed_off").length;
  const transferred     = filedRegistry.filter(r => r.transfer_status === "transferred").length;

  const statusConfig: Record<FiledCaseRegistry["transfer_status"], { label: string; color: string; bg: string }> = {
    not_ready:       { label: "Not Ready",      color: "text-slate-500", bg: "bg-slate-700/30 border-slate-700" },
    pending_signoff: { label: "Pending Signoff", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25" },
    signed_off:      { label: "Signed Off",      color: "text-sky-400",   bg: "bg-sky-500/10 border-sky-500/25" },
    transferred:     { label: "Transferred",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
  };

  return (
    <div className="px-6 py-6 overflow-y-auto h-full space-y-5">

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Filed", value: filedRegistry.length, color: "text-white" },
          { label: "Pending Signoff", value: pendingSignoff, color: "text-amber-400" },
          { label: "Signed Off", value: signedOff, color: "text-sky-400" },
          { label: "Transferred", value: transferred, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1221] border border-slate-800 rounded-2xl px-4 py-3.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + action bar */}
      <div className="flex flex-wrap gap-2 items-center bg-[#0d1221] border border-slate-800 rounded-2xl px-4 py-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or case #…"
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
        </div>
        <select value={filterState} onChange={e => setFilterState(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none">
          <option value="all">All States</option>
          {allStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterChapter} onChange={e => setFilterChapter(e.target.value as typeof filterChapter)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none">
          <option value="all">All Chapters</option>
          <option value="7">Chapter 7</option>
          <option value="13">Chapter 13</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none">
          <option value="all">All Statuses</option>
          <option value="not_ready">Not Ready</option>
          <option value="pending_signoff">Pending Signoff</option>
          <option value="signed_off">Signed Off</option>
          <option value="transferred">Transferred</option>
        </select>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl transition-all flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Filed Case
        </button>
      </div>

      {/* Case list */}
      <div className="bg-[#0d1221] border border-slate-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No filed cases found</p>
            <p className="text-xs text-slate-700 mt-1">Adjust filters or add a filed case above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filtered.map(r => {
              const client   = clients.find(c => c.id === r.client_id);
              const fs       = feeStructures.find(f => f.client_id === r.client_id);
              const paid     = payments.filter(p => p.client_id === r.client_id && !p.voided).reduce((s, p) => s + p.amount, 0);
              const ioltaPaid = payments.filter(p => p.client_id === r.client_id && !p.voided && p.destination_account === "iolta").reduce((s, p) => s + p.amount, 0);
              const sc  = statusConfig[r.transfer_status];
              const history = ioltaSignoffs.filter(s => s.registry_id === r.id);
              const lastSignoff = history.length > 0 ? history.sort((a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime())[0] : null;

              return (
                <div key={r.id} className="px-4 py-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-white">{client?.full_name ?? "Unknown Client"}</span>
                        {client && chapterBadge(client.chapter)}
                        {client?.state && <span className="text-[10px] text-slate-600 font-medium">{client.state}</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {/* Case number */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-600">Case #</span>
                          <span className={`text-xs font-mono font-semibold ${r.case_number ? "text-white" : "text-red-400"}`}>
                            {r.case_number || "Not entered"}
                          </span>
                          {r.case_number_verified
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400" title="Verified" />
                            : r.case_number
                              ? <AlertTriangle className="w-3 h-3 text-amber-400" title="Unverified" />
                              : null}
                        </div>
                        <span className="text-slate-700">·</span>
                        <span className="text-[10px] text-slate-500">Filed {fmtDate(r.filed_date)}</span>
                        {r.iolta_balance_verified && (
                          <>
                            <span className="text-slate-700">·</span>
                            <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> IOLTA verified {fmt(r.iolta_verified_amount ?? 0)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* IOLTA / payment summary */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-600">
                          Paid: <span className="text-slate-300">{fmt(paid)}</span>
                        </span>
                        {ioltaPaid > 0 && (
                          <span className="text-[10px] text-amber-400">
                            IOLTA: {fmt(ioltaPaid)}
                          </span>
                        )}
                        {fs && <span className="text-[10px] text-slate-600">
                          Total fee: <span className="text-slate-400">{fmt(fs.total_fee)}</span>
                        </span>}
                      </div>

                      {lastSignoff && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Shield className="w-2.5 h-2.5 text-slate-600" />
                          <span className="text-[10px] text-slate-600">
                            Last signoff: <span className="text-slate-400">{lastSignoff.attorney_name}</span>
                            {" · "}<span className={lastSignoff.action === "rejected" ? "text-red-400" : "text-emerald-400"}>
                              {lastSignoff.action === "verified" ? "Verified" : lastSignoff.action === "transfer_approved" ? "Approved Transfer" : "Rejected"}
                            </span>
                            {" · "}{fmtDate(lastSignoff.signed_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      {!r.case_number_verified && r.case_number && (
                        <button onClick={() => setVerifyModal(r)}
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                          Verify #
                        </button>
                      )}
                      {r.case_number_verified && !r.iolta_balance_verified && ioltaPaid > 0 && (
                        <button onClick={() => { if (!adminUser) { onRequestAdmin(); return; } setSignoffModal(r); }}
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-400 hover:bg-sky-500/20 transition-colors whitespace-nowrap">
                          <Shield className="w-3 h-3 inline mr-1" />IOLTA Sign-Off
                        </button>
                      )}
                      {r.transfer_status === "signed_off" && (
                        <button onClick={() => { if (!adminUser) { onRequestAdmin(); return; } setTransferModal(r); }}
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                          <ArrowLeftRight className="w-3 h-3 inline mr-1" />Execute Transfer
                        </button>
                      )}
                      {r.transfer_status === "transferred" && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Transferred {fmtDate(r.transferred_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Verify Case # Modal ── */}
      {verifyModal && (
        <VerifyCaseModal
          registry={verifyModal}
          client={clients.find(c => c.id === verifyModal.client_id)}
          onClose={() => setVerifyModal(null)}
          onSaved={() => { setVerifyModal(null); onRefresh(); }}
        />
      )}

      {/* ── Attorney IOLTA Sign-Off Modal ── */}
      {signoffModal && adminUser && (
        <IoltaSignoffModal
          registry={signoffModal}
          client={clients.find(c => c.id === signoffModal.client_id)}
          payments={payments.filter(p => p.client_id === signoffModal.client_id && !p.voided)}
          feeStructure={feeStructures.find(f => f.client_id === signoffModal.client_id) ?? null}
          adminUser={adminUser}
          onClose={() => setSignoffModal(null)}
          onSaved={() => { setSignoffModal(null); onRefresh(); }}
        />
      )}

      {/* ── Execute Transfer Modal ── */}
      {transferModal && adminUser && (
        <ExecuteTransferModal
          registry={transferModal}
          client={clients.find(c => c.id === transferModal.client_id)}
          adminUser={adminUser}
          onClose={() => setTransferModal(null)}
          onSaved={() => { setTransferModal(null); onRefresh(); }}
        />
      )}

      {/* ── Add Filed Case Modal ── */}
      {addModal && (
        <AddFiledCaseModal
          clients={clients}
          existingRegistry={filedRegistry}
          onClose={() => setAddModal(false)}
          onSaved={() => { setAddModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Verify Case Number Modal ─────────────────────────────────────────────────

function VerifyCaseModal({ registry, client, onClose, onSaved }: {
  registry: FiledCaseRegistry;
  client: AClient | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [caseNumber, setCaseNumber]   = useState(registry.case_number);
  const [verifiedBy, setVerifiedBy]   = useState("");
  const [notes, setNotes]             = useState(registry.verification_notes ?? "");
  const [saving, setSaving]           = useState(false);
  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";

  async function save() {
    if (!caseNumber.trim() || !verifiedBy.trim()) return;
    setSaving(true);
    await api.patch("accounting_filed_case_registry", registry.id, {
      case_number: caseNumber.trim(),
      case_number_verified: true,
      case_number_verified_by: verifiedBy.trim(),
      case_number_verified_at: new Date().toISOString(),
      verification_notes: notes || null,
      transfer_status: registry.transfer_status === "not_ready" ? "pending_signoff" : registry.transfer_status,
      updated_at: new Date().toISOString(),
    });
    // Also update the accounting_clients case_number
    await api.patch("accounting_clients", registry.client_id, {
      case_number: caseNumber.trim(),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Verify Case Number</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{client?.full_name ?? "Client"}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={lbl}>Court Case Number *</label>
            <input value={caseNumber} onChange={e => setCaseNumber(e.target.value)}
              placeholder="e.g. 2:26-bk-04812" className={inp} />
          </div>
          <div>
            <label className={lbl}>Verified By *</label>
            <input value={verifiedBy} onChange={e => setVerifiedBy(e.target.value)}
              placeholder="Staff name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Verification Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Confirmed via PACER / court portal…" rows={2}
              className={`${inp} resize-none`} />
          </div>
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
            <p className="text-[11px] text-amber-300 font-semibold">After verification</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Case will move to "Pending Signoff" — attorney IOLTA review required before transfer.</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={!caseNumber.trim() || !verifiedBy.trim() || saving}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition-all">
            <CheckCircle2 className="w-4 h-4" />{saving ? "Saving…" : "Confirm Verification"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── IOLTA Sign-Off Modal ─────────────────────────────────────────────────────

function IoltaSignoffModal({ registry, client, payments, feeStructure, adminUser, onClose, onSaved }: {
  registry: FiledCaseRegistry;
  client: AClient | undefined;
  payments: Payment[];
  feeStructure: FeeStructure | null;
  adminUser: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ioltaPayments  = payments.filter(p => p.destination_account === "iolta");
  const ioltaTotal     = ioltaPayments.reduce((s, p) => s + p.amount, 0);
  const [action, setAction]   = useState<"verified" | "rejected">("verified");
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";

  async function save() {
    setSaving(true);
    // Insert signoff audit record
    await api.post("accounting_iolta_signoffs", {
      registry_id: registry.id,
      client_id: registry.client_id,
      attorney_name: adminUser,
      action,
      iolta_amount: ioltaTotal,
      notes: notes || null,
      signed_at: new Date().toISOString(),
    });
    // Update registry
    await api.patch("accounting_filed_case_registry", registry.id, {
      iolta_balance_verified: action === "verified",
      iolta_verified_by: adminUser,
      iolta_verified_at: new Date().toISOString(),
      iolta_verified_amount: ioltaTotal,
      iolta_signoff_notes: notes || null,
      transfer_status: action === "verified" ? "signed_off" : "pending_signoff",
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-400/15 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Attorney IOLTA Sign-Off</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{client?.full_name ?? "Client"} — Case #{registry.case_number}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* IOLTA balance breakdown */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-amber-300 mb-2">IOLTA Trust Account Funds</p>
            {ioltaPayments.length === 0 ? (
              <p className="text-xs text-slate-500">No IOLTA payments found for this client.</p>
            ) : (
              <>
                {ioltaPayments.map(p => (
                  <div key={p.id} className="flex justify-between text-[11px]">
                    <span className="text-slate-400 capitalize">{p.payment_type.replace(/_/g, " ")} — {fmtDate(p.payment_date)}</span>
                    <span className="text-amber-300 font-semibold">{fmt(p.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-amber-500/20 pt-2 flex justify-between text-xs font-bold">
                  <span className="text-amber-300">Total IOLTA</span>
                  <span className="text-amber-300">{fmt(ioltaTotal)}</span>
                </div>
              </>
            )}
          </div>

          {feeStructure && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/40 rounded-xl p-2.5">
                <p className="text-[10px] text-slate-500 mb-0.5">Total Fee</p>
                <p className="text-sm font-bold text-white">{fmt(feeStructure.total_fee)}</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-2.5">
                <p className="text-[10px] text-slate-500 mb-0.5">IOLTA Held</p>
                <p className="text-sm font-bold text-amber-400">{fmt(ioltaTotal)}</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-2.5">
                <p className="text-[10px] text-slate-500 mb-0.5">Chapter</p>
                <p className="text-sm font-bold text-white">Ch. {client?.chapter}</p>
              </div>
            </div>
          )}

          <div>
            <label className={lbl}>Attorney Decision *</label>
            <div className="flex gap-2">
              {(["verified", "rejected"] as const).map(opt => (
                <button key={opt} onClick={() => setAction(opt)}
                  className={`flex-1 text-xs font-bold py-2.5 rounded-xl border transition-all ${
                    action === opt
                      ? opt === "verified" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-red-500/15 border-red-500/40 text-red-400"
                      : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                  }`}>
                  {opt === "verified" ? "Verify & Approve" : "Reject / Flag Issue"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Signoff Notes {action === "rejected" ? "*" : "(optional)"}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={action === "verified" ? "IOLTA balance confirmed correct, ready for transfer…" : "Describe the discrepancy or issue found…"}
              rows={3} className={`${inp} resize-none`} />
          </div>

          <div className={`rounded-xl px-3.5 py-2.5 border ${action === "verified" ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20"}`}>
            <p className={`text-[11px] font-semibold ${action === "verified" ? "text-emerald-300" : "text-red-300"}`}>
              {action === "verified" ? "Signing off as: " : "Flagging issue — signed by: "}<span className="font-bold">{adminUser}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {action === "verified"
                ? "This action confirms IOLTA funds are correct and authorizes transfer execution."
                : "Case will remain in Pending Signoff until issues are resolved."}
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={saving || (action === "rejected" && !notes.trim())}
            className={`flex items-center gap-2 disabled:opacity-40 font-bold px-5 py-2 rounded-xl text-sm transition-all ${
              action === "verified" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-red-500 hover:bg-red-400 text-white"
            }`}>
            <Shield className="w-4 h-4" />{saving ? "Saving…" : action === "verified" ? "Sign Off & Approve" : "Submit Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Execute Transfer Modal ───────────────────────────────────────────────────

function ExecuteTransferModal({ registry, client, adminUser, onClose, onSaved }: {
  registry: FiledCaseRegistry;
  client: AClient | undefined;
  adminUser: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [transferNotes, setTransferNotes] = useState("");
  const [saving, setSaving]               = useState(false);
  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";

  async function execute() {
    setSaving(true);
    await api.patch("accounting_filed_case_registry", registry.id, {
      transfer_status: "transferred",
      transferred_at: new Date().toISOString(),
      transferred_by: adminUser,
      transfer_notes: transferNotes || null,
      updated_at: new Date().toISOString(),
    });
    // Add final signoff audit entry
    await api.post("accounting_iolta_signoffs", {
      registry_id: registry.id,
      client_id: registry.client_id,
      attorney_name: adminUser,
      action: "transfer_approved",
      iolta_amount: registry.iolta_verified_amount ?? 0,
      notes: transferNotes || "Transfer executed",
      signed_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-400/15 flex items-center justify-center flex-shrink-0">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Execute IOLTA Transfer</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{client?.full_name} — Case #{registry.case_number}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Attorney Sign-Off By</span>
              <span className="text-emerald-300 font-semibold">{registry.iolta_verified_by}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Verified IOLTA Amount</span>
              <span className="text-emerald-300 font-semibold">{fmt(registry.iolta_verified_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Verified At</span>
              <span className="text-slate-300">{fmtDateTime(registry.iolta_verified_at)}</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Transfer Notes (optional)</label>
            <textarea value={transferNotes} onChange={e => setTransferNotes(e.target.value)}
              placeholder="Reference #, bank confirmation, etc…" rows={2}
              className={`${inp} resize-none`} />
          </div>
          <div className="bg-slate-800/40 rounded-xl px-3.5 py-2.5">
            <p className="text-[11px] text-slate-400">Executing as: <span className="text-white font-bold">{adminUser}</span></p>
            <p className="text-[10px] text-slate-600 mt-0.5">This action marks the IOLTA funds as transferred and closes this case in the registry.</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={execute} disabled={saving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all">
            <ArrowLeftRight className="w-4 h-4" />{saving ? "Processing…" : "Confirm Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Filed Case Modal ─────────────────────────────────────────────────────

function AddFiledCaseModal({ clients, existingRegistry, onClose, onSaved }: {
  clients: AClient[];
  existingRegistry: FiledCaseRegistry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const existingIds = new Set(existingRegistry.map(r => r.client_id));
  const eligible    = clients.filter(c =>
    (c.status === "filed" || c.status === "closed") && !existingIds.has(c.id)
  );
  const [clientId, setClientId]       = useState(eligible[0]?.id ?? "");
  const [caseNumber, setCaseNumber]   = useState("");
  const [filedDate, setFiledDate]     = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving]           = useState(false);
  const inp = "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500";
  const lbl = "text-xs font-semibold text-slate-400 mb-1.5 block";

  const selectedClient = clients.find(c => c.id === clientId);

  async function save() {
    if (!clientId || !caseNumber.trim()) return;
    setSaving(true);
    await api.post("accounting_filed_case_registry", {
      client_id: clientId,
      case_number: caseNumber.trim(),
      filed_date: filedDate,
      chapter: selectedClient?.chapter ?? 7,
      state: selectedClient?.state ?? "AZ",
      transfer_status: caseNumber.trim() ? "pending_signoff" : "not_ready",
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Add Filed Case</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Register a new filed case in the transfer registry</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {eligible.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">All filed clients are already in the registry.</p>
          ) : (
            <>
              <div>
                <label className={lbl}>Client *</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className={inp}>
                  {eligible.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} — Ch. {c.chapter} ({c.state})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Court Case Number *</label>
                <input value={caseNumber} onChange={e => setCaseNumber(e.target.value)}
                  placeholder="e.g. 2:26-bk-04812" className={inp} />
              </div>
              <div>
                <label className={lbl}>Filed Date *</label>
                <input type="date" value={filedDate} onChange={e => setFiledDate(e.target.value)} className={inp} />
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          {eligible.length > 0 && (
            <button onClick={save} disabled={!clientId || !caseNumber.trim() || saving}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition-all">
              <Plus className="w-4 h-4" />{saving ? "Adding…" : "Add to Registry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AccountingPortal() {
  const [tab, setTab]                   = useState<TabId>("clients");
  const [clients, setClients]           = useState<AClient[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [scheduleEntries, setSchedule]  = useState<ScheduleEntry[]>([]);
  const [trustAccounts, setTrustAccounts] = useState<TrustAccount[]>([]);
  const [transfers, setTransfers]       = useState<FundTransfer[]>([]);
  const [notifications, setNotifications] = useState<TransferNotification[]>([]);
  const [filedRegistry, setFiledRegistry] = useState<FiledCaseRegistry[]>([]);
  const [ioltaSignoffs, setIoltaSignoffs] = useState<IoltaSignoff[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedClient, setSelectedClient] = useState<AClient | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [search, setSearch]             = useState("");
  const [filterChapter, setFilterChapter] = useState<"all" | "7" | "13">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | AClient["status"]>("all");
  const [sortField, setSortField]       = useState<"name" | "intake" | "balance">("intake");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc");
  const [adminUser, setAdminUser]       = useState<string | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, f, p, s, ta, tr, nt, fr, so] = await Promise.all([
      api.get("accounting_clients?order=created_at.desc"),
      api.get("accounting_fee_structures"),
      api.get("accounting_payments?order=payment_date.desc"),
      api.get("accounting_payment_schedule?order=due_date.asc"),
      api.get("accounting_trust_accounts?order=state.asc,account_type.asc"),
      api.get("accounting_fund_transfers?order=created_at.desc"),
      api.get("accounting_transfer_notifications?order=created_at.desc"),
      api.get("accounting_filed_case_registry?order=filed_date.desc"),
      api.get("accounting_iolta_signoffs?order=signed_at.desc"),
    ]);
    setClients(c ?? []);
    setFeeStructures(f ?? []);
    setPayments(p ?? []);
    setSchedule(s ?? []);
    setTrustAccounts(ta ?? []);
    setTransfers(tr ?? []);
    setNotifications(nt ?? []);
    setFiledRegistry(fr ?? []);
    setIoltaSignoffs(so ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient(updated);
    }
  }, [clients]);

  const pendingNotifCount = notifications.filter(n => n.status === "pending" && new Date() >= new Date(n.notify_after)).length;

  const filteredClients = clients
    .filter(c => {
      if (search && !c.full_name.toLowerCase().includes(search.toLowerCase()) && !c.client_id.includes(search)) return false;
      if (filterChapter !== "all" && String(c.chapter) !== filterChapter) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name")   return dir * a.full_name.localeCompare(b.full_name);
      if (sortField === "intake") return dir * (a.intake_date ?? "").localeCompare(b.intake_date ?? "");
      if (sortField === "balance") {
        const bal = (c: AClient) => {
          const fs   = feeStructures.find(f => f.client_id === c.id);
          const paid = payments.filter(p => p.client_id === c.id && !p.voided).reduce((s, p) => s + p.amount, 0);
          return (fs?.total_fee ?? 0) - paid;
        };
        return dir * (bal(a) - bal(b));
      }
      return 0;
    });

  const totalCollected = payments.filter(p => !p.voided).reduce((s, p) => s + p.amount, 0);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-slate-700" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />;
  }

  const pendingSignoffCount = filedRegistry.filter(r =>
    r.transfer_status === "pending_signoff" && r.case_number_verified && !r.iolta_balance_verified
  ).length;

  const TABS: { id: TabId; label: string; icon: JSX.Element; badge?: number }[] = [
    { id: "clients",  label: "Clients",  icon: <Users className="w-3.5 h-3.5" /> },
    { id: "accounts", label: "Accounts", icon: <Landmark className="w-3.5 h-3.5" />, badge: pendingNotifCount || undefined },
    { id: "filed",    label: "Filed Cases", icon: <FileText className="w-3.5 h-3.5" />, badge: pendingSignoffCount || undefined },
    { id: "reports",  label: "Reports",  icon: <BarChart2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>

      <header className="bg-[#0d1221]/95 border-b border-slate-800/60 sticky top-0 z-30 backdrop-blur flex-shrink-0">
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
              <span className="hidden sm:inline text-slate-500 text-xs font-medium uppercase tracking-wide">Accounting Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {adminUser
              ? <div className="hidden sm:flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/25 rounded-lg px-2.5 py-1">
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-300">{adminUser}</span>
                  <button onClick={() => setAdminUser(null)} className="ml-1 text-slate-600 hover:text-slate-400"><X className="w-2.5 h-2.5" /></button>
                </div>
              : <button onClick={() => setShowAdminLogin(true)} className="hidden sm:flex items-center gap-1.5 text-slate-500 hover:text-amber-400 text-[11px] font-semibold transition-colors">
                  <Shield className="w-3.5 h-3.5" /> Admin Login
                </button>}
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              {fmt(totalCollected)}
            </span>
            <button onClick={() => setShowAddClient(true)} className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all">
              <Plus className="w-3.5 h-3.5" /> Add Client
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 flex border-t border-slate-800/60">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 py-3 px-1 mr-6 text-xs font-semibold border-b-2 transition-all -mb-px ${tab === t.id ? "border-amber-400 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              {t.icon}{t.label}
              {t.badge ? (
                <span className="absolute -top-0.5 -right-2 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-amber-400 text-slate-950 rounded-full">{t.badge}</span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      ) : tab === "reports" ? (
        <div className="flex-1 overflow-hidden">
          <ReportsView clients={clients} payments={payments} feeStructures={feeStructures} />
        </div>
      ) : tab === "filed" ? (
        <div className="flex-1 overflow-hidden">
          <FiledCasesView
            clients={clients}
            payments={payments}
            feeStructures={feeStructures}
            filedRegistry={filedRegistry}
            ioltaSignoffs={ioltaSignoffs}
            adminUser={adminUser}
            onRequestAdmin={() => setShowAdminLogin(true)}
            onRefresh={load}
          />
        </div>
      ) : tab === "accounts" ? (
        <div className="flex-1 overflow-hidden">
          <AccountsView
            trustAccounts={trustAccounts}
            transfers={transfers}
            notifications={notifications}
            clients={clients}
            adminUser={adminUser}
            onRequestAdmin={() => setShowAdminLogin(true)}
            onRefresh={load}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Client list sidebar */}
          <div className={`${selectedClient ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-80 lg:w-96 border-r border-slate-800/60 flex-shrink-0`}>
            <div className="px-4 py-3 border-b border-slate-800/60 space-y-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
              </div>
              <div className="flex gap-2">
                <select value={filterChapter} onChange={e => setFilterChapter(e.target.value as typeof filterChapter)} className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2 py-1.5 focus:outline-none">
                  <option value="all">All Chapters</option>
                  <option value="7">Chapter 7</option>
                  <option value="13">Chapter 13</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2 py-1.5 focus:outline-none">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="filed">Filed</option>
                  <option value="closed">Closed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div className="flex gap-1">
                {(["name", "intake", "balance"] as const).map(f => (
                  <button key={f} onClick={() => toggleSort(f)} className={`flex items-center gap-1 flex-1 justify-center text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all ${sortField === f ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-800/60 border-slate-800 text-slate-500 hover:text-slate-300"}`}>
                    <SortIcon field={f} />
                    {f === "name" ? "Name" : f === "intake" ? "Intake" : "Balance"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {filteredClients.length === 0 && <div className="px-4 py-8 text-center text-xs text-slate-600">No clients found.</div>}
              {filteredClients.map(c => {
                const fs       = feeStructures.find(f => f.client_id === c.id);
                const paid     = payments.filter(p => p.client_id === c.id && !p.voided).reduce((s, p) => s + p.amount, 0);
                const total    = fs?.total_fee ?? 0;
                const balance  = total - paid;
                const pct      = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                const isSelected = selectedClient?.id === c.id;
                const threshold  = fs?.bifurcated_signing_threshold ?? 400;
                const threshMet  = fs?.threshold_bypassed || paid >= threshold;
                const isActiveState = (ACTIVE_STATES as readonly string[]).includes(c.state ?? "");

                return (
                  <button key={c.id} onClick={() => setSelectedClient(c)} className={`w-full text-left px-4 py-3.5 hover:bg-slate-800/30 transition-colors ${isSelected ? "bg-slate-800/50 border-l-2 border-amber-400" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{c.full_name}</span>
                          {chapterBadge(c.chapter)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {statusBadge(c.status)}
                          <span className="text-[10px] text-slate-600">{CASE_TYPE_LABELS[c.case_type]}</span>
                          {c.state && <span className="text-[10px] text-slate-600">· {c.state}{isActiveState ? " ✓" : ""}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-white">{fmt(paid)}</p>
                        <p className="text-[10px] text-slate-600">{balance > 0 ? `${fmt(balance)} due` : "Paid"}</p>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="mt-2 w-full bg-slate-700/50 rounded-full h-1">
                        <div className="h-1 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    {c.case_type === "bifurcated" && (
                      <div className="mt-1.5 flex items-center gap-1">
                        {threshMet ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <Clock className="w-2.5 h-2.5 text-amber-400" />}
                        <span className={`text-[10px] ${threshMet ? "text-emerald-500" : "text-amber-500"}`}>
                          {threshMet ? "Threshold met" : `${fmt(Math.max(0, threshold - paid))} to threshold`}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-slate-800/60 flex-shrink-0">
              <p className="text-[10px] text-slate-600">{filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Detail panel */}
          {selectedClient ? (
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <div className="sm:hidden flex items-center px-4 py-2.5 border-b border-slate-800/60 flex-shrink-0">
                <button onClick={() => setSelectedClient(null)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to clients
                </button>
              </div>
              <ClientDetail
                client={selectedClient}
                payments={payments}
                feeStructure={feeStructures.find(f => f.client_id === selectedClient.id) ?? null}
                schedule={scheduleEntries.filter(s => s.client_id === selectedClient.id)}
                onRefresh={load}
              />
            </div>
          ) : (
            <div className="hidden sm:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-500">Select a client</p>
                <p className="text-xs text-slate-700 mt-1">Choose a client from the list to view their account</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddClient && (
        <AddClientModal onClose={() => setShowAddClient(false)} onSaved={() => { setShowAddClient(false); load(); }} />
      )}
      {showAdminLogin && (
        <AdminLoginModal
          onLogin={name => { setAdminUser(name); setShowAdminLogin(false); }}
          onClose={() => setShowAdminLogin(false)}
        />
      )}
    </div>
  );
}
