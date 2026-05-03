import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, MapPin, Calendar, CheckCircle2, AlertTriangle, Coffee, Briefcase, Scale, FileText, Users, Bell, Filter, RefreshCw, ChevronDown, Info, Lock, Send, Thermometer, Building2, CreditCard as Edit2, Trash2, Check, XCircle } from "lucide-react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

type CalendarType = "intake" | "doc_review" | "signing" | "court_hearing" | "court_deadline";
type EventStatus  = "scheduled" | "confirmed" | "completed" | "cancelled" | "rescheduled" | "no_show";
type StaffRole    = "admin" | "attorney" | "paralegal" | "intake_staff" | "accounting";
type PtoStatus    = "pending" | "approved" | "denied";
type ViewMode     = "month" | "week" | "day";
type ActiveCal    = "all" | CalendarType;

interface StaffMember {
  id: string; name: string; email: string; role: StaffRole; color: string;
  is_active: boolean; max_intake_per_hour: number; max_doc_review_per_hour: number;
}

interface PtoRequest {
  id: string; staff_id: string; start_date: string; end_date: string;
  reason: string; status: PtoStatus; approved_by?: string; denial_reason?: string;
  created_at: string;
}

interface SickReport {
  id: string; staff_id: string; report_date: string; coverage_status: string;
  affected_appt_count: number; rescheduled_count: number; notes?: string;
}

interface CalEvent {
  id: string; calendar_type: CalendarType; title: string; description?: string;
  start_time: string; end_time: string; all_day: boolean;
  staff_id?: string; client_id?: string; client_name?: string;
  client_phone?: string; client_email?: string; case_number?: string;
  court_location?: string; judge_name?: string; trustee_name?: string;
  status: EventStatus; created_at: string;
}

// ─── Calendar type config ──────────────────────────────────────────────────────

const CAL_CONFIG: Record<CalendarType, { label: string; color: string; bg: string; border: string; text: string; icon: React.ReactNode; maxPerHour?: number }> = {
  intake:         { label: "Intake",           color: "#3b82f6", bg: "bg-blue-500",    border: "border-blue-500/40",   text: "text-blue-400",   icon: <Users className="w-3.5 h-3.5" />,    maxPerHour: 5 },
  doc_review:     { label: "Doc Review",        color: "#8b5cf6", bg: "bg-violet-500",  border: "border-violet-500/40", text: "text-violet-400", icon: <FileText className="w-3.5 h-3.5" />, maxPerHour: 4 },
  signing:        { label: "Signing",           color: "#f59e0b", bg: "bg-amber-500",   border: "border-amber-500/40",  text: "text-amber-400",  icon: <Edit2 className="w-3.5 h-3.5" /> },
  court_hearing:  { label: "Court Hearing",     color: "#ef4444", bg: "bg-red-500",     border: "border-red-500/40",    text: "text-red-400",    icon: <Scale className="w-3.5 h-3.5" /> },
  court_deadline: { label: "Court Deadline",    color: "#f97316", bg: "bg-orange-500",  border: "border-orange-500/40", text: "text-orange-400", icon: <Bell className="w-3.5 h-3.5" /> },
};

