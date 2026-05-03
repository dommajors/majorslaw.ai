import { useState, Component, ReactNode } from 'react';
import ClientDashboard from './ClientDashboard';
import BankruptcyDocumentQuestionnaire from './bankruptcy-information-and-document-questionnaire(1).jsx';
import ChatWidget, { ClientQuestion } from './ChatWidget';
import AttorneyReviewPortal from './AttorneyReviewPortal';
import FirmCalendar from './FirmCalendar';
import ParalegalReview from './ParalegalReview';
import AccountingPortal from './AccountingPortal';

class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:'2rem',fontFamily:'monospace',background:'#0f172a',color:'#f87171',minHeight:'100vh'}}>
          <h2 style={{marginBottom:'1rem'}}>Runtime Error</h2>
          <pre style={{whiteSpace:'pre-wrap',fontSize:'0.8rem',color:'#fca5a5'}}>{this.state.error.message}</pre>
          <pre style={{whiteSpace:'pre-wrap',fontSize:'0.7rem',color:'#94a3b8',marginTop:'1rem'}}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

type View = 'dashboard' | 'questionnaire' | 'attorney' | 'calendar' | 'paralegal' | 'accounting';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [updateMode, setUpdateMode] = useState(false);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);

  const pendingCount = questions.filter(q => q.status === 'needs_attorney' || q.status === 'pending_review').length;

  // ── Portal toggle bar (shown on dashboard and attorney views) ──────────────
  function PortalToggle() {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-full shadow-2xl">
        <button
          onClick={() => setView('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            view === 'dashboard'
              ? 'bg-slate-700 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Client Portal
        </button>
        <button
          onClick={() => setView('attorney')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            view === 'attorney'
              ? 'bg-amber-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Attorney Review
        </button>
        <button
          onClick={() => setView('paralegal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            view === 'paralegal'
              ? 'bg-emerald-700 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Paralegal Review
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            view === 'calendar'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Firm Calendar
        </button>
        <button
          onClick={() => setView('accounting')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            view === 'accounting'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Accounting
        </button>
      </div>
    );
  }

  if (view === 'questionnaire') {
    return (
      <div className="relative">
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg">
          <button
            onClick={() => { setView('dashboard'); setUpdateMode(false); }}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Dashboard
          </button>

          {/* Questions pill — always visible in questionnaire */}
          <div className="flex items-center gap-3">
            {questions.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>{questions.length} question{questions.length !== 1 ? 's' : ''} saved</span>
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    · {pendingCount} pending attorney review
                  </span>
                )}
              </div>
            )}
            <span className="text-xs text-slate-600">|</span>
            <span className="text-xs text-slate-500 font-medium" style={{ fontFamily: "'Georgia', serif" }}>
              MAJORSLAW<span className="text-amber-400">.ai</span>
            </span>
          </div>
        </div>

        {/* Push content below fixed bar */}
        <div className="pt-12">
          <ErrorBoundary>
            <BankruptcyDocumentQuestionnaire updateMode={updateMode} />
          </ErrorBoundary>
        </div>
        <ChatWidget onQuestionsChange={setQuestions} />
      </div>
    );
  }

  if (view === 'attorney') {
    return (
      <ErrorBoundary>
        <div className="pb-20">
          <AttorneyReviewPortal />
        </div>
        <PortalToggle />
      </ErrorBoundary>
    );
  }

  if (view === 'paralegal') {
    return (
      <ErrorBoundary>
        <div className="pb-20">
          <ParalegalReview />
        </div>
        <PortalToggle />
      </ErrorBoundary>
    );
  }

  if (view === 'calendar') {
    return (
      <ErrorBoundary>
        <div className="pb-20">
          <FirmCalendar />
        </div>
        <PortalToggle />
      </ErrorBoundary>
    );
  }

  if (view === 'accounting') {
    return (
      <ErrorBoundary>
        <div className="pb-20">
          <AccountingPortal />
        </div>
        <PortalToggle />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="pb-20">
        <ClientDashboard
          onOpenQuestionnaire={() => { setUpdateMode(false); setView('questionnaire'); }}
          onUpdateInformation={() => { setUpdateMode(true); setView('questionnaire'); }}
        />
      </div>
      <ChatWidget onQuestionsChange={setQuestions} />
      <PortalToggle />
    </ErrorBoundary>
  );
}

export default App;