const STATUS_CONFIG: Record<EventStatus, { label: string; cls: string }> = {
  scheduled:   { label: "Scheduled",   cls: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  confirmed:   { label: "Confirmed",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  completed:   { label: "Completed",   cls: "text-slate-400 bg-slate-800 border-slate-700" },
  cancelled:   { label: "Cancelled",   cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  rescheduled: { label: "Rescheduled", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  no_show:     { label: "No Show",     cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}
function fmtTime(ts: string) {
  return fmt(new Date(ts), { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDate(ts: string) {
  return fmt(new Date(ts), { month: "short", day: "numeric", year: "numeric" });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d: Date) {
  const c = new Date(d); c.setDate(c.getDate() - c.getDay()); c.setHours(0,0,0,0); return c;
}
function addDays(d: Date, n: number) {
  const c = new Date(d); c.setDate(c.getDate() + n); return c;
}
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ─── Pill for event on calendar grid ─────────────────────────────────────────

function EventPill({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  const cfg = CAL_CONFIG[event.calendar_type];
  const isDead = event.calendar_type === "court_deadline";
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left px-2 py-1 rounded text-[10px] font-semibold leading-tight truncate transition-all hover:brightness-110 active:scale-95 ${
        isDead
          ? "bg-orange-500/15 border border-orange-500/30 text-orange-300"
          : `border ${cfg.border} text-white`
      }`}
      style={isDead ? {} : { backgroundColor: cfg.color + "28", borderColor: cfg.color + "55", color: cfg.color }}
    >
      {!event.all_day && !isDead && (
        <span className="opacity-75 mr-1">{fmtTime(event.start_time)}</span>
      )}
      {event.title}
    </button>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventModal({ event, staff, onClose, onUpdate }: {
  event: CalEvent; staff: StaffMember[]; onClose: () => void;
  onUpdate: (id: string, updates: Partial<CalEvent>) => void;
}) {
  const cfg  = CAL_CONFIG[event.calendar_type];
  const sCfg = STATUS_CONFIG[event.status];
  const assignedStaff = staff.find(s => s.id === event.staff_id);
  const [editing, setEditing] = useState(false);
  const [status, setStatus]   = useState(event.status);

  async function saveStatus() {
    await api.patch("calendar_events", event.id, { status, updated_at: new Date().toISOString() });
    onUpdate(event.id, { status });
    setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800" style={{ background: cfg.color + "14" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: cfg.color + "22" }}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sCfg.cls}`}>{sCfg.label}</span>
                </div>
                <h3 className="text-base font-bold text-white leading-snug">{event.title}</h3>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors flex-shrink-0 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Time */}
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="text-slate-300">
              {event.all_day
                ? fmtDate(event.start_time)
                : `${fmtDate(event.start_time)} · ${fmtTime(event.start_time)} – ${fmtTime(event.end_time)}`
              }
            </span>
          </div>

          {/* Client */}
          {event.client_name && (
            <div className="flex items-center gap-2.5 text-sm">
              <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div>
                <span className="text-slate-300 font-medium">{event.client_name}</span>
                {event.case_number && <span className="text-slate-600 ml-2">Case #{event.case_number}</span>}
              </div>
            </div>
          )}

          {/* Staff */}
          {assignedStaff && (
            <div className="flex items-center gap-2.5 text-sm">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: assignedStaff.color }} />
              <span className="text-slate-300">{assignedStaff.name}</span>
              <span className="text-slate-600 text-xs capitalize">{assignedStaff.role.replace("_", " ")}</span>
            </div>
          )}

          {/* Court details */}
          {event.court_location && (
            <div className="flex items-start gap-2.5 text-sm">
              <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-slate-300">{event.court_location}</p>
                {event.trustee_name && <p className="text-slate-500 text-xs">Trustee: {event.trustee_name}</p>}
                {event.judge_name    && <p className="text-slate-500 text-xs">Judge: {event.judge_name}</p>}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-2.5 text-sm">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-slate-400 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Court deadline callout */}
          {event.calendar_type === "court_deadline" && (
            <div className="flex items-start gap-2.5 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-2.5">
              <Bell className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-300 font-semibold">This is a court deadline — missing this date may result in case dismissal.</p>
            </div>
          )}

          {/* Status editor */}
          <div className="pt-1 border-t border-slate-800">
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as EventStatus)}
                  className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5"
                >
                  {(Object.keys(STATUS_CONFIG) as EventStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
                <button onClick={saveStatus} className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1.5">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors">
                <Edit2 className="w-3 h-3" /> Update status
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Event Modal ──────────────────────────────────────────────────────────

function NewEventModal({ defaultDate, staff, onClose, onSave }: {
  defaultDate: Date; staff: StaffMember[]; onClose: () => void;
  onSave: (event: CalEvent) => void;
}) {
  const [form, setForm] = useState({
    calendar_type: "intake" as CalendarType,
    title: "",
    client_name: "",
    client_phone: "",
    client_email: "",
    case_number: "",
    court_location: "",
    trustee_name: "",
    staff_id: "",
    date: toLocalDateStr(defaultDate),
    start_hour: "09",
    start_min: "00",
    duration: "60",
    all_day: false,
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const up = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    try {
      const startDt = new Date(`${form.date}T${form.start_hour}:${form.start_min}:00`);
      const endDt   = new Date(startDt.getTime() + parseInt(form.duration) * 60000);
      const payload = {
        calendar_type:  form.calendar_type,
        title:          form.title,
        client_name:    form.client_name || null,
        client_phone:   form.client_phone || null,
        client_email:   form.client_email || null,
        case_number:    form.case_number || null,
        court_location: form.court_location || null,
        trustee_name:   form.trustee_name || null,
        staff_id:       form.staff_id || null,
        start_time:     startDt.toISOString(),
        end_time:       endDt.toISOString(),
        all_day:        form.calendar_type === "court_deadline",
        description:    form.description || null,
        status:         "scheduled",
      };
      const result = await api.post("calendar_events", payload);
      if (result?.[0]) { onSave(result[0]); onClose(); }
    } catch { setError("Failed to save. Please try again."); }
    setSaving(false);
  }

  const cfg = CAL_CONFIG[form.calendar_type];
  const showCourt = form.calendar_type === "court_hearing" || form.calendar_type === "court_deadline";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">New Calendar Event</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Calendar type */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Calendar</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(Object.keys(CAL_CONFIG) as CalendarType[]).map(t => (
                <button
                  key={t}
                  onClick={() => up("calendar_type", t)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                    form.calendar_type === t
                      ? `border-[${CAL_CONFIG[t].color}] text-white`
                      : "border-slate-700 text-slate-500 hover:border-slate-600"
                  }`}
                  style={form.calendar_type === t ? { borderColor: CAL_CONFIG[t].color, backgroundColor: CAL_CONFIG[t].color + "18", color: CAL_CONFIG[t].color } : {}}
                >
                  {CAL_CONFIG[t].icon}
                  <span className="text-center leading-tight">{CAL_CONFIG[t].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Title *</label>
            <input value={form.title} onChange={e => up("title", e.target.value)} placeholder="Event title" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Date</label>
              <input type="date" value={form.date} onChange={e => up("date", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-500" />
            </div>
            {form.calendar_type !== "court_deadline" && <>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Start</label>
                <div className="flex gap-1">
                  <select value={form.start_hour} onChange={e => up("start_hour", e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2 py-2.5">
                    {Array.from({length:12},(_,i)=>String(i+8).padStart(2,"0")).map(h=><option key={h}>{h}</option>)}
                  </select>
                  <select value={form.start_min} onChange={e => up("start_min", e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2 py-2.5">
                    {["00","15","30","45"].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Duration</label>
                <select value={form.duration} onChange={e => up("duration", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2 py-2.5">
                  {[["30","30 min"],["60","1 hr"],["90","1.5 hr"],["120","2 hr"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </>}
          </div>

          {/* Client */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Client Name</label>
              <input value={form.client_name} onChange={e => up("client_name", e.target.value)} placeholder="Full name" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Phone</label>
              <input value={form.client_phone} onChange={e => up("client_phone", e.target.value)} placeholder="(555) 000-0000" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email</label>
              <input value={form.client_email} onChange={e => up("client_email", e.target.value)} placeholder="email@example.com" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
            </div>
          </div>

          {/* Case number */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Case Number</label>
            <input value={form.case_number} onChange={e => up("case_number", e.target.value)} placeholder="e.g. 24-12345 or Pending" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
          </div>

          {/* Court fields */}
          {showCourt && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Court Location</label>
                <input value={form.court_location} onChange={e => up("court_location", e.target.value)} placeholder="US Bankruptcy Court, N.D. Texas" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Trustee Name</label>
                <input value={form.trustee_name} onChange={e => up("trustee_name", e.target.value)} placeholder="Trustee name" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
              </div>
            </div>
          )}

          {/* Staff assignment */}
          {(form.calendar_type === "intake" || form.calendar_type === "doc_review" || form.calendar_type === "signing") && (
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Assign Staff</label>
              <select value={form.staff_id} onChange={e => up("staff_id", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5">
                <option value="">Unassigned</option>
                {staff.filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role.replace("_"," ")})</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Notes</label>
            <textarea value={form.description} onChange={e => up("description", e.target.value)} rows={2} placeholder="Optional notes…" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none" />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PTO Request Modal ────────────────────────────────────────────────────────

function PtoModal({ staff, currentStaffId, onClose, onSaved }: {
  staff: StaffMember[]; currentStaffId: string; onClose: () => void; onSaved: () => void;
}) {
  const [staffId, setStaffId]   = useState(currentStaffId);
  const [start, setStart]       = useState(toLocalDateStr(new Date()));
  const [end, setEnd]           = useState(toLocalDateStr(addDays(new Date(), 1)));
  const [reason, setReason]     = useState("");
  const [saving, setSaving]     = useState(false);

  async function submit() {
    setSaving(true);
    await api.post("pto_requests", { staff_id: staffId, start_date: start, end_date: end, reason, status: "pending" });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Coffee className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">PTO Request</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Staff Member</label>
            <select value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5">
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Start Date</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">End Date</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Vacation, personal days, etc." className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={submit} disabled={saving || !staffId} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-50">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sick Report Modal ────────────────────────────────────────────────────────

function SickModal({ staff, onClose, onSaved }: {
  staff: StaffMember[]; onClose: () => void; onSaved: (report: SickReport) => void;
}) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState<SickReport | null>(null);

  async function submit() {
    setSaving(true);
    // Count today's events for this staff member
    const today    = toLocalDateStr(new Date());
    const events   = await api.get(`calendar_events?staff_id=eq.${staffId}&start_time=gte.${today}T00:00:00&start_time=lt.${today}T23:59:59&status=in.(scheduled,confirmed)`);
    const count    = events?.length ?? 0;
    // Determine coverage: check other available staff of same role
    const sickStaff  = staff.find(s => s.id === staffId);
    const sameCoverage = staff.filter(s => s.is_active && s.id !== staffId && s.role === sickStaff?.role).length;
    const coverage   = sameCoverage >= 1 ? "adequate" : "rescheduled";
    const res = await api.post("sick_reports", {
      staff_id: staffId, report_date: today,
      coverage_status: coverage,
      affected_appt_count: count,
      rescheduled_count: coverage === "rescheduled" ? count : 0,
      notes,
    });
    if (res?.[0]) { setResult(res[0]); onSaved(res[0]); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Thermometer className="w-4 h-4 text-red-400" />
            <h3 className="text-base font-bold text-white">Report Sick Day</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {!result ? (
            <>
              <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                <Thermometer className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-snug">
                  The system will check today's appointments for the selected staff member and determine whether adequate coverage exists. If not, affected appointments will be flagged for rescheduling.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Who is out sick today?</label>
                <select value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5">
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role.replace("_"," ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional context…" className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none resize-none" />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className={`flex items-start gap-3 rounded-xl px-4 py-3.5 border ${
                result.coverage_status === "adequate"
                  ? "bg-emerald-500/8 border-emerald-500/25"
                  : "bg-red-500/8 border-red-500/25"
              }`}>
                {result.coverage_status === "adequate"
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className={`text-sm font-bold mb-1 ${result.coverage_status === "adequate" ? "text-emerald-400" : "text-red-400"}`}>
                    {result.coverage_status === "adequate" ? "Adequate Coverage — No Rescheduling Needed" : "Insufficient Coverage — Appointments Flagged"}
                  </p>
                  <p className="text-xs text-slate-400 leading-snug">
                    {result.affected_appt_count} appointment{result.affected_appt_count !== 1 ? "s" : ""} were affected today.
                    {result.coverage_status === "rescheduled"
                      ? ` ${result.rescheduled_count} have been flagged for rescheduling — clients will be notified.`
                      : " Other staff can absorb these appointments — no rescheduling required."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          {!result ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
              <button onClick={submit} disabled={saving || !staffId} className="flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-50">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Thermometer className="w-3.5 h-3.5" />}
                {saving ? "Checking Coverage…" : "Report Sick"}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-xl text-sm">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PTO Requests Panel ────────────────────────────────────────────────────────

function PtoPanelModal({ ptoList, staff, onClose, onApprove, onDeny, onNewRequest }: {
  ptoList: PtoRequest[]; staff: StaffMember[]; onClose: () => void;
  onApprove: (id: string) => void; onDeny: (id: string) => void; onNewRequest: () => void;
}) {
  const pending  = ptoList.filter(p => p.status === "pending");
  const approved = ptoList.filter(p => p.status === "approved");
  const [tab, setTab] = useState<"pending"|"all">("pending");

  function staffName(id: string) { return staff.find(s => s.id === id)?.name ?? "Unknown"; }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0d1221] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Coffee className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">PTO Requests</h3>
            {pending.length > 0 && <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-full">{pending.length} pending</span>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex border-b border-slate-800">
          {(["pending","all"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab===t ? "text-amber-400 border-b-2 border-amber-400 bg-amber-400/5" : "text-slate-500 hover:text-slate-300"}`}>
              {t === "pending" ? `Pending (${pending.length})` : `All (${ptoList.length})`}
            </button>
          ))}
        </div>

        <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-800">
          {(tab === "pending" ? pending : ptoList).length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-600 text-sm">No {tab === "pending" ? "pending " : ""}requests.</div>
          ) : (
            (tab === "pending" ? pending : ptoList).map(req => (
              <div key={req.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-white">{staffName(req.staff_id)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        req.status === "pending"  ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                        req.status === "approved" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                                                    "text-red-400 bg-red-500/10 border-red-500/20"
                      }`}>{req.status}</span>
                    </div>
                    <p className="text-xs text-slate-400">{req.start_date} → {req.end_date}</p>
                    {req.reason && <p className="text-xs text-slate-600 mt-0.5 italic">{req.reason}</p>}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => onApprove(req.id)} className="flex items-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg">
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => onDeny(req.id)} className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg">
                        <XCircle className="w-3 h-3" /> Deny
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex justify-between items-center">
          <button onClick={onNewRequest} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> New PTO Request
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

function MonthGrid({ year, month, events, ptoApproved, staff, selectedCals, onDayClick, onEventClick }: {
  year: number; month: number; events: CalEvent[]; ptoApproved: PtoRequest[];
  staff: StaffMember[]; selectedCals: Set<CalendarType>;
  onDayClick: (d: Date) => void; onEventClick: (e: CalEvent) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();

  function dayEvents(d: Date) {
    return events.filter(e => {
      if (!selectedCals.has(e.calendar_type)) return false;
      const s = new Date(e.start_time);
      return sameDay(s, d);
    });
  }

  function ptoOnDay(d: Date) {
    return staff.filter(s => {
      return ptoApproved.some(p => p.staff_id === s.id && p.status === "approved" && new Date(p.start_date) <= d && new Date(p.end_date) >= d);
    });
  }

  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-7 border-b border-slate-800">
        {DAYS.map(d => <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">{d}</div>)}
      </div>
      <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${cells.length/7}, minmax(0,1fr))` }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="border-r border-b border-slate-800/50 bg-slate-950/30" />;
          const evs  = dayEvents(d);
          const ptos = ptoOnDay(d);
          const isTd = sameDay(d, today);
          const isWk = d.getDay() === 0 || d.getDay() === 6;

          return (
            <div
              key={i}
              onClick={() => onDayClick(d)}
              className={`border-r border-b border-slate-800/60 p-1 cursor-pointer transition-colors hover:bg-slate-800/30 min-h-[80px] relative ${
                isWk ? "bg-slate-900/20" : ""
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none ${
                  isTd ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-300"
                }`}>{d.getDate()}</span>
                {ptos.length > 0 && (
                  <div className="flex gap-0.5">
                    {ptos.map(s => (
                      <div key={s.id} title={`${s.name} — PTO`} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                {evs.slice(0, 3).map(e => <EventPill key={e.id} event={e} onClick={() => onEventClick(e)} />)}
                {evs.length > 3 && (
                  <p className="text-[9px] text-slate-600 pl-1">+{evs.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ weekStart, events, selectedCals, onEventClick, onSlotClick }: {
  weekStart: Date; events: CalEvent[]; selectedCals: Set<CalendarType>;
  onEventClick: (e: CalEvent) => void; onSlotClick: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am–5pm
  const today = new Date();

  function eventsAt(d: Date, hr: number) {
    return events.filter(e => {
      if (!selectedCals.has(e.calendar_type)) return false;
      if (e.all_day) return false;
      const s = new Date(e.start_time);
      return sameDay(s, d) && s.getHours() === hr;
    });
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid border-b border-slate-800 sticky top-0 bg-[#0a0e1a] z-10" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
        <div />
        {days.map((d, i) => (
          <div key={i} className={`py-2 text-center border-l border-slate-800 ${sameDay(d, today) ? "bg-amber-400/5" : ""}`}>
            <p className="text-[10px] font-bold text-slate-600 uppercase">{fmt(d, { weekday: "short" })}</p>
            <p className={`text-base font-bold mt-0.5 ${sameDay(d, today) ? "text-amber-400" : "text-slate-400"}`}>{d.getDate()}</p>
          </div>
        ))}
      </div>

      {/* Hour rows */}
      {hours.map(hr => (
        <div key={hr} className="grid border-b border-slate-800/40" style={{ gridTemplateColumns: "52px repeat(7, 1fr)", minHeight: "64px" }}>
          <div className="px-2 pt-1 text-[10px] text-slate-700 font-medium text-right flex-shrink-0">
            {hr === 12 ? "12 PM" : hr > 12 ? `${hr-12} PM` : `${hr} AM`}
          </div>
          {days.map((d, di) => {
            const evs = eventsAt(d, hr);
            return (
              <div
                key={di}
                onClick={() => { const dt = new Date(d); dt.setHours(hr,0,0,0); onSlotClick(dt); }}
                className={`border-l border-slate-800/40 p-1 cursor-pointer hover:bg-slate-800/20 transition-colors ${sameDay(d, today) ? "bg-amber-400/3" : ""}`}
              >
                <div className="space-y-0.5">
                  {evs.map(e => <EventPill key={e.id} event={e} onClick={() => onEventClick(e)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ day, events, staff, selectedCals, onEventClick, onSlotClick }: {
  day: Date; events: CalEvent[]; staff: StaffMember[]; selectedCals: Set<CalendarType>;
  onEventClick: (e: CalEvent) => void; onSlotClick: (d: Date) => void;
}) {
  const hours = Array.from({ length: 10 }, (_, i) => i + 8);
  const dayEvs = events.filter(e => {
    if (!selectedCals.has(e.calendar_type)) return false;
    return sameDay(new Date(e.start_time), day);
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid border-b border-slate-800" style={{ gridTemplateColumns: "52px 1fr" }}>
        <div />
        <div className="py-3 border-l border-slate-800 px-4">
          <p className="text-sm font-bold text-white">{fmt(day, { weekday: "long", month: "long", day: "numeric" })}</p>
          <p className="text-xs text-slate-500 mt-0.5">{dayEvs.length} event{dayEvs.length !== 1 ? "s" : ""} scheduled</p>
        </div>
      </div>
      {hours.map(hr => {
        const slotEvs = dayEvs.filter(e => !e.all_day && new Date(e.start_time).getHours() === hr);
        return (
          <div key={hr} className="grid border-b border-slate-800/40 min-h-[72px]" style={{ gridTemplateColumns: "52px 1fr" }}>
            <div className="px-2 pt-2 text-[10px] text-slate-700 font-medium text-right">
              {hr === 12 ? "12 PM" : hr > 12 ? `${hr-12} PM` : `${hr} AM`}
            </div>
            <div
              onClick={() => { const dt = new Date(day); dt.setHours(hr,0,0,0); onSlotClick(dt); }}
              className="border-l border-slate-800/40 p-2 cursor-pointer hover:bg-slate-800/20 transition-colors space-y-1.5"
            >
              {slotEvs.map(e => {
                const cfg = CAL_CONFIG[e.calendar_type];
                const assignedStaff = staff.find(s => s.id === e.staff_id);
                return (
                  <div
                    key={e.id}
                    onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer hover:brightness-110 transition-all"
                    style={{ backgroundColor: cfg.color + "15", borderColor: cfg.color + "40" }}
                  >
                    <span style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white leading-snug truncate">{e.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-500">{fmtTime(e.start_time)} – {fmtTime(e.end_time)}</span>
                        {e.client_name && <span className="text-[10px] text-slate-500">{e.client_name}</span>}
                        {assignedStaff && (
                          <span className="text-[10px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: assignedStaff.color }} />
                            <span className="text-slate-500">{assignedStaff.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CONFIG[e.status].cls}`}>
                      {STATUS_CONFIG[e.status].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Calendar Component ──────────────────────────────────────────────────

export default function FirmCalendar() {
  const [viewMode, setViewMode]         = useState<ViewMode>("month");
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [events, setEvents]             = useState<CalEvent[]>([]);
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [ptoList, setPtoList]           = useState<PtoRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [newEventDate, setNewEventDate] = useState<Date | null>(null);
  const [showPtoPanel, setShowPtoPanel] = useState(false);
  const [showPtoForm, setShowPtoForm]   = useState(false);
  const [showSickModal, setShowSickModal] = useState(false);
  const [selectedCals, setSelectedCals] = useState<Set<CalendarType>>(
    new Set(["intake", "doc_review", "signing", "court_hearing", "court_deadline"])
  );

  // Staff filter
  const [selectedStaff, setSelectedStaff] = useState<string>("all");

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const weekStart = startOfWeek(currentDate);

  // Load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [evs, st, pto] = await Promise.all([
        api.get("calendar_events?order=start_time.asc&limit=500"),
        api.get("staff_members?order=name.asc"),
        api.get("pto_requests?order=created_at.desc"),
      ]);
      setEvents(evs ?? []);
      setStaff(st ?? []);
      setPtoList(pto ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filteredEvents = events.filter(e =>
    selectedCals.has(e.calendar_type) &&
    (selectedStaff === "all" || e.staff_id === selectedStaff || !e.staff_id)
  );

  const ptoApproved = ptoList.filter(p => p.status === "approved");
  const ptoPending  = ptoList.filter(p => p.status === "pending").length;

  function toggleCal(t: CalendarType) {
    setSelectedCals(prev => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function headerLabel() {
    if (viewMode === "month") return fmt(currentDate, { month: "long", year: "numeric" });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      return `${fmt(ws, { month: "short", day: "numeric" })} – ${fmt(we, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return fmt(currentDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  async function handlePtoApprove(id: string) {
    await api.patch("pto_requests", id, { status: "approved", approved_at: new Date().toISOString() });
    setPtoList(prev => prev.map(p => p.id === id ? { ...p, status: "approved" as PtoStatus } : p));
  }

  async function handlePtoDeny(id: string) {
    await api.patch("pto_requests", id, { status: "denied" });
    setPtoList(prev => prev.map(p => p.id === id ? { ...p, status: "denied" as PtoStatus } : p));
  }

  function handleEventUpdate(id: string, updates: Partial<CalEvent>) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }

  // Today's summary
  const todayEvs = events.filter(e => sameDay(new Date(e.start_time), new Date()) && selectedCals.has(e.calendar_type));

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>

      {/* ── Top Bar ── */}
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
              <span className="hidden sm:inline text-slate-500 text-xs font-medium uppercase tracking-wide">Firm Calendar</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sick button */}
            <button
              onClick={() => setShowSickModal(true)}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">I'm Sick Today</span>
            </button>

            {/* PTO button */}
            <button
              onClick={() => setShowPtoPanel(true)}
              className="relative flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PTO</span>
              {ptoPending > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 text-[9px] font-bold rounded-full flex items-center justify-center">{ptoPending}</span>
              )}
            </button>

            {/* New event */}
            <button
              onClick={() => setNewEventDate(new Date())}
              className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-lg shadow-amber-400/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Event</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-56 bg-[#0d1221] border-r border-slate-800 flex-shrink-0 overflow-y-auto">
          <div className="p-4 space-y-5">

            {/* Calendars filter */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Calendars</p>
              <div className="space-y-1">
                {(Object.keys(CAL_CONFIG) as CalendarType[]).map(t => {
                  const cfg = CAL_CONFIG[t];
                  const on  = selectedCals.has(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleCal(t)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        on ? "bg-slate-800/80" : "opacity-40 hover:opacity-70"
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: on ? cfg.color : "#475569" }} />
                      <span className={on ? "text-slate-200" : "text-slate-500"}>{cfg.label}</span>
                      {t === "court_deadline" && <span className="ml-auto text-[9px] text-orange-400/70 border border-orange-500/20 px-1 rounded">DL</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Staff filter */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Staff View</p>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedStaff("all")}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${selectedStaff === "all" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Users className="w-3 h-3" /> All Staff
                </button>
                {staff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaff(s.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${selectedStaff === s.id ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Today's summary */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Today</p>
              {todayEvs.length === 0 ? (
                <p className="text-xs text-slate-700">No events today.</p>
              ) : (
                <div className="space-y-1.5">
                  {todayEvs.slice(0,5).map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CAL_CONFIG[e.calendar_type].color }} />
                        <p className="text-[10px] text-slate-400 group-hover:text-white transition-colors truncate leading-snug">{e.title}</p>
                      </div>
                      {!e.all_day && <p className="text-[9px] text-slate-700 pl-3">{fmtTime(e.start_time)}</p>}
                    </button>
                  ))}
                  {todayEvs.length > 5 && <p className="text-[9px] text-slate-700 pl-3">+{todayEvs.length - 5} more</p>}
                </div>
              )}
            </div>

            {/* PTO approved — on calendar */}
            {ptoApproved.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Approved PTO</p>
                <div className="space-y-1.5">
                  {ptoApproved.slice(0,4).map(p => {
                    const s = staff.find(m => m.id === p.staff_id);
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s?.color ?? "#64748b" }} />
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 truncate">{s?.name}</p>
                          <p className="text-[9px] text-slate-700">{p.start_date} – {p.end_date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main calendar area ── */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Calendar toolbar */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentDate(new Date())} className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700">Today</button>
              <button onClick={() => navigate(-1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => navigate(1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-white ml-1">{headerLabel()}</h2>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              {(["month","week","day"] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                    viewMode === v ? "bg-amber-400 text-slate-950 shadow" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading calendar…</span>
              </div>
            </div>
          ) : (
            <>
              {viewMode === "month" && (
                <MonthGrid
                  year={year} month={month}
                  events={filteredEvents} ptoApproved={ptoApproved}
                  staff={staff} selectedCals={selectedCals}
                  onDayClick={d => { setCurrentDate(d); setViewMode("day"); }}
                  onEventClick={e => setSelectedEvent(e)}
                />
              )}
              {viewMode === "week" && (
                <WeekView
                  weekStart={weekStart} events={filteredEvents} selectedCals={selectedCals}
                  onEventClick={e => setSelectedEvent(e)}
                  onSlotClick={d => setNewEventDate(d)}
                />
              )}
              {viewMode === "day" && (
                <DayView
                  day={currentDate} events={filteredEvents} staff={staff} selectedCals={selectedCals}
                  onEventClick={e => setSelectedEvent(e)}
                  onSlotClick={d => setNewEventDate(d)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent} staff={staff} onClose={() => setSelectedEvent(null)}
          onUpdate={handleEventUpdate}
        />
      )}
      {newEventDate && (
        <NewEventModal
          defaultDate={newEventDate} staff={staff}
          onClose={() => setNewEventDate(null)}
          onSave={e => { setEvents(prev => [...prev, e]); }}
        />
      )}
      {showPtoPanel && (
        <PtoPanelModal
          ptoList={ptoList} staff={staff}
          onClose={() => setShowPtoPanel(false)}
          onApprove={handlePtoApprove} onDeny={handlePtoDeny}
          onNewRequest={() => { setShowPtoPanel(false); setShowPtoForm(true); }}
        />
      )}
      {showPtoForm && (
        <PtoModal
          staff={staff} currentStaffId={staff[0]?.id ?? ""}
          onClose={() => setShowPtoForm(false)}
          onSaved={() => api.get("pto_requests?order=created_at.desc").then(r => r && setPtoList(r))}
        />
      )}
      {showSickModal && (
        <SickModal
          staff={staff} onClose={() => setShowSickModal(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
