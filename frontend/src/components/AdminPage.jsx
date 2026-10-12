import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Stethoscope, CreditCard, Scale, Webhook, Home, LogOut, Sun, Moon, RefreshCw,
  ArrowLeft, ChevronRight, CheckCircle2, AlertTriangle, Search, Wallet, Undo2, Inbox,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  api, errMsg, inr, fmtDate, fmtDateTime, Modal, Btn, Pill, StatusPill, inputCls, Label, toast,
} from './consult/common';

// ── Helpers ──────────────────────────────────────────────────────────────────
const words = (v, fallback = '') => String(v ?? fallback).replace(/_/g, ' ');

// [label, tone] — every lookup falls back to something readable, so a record with a missing or new value never crashes a page.
const PAY_STATUS = { paid: ['Paid', 'green'], refund_initiated: ['Refund started', 'amber'], refunded: ['Refunded', 'blue'], failed: ['Voided · never paid', 'gray'] };
const PAYOUT     = { NOT_DUE: ['Payout not due', 'gray'], PENDING: ['Payout pending', 'amber'], PAID: ['Paid out', 'green'], FAILED: ['Payout failed', 'red'] };
const VERIFY     = { approved: ['Approved', 'green'], pending: ['Pending', 'amber'], rejected: ['Rejected', 'red'], not_applicable: ['Pending', 'amber'] };

const tagFor = (map, key, fallback) => {
  const [label, tone] = map[key] || [words(key, fallback), 'gray'];
  return <Pill tone={tone}>{label}</Pill>;
};

const TABS = [
  { key: 'overview', label: 'Overview',       icon: LayoutDashboard, title: 'Overview',             blurb: 'What needs your attention today' },
  { key: 'doctors',  label: 'Doctors',        icon: Stethoscope,     title: 'Doctor verification',  blurb: "Check each registration number against the medical register before you approve" },
  { key: 'payments', label: 'Payments',       icon: CreditCard,      title: 'Payments & payouts',   blurb: 'Refund patients and pay doctors their share' },
  { key: 'disputes', label: 'Disputes',       icon: Scale,           title: 'Disputes',             blurb: 'Patient paid, but the doctor marked the consultation as expired' },
  { key: 'webhooks', label: 'Webhook issues', icon: Webhook,         title: 'Webhook issues',       blurb: 'Payments that arrived with no valid booking, and failed deliveries' },
];
const TAB_KEYS = TABS.map((t) => t.key);

const badgeFor = (key, s) => {
  if (!s) return 0;
  if (key === 'doctors')  return s.pendingDoctors || 0;
  if (key === 'payments') return (s.payoutPending || 0) + (s.payoutFailed || 0);
  if (key === 'disputes') return s.disputes || 0;
  if (key === 'webhooks') return s.webhookProblems || 0;
  return 0;
};

// Loads a list and keeps loading / error state. A 401 means the session ended, so go back to login.
function useAdminList(fetcher, key) {
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const [state, setState] = useState({ rows: null, error: null });

  const load = useCallback(() => {
    let alive = true;
    setState({ rows: null, error: null });
    fetchRef.current()
      .then((rows) => { if (alive) setState({ rows, error: null }); })
      .catch((e) => {
        if (e.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; return; }
        if (alive) setState({ rows: [], error: errMsg(e, 'Could not load this list.') });
      });
    return () => { alive = false; };
  }, []);

  // `key` identifies what is being listed (tab / filter); a new key loads the list again.
  useEffect(() => load(), [load, key]);
  return { ...state, reload: load };
}

// ── Small building blocks ────────────────────────────────────────────────────
const Panel = ({ className = '', children }) => (
  <div className={`rounded-2xl border border-[#1F3A4B]/10 dark:border-white/10 bg-white dark:bg-white/[0.04] ${className}`}>{children}</div>
);

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 p-1 rounded-full bg-[#1F3A4B]/5 dark:bg-white/5">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
            value === v
              ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] shadow'
              : 'text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 hover:bg-[#1F3A4B]/10 dark:hover:bg-white/10'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const Skeleton = () => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 animate-pulse" />)}
  </div>
);

const ErrorBox = ({ message, onRetry }) => (
  <Panel className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 border-rose-300 dark:border-rose-500/40">
    <AlertTriangle className="text-rose-500 shrink-0" size={22} />
    <p className="flex-1 text-sm font-semibold">{message}</p>
    <Btn variant="ghost" onClick={onRetry}>Try again</Btn>
  </Panel>
);

const Empty = ({ title, hint }) => (
  <Panel className="p-10 text-center">
    <Inbox className="mx-auto mb-3 opacity-40" size={30} />
    <p className="text-sm font-extrabold uppercase tracking-widest">{title}</p>
    {hint && <p className="mt-1 text-xs font-semibold opacity-60">{hint}</p>}
  </Panel>
);

function PromptModal({ title, intro, label, confirmLabel, onClose, onConfirm }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      {intro && <p className="text-sm font-semibold opacity-80 mb-4">{intro}</p>}
      <Label>{label}</Label>
      <textarea className={`${inputCls} min-h-[80px]`} maxLength={300} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex justify-end gap-3 mt-5">
        <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn
          disabled={busy || !value.trim()}
          onClick={async () => { setBusy(true); const ok = await onConfirm(value.trim()); setBusy(false); if (ok !== false) onClose(); }}
        >
          {busy ? 'Working…' : confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, hot, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg bg-white dark:bg-white/[0.04] ${
        hot ? 'border-amber-400 dark:border-amber-400/60' : 'border-[#1F3A4B]/10 dark:border-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">{label}</span>
        <span className={`p-2 rounded-xl ${hot ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300' : 'bg-[#1F3A4B]/5 dark:bg-white/10'}`}><Icon size={16} /></span>
      </div>
      <p className="mt-3 text-3xl font-extrabold font-sans tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs font-semibold opacity-60">{sub}</p>}
    </button>
  );
}

function Overview({ stats, error, onRetry, go }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (error && !stats) return <ErrorBox message={error} onRetry={onRetry} />;
  if (!stats) return <Skeleton />;

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const attention = [];
  if (stats.pendingDoctors > 0)  attention.push({ key: 'doc', text: `${plural(stats.pendingDoctors, 'doctor is', 'doctors are')} waiting for verification`, cta: 'Review', run: () => go('doctors') });
  if (stats.disputes > 0)        attention.push({ key: 'dis', text: `${plural(stats.disputes, 'consultation was', 'consultations were')} marked expired after the patient paid`, cta: 'Resolve', run: () => go('disputes') });
  if (stats.payoutFailed > 0)    attention.push({ key: 'pf', text: `${plural(stats.payoutFailed, 'doctor payout', 'doctor payouts')} failed`, cta: 'Retry', run: () => go('payments', { filter: 'FAILED' }) });
  if (stats.payoutPending > 0)   attention.push({ key: 'pp', text: `${plural(stats.payoutPending, 'doctor payout is', 'doctor payouts are')} waiting to be paid`, cta: 'Pay out', run: () => go('payments', { filter: 'PENDING' }) });
  if (stats.webhookProblems > 0) attention.push({ key: 'wh', text: `${plural(stats.webhookProblems, 'webhook problem needs', 'webhook problems need')} a look`, cta: 'Check', run: () => go('webhooks') });

  const payouts = (stats.payoutPending || 0) + (stats.payoutFailed || 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-lg font-extrabold font-sans">{greeting}.</p>
        <p className="text-sm font-semibold opacity-60">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Stethoscope} label="Doctors to verify" value={stats.pendingDoctors} sub="Waiting for approval" hot={stats.pendingDoctors > 0} onClick={() => go('doctors')} />
        <StatCard icon={Wallet} label="Collected" value={inr(stats.paidRupees)} sub={`${stats.paidCount} payment${stats.paidCount === 1 ? '' : 's'}, not refunded`} onClick={() => go('payments')} />
        <StatCard icon={Undo2} label="Refunded" value={inr(stats.refundedRupees)} sub={`${stats.refundedCount} refund${stats.refundedCount === 1 ? '' : 's'}`} onClick={() => go('payments', { filter: 'refunded' })} />
        <StatCard icon={CreditCard} label="Payouts to make" value={payouts} sub={`${stats.payoutPending} pending · ${stats.payoutFailed} failed`} hot={payouts > 0} onClick={() => go('payments', { filter: stats.payoutFailed > 0 ? 'FAILED' : 'PENDING' })} />
      </div>

      <section aria-labelledby="attention-title">
        <h2 id="attention-title" className="text-xs font-bold uppercase tracking-widest opacity-60 mb-3">Needs your attention</h2>
        {attention.length === 0 ? (
          <Panel className="p-6 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600 dark:text-[#C2F84F]" size={22} />
            <p className="text-sm font-semibold">All clear — nothing needs your attention right now.</p>
          </Panel>
        ) : (
          <Panel className="divide-y divide-[#1F3A4B]/5 dark:divide-white/5">
            {attention.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <p className="text-sm font-semibold">{a.text}</p>
                <Btn variant="ghost" onClick={a.run}>{a.cta} <ChevronRight size={13} className="inline -mt-0.5" /></Btn>
              </div>
            ))}
          </Panel>
        )}
      </section>
    </div>
  );
}

// ── Doctors ──────────────────────────────────────────────────────────────────
function Doctors({ onChanged }) {
  const [status, setStatus] = useState('pending');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [acct, setAcct] = useState({});

  const { rows, error, reload } = useAdminList(
    () => api.get('/admin/doctors', { params: { status } }).then((r) => r.data.data || []),
    `doctors:${status}`
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!rows) return rows;
    if (!q) return rows;
    return rows.filter((d) => [d.name, d.email, d.registrationNumber, d.specialization].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, query]);

  const review = async (doc, decision, note) => {
    try {
      await api.patch(`/admin/doctors/${doc._id}/verification`, { decision, note });
      toast.success(decision === 'approve' ? 'Doctor approved.' : 'Doctor rejected.');
      reload(); onChanged();
    } catch (e) { toast.error(errMsg(e)); return false; }
  };

  const saveAccount = async (doc) => {
    try {
      await api.patch(`/admin/doctors/${doc._id}/linked-account`, { accountId: (acct[doc._id] ?? doc.razorpayLinkedAccountId ?? '').trim() });
      toast.success('Payout account saved.'); reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <Segmented label="Filter by status" value={status} onChange={setStatus}
          options={[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']]} />
        <div className="relative md:w-72">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
          <input className={`${inputCls} !pl-10`} placeholder="Search name, email, reg. no." aria-label="Search doctors" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} />
        : shown === null ? <Skeleton />
        : shown.length === 0 ? <Empty title="No doctors here" hint={query ? 'Try a different search.' : 'Nothing in this list.'} />
        : (
          <div className="space-y-3">
            {shown.map((d) => (
              <Panel key={d._id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center font-extrabold font-sans">
                      {(d.name || '?').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold font-sans truncate">Dr. {d.name}</p>
                      <p className="text-xs font-semibold opacity-60 break-all">{d.email}{d.phone ? ` · ${d.phone}` : ''}</p>
                    </div>
                  </div>
                  {tagFor(VERIFY, d.verificationStatus || 'pending')}
                </div>

                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {[['Specialty', d.specialization], ['Registration no.', d.registrationNumber], ['Council', d.registrationCouncil]].map(([k, v]) => (
                    <div key={k}><dt className="text-[11px] font-bold uppercase tracking-widest opacity-50">{k}</dt><dd className="font-semibold">{v || <span className="opacity-50">Not provided</span>}</dd></div>
                  ))}
                </dl>
                {d.verificationNote && <p className="mt-3 text-xs font-semibold opacity-70">Note: {d.verificationNote}</p>}

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  {d.verificationStatus !== 'approved' && <Btn variant="ok" onClick={() => review(d, 'approve', '')}>Approve</Btn>}
                  {d.verificationStatus !== 'rejected' && <Btn variant="danger" onClick={() => setModal({ doc: d })}>Reject</Btn>}
                  {d.verificationStatus === 'approved' && (
                    <div className="flex items-end gap-2 sm:ml-auto">
                      <div>
                        <Label>Razorpay payout account</Label>
                        <input className={`${inputCls} sm:w-60`} placeholder="acc_XXXXXXXXXXXXXX" value={acct[d._id] ?? d.razorpayLinkedAccountId ?? ''} onChange={(e) => setAcct({ ...acct, [d._id]: e.target.value })} />
                      </div>
                      <Btn variant="ghost" onClick={() => saveAccount(d)}>Save</Btn>
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}

      {modal && (
        <PromptModal title={`Reject Dr. ${modal.doc.name}`} intro="The doctor is emailed this note." label="Reason" confirmLabel="Reject"
          onClose={() => setModal(null)} onConfirm={(note) => review(modal.doc, 'reject', note)} />
      )}
    </>
  );
}

// Asks Razorpay what really happened to a payment, explains it, and offers the right next step.
function CheckModal({ p, onClose, onChanged, onRefund }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const { data } = await api.post(`/admin/payments/${p._id}/check`);
      setState({ loading: false, data: data.data, error: null });
      if (data.data.synced) onChanged();            // our record was brought in line with Razorpay
    } catch (e) {
      setState({ loading: false, data: null, error: errMsg(e, 'Could not check this payment.') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p._id]);
  useEffect(() => { run(); }, [run]);

  const d = state.data;
  const BOX = {
    captured:    'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
    refunded:    'bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200',
    not_charged: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
    missing:     'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  };

  const voidIt = async () => {
    const extra = d.payment.bookingStatus === 'PAID_CONFIRMED' ? ' The booking is still marked confirmed, so it will be cancelled and the doctor\'s slot freed.' : '';
    if (!window.confirm(`Void this record? It will stop counting as money received.${extra}`)) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/payments/${p._id}/void`, {});
      toast.success(data.bookingChanged ? 'Record voided and the booking cancelled.' : 'Record voided.');
      onChanged();
      onClose();
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  return (
    <Modal title="Check with Razorpay" onClose={() => !busy && onClose()}>
      <p className="text-[11px] font-mono opacity-60 break-all mb-4">{p.razorpay_payment_id}</p>

      {state.loading && <p className="text-sm font-bold uppercase tracking-widest opacity-60">Asking Razorpay…</p>}
      {state.error && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-rose-600">{state.error}</p>
          <Btn variant="ghost" onClick={run}>Try again</Btn>
        </div>
      )}

      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Razorpay says</p>
              <p className="mt-1 font-extrabold font-sans">{d.razorpay.found ? words(d.razorpay.status) : 'No such payment'}</p>
              {d.razorpay.amountRupees != null && <p className="text-xs font-semibold opacity-60">{inr(d.razorpay.amountRupees)}{d.razorpay.refundedRupees ? ` · refunded ${inr(d.razorpay.refundedRupees)}` : ''}</p>}
            </div>
            <div className="rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Our record says</p>
              <p className="mt-1 font-extrabold font-sans">{(PAY_STATUS[d.payment.status] || [words(d.payment.status)])[0]}</p>
              <p className="text-xs font-semibold opacity-60">{inr(d.payment.amountRupees)}{d.payment.bookingStatus ? ` · booking ${words(d.payment.bookingStatus).toLowerCase()}` : ''}</p>
            </div>
          </div>

          <div className={`rounded-2xl p-4 text-sm font-semibold leading-relaxed ${BOX[d.verdict] || BOX.missing}`}>{d.advice}</div>
          {d.synced && <p className="text-xs font-bold text-emerald-700 dark:text-[#C2F84F]">Our record was updated to match Razorpay.</p>}

          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Btn variant="ghost" onClick={onClose} disabled={busy}>Close</Btn>
            {d.canRefund && <Btn variant="danger" onClick={() => onRefund(p)}>Refund patient</Btn>}
            {d.canVoid && <Btn variant="danger" disabled={busy} onClick={voidIt}>{busy ? 'Working…' : 'Void record'}</Btn>}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Payments & disputes ──────────────────────────────────────────────────────
const FILTERS = { '': {}, PENDING: { payoutStatus: 'PENDING' }, FAILED: { payoutStatus: 'FAILED' }, refunded: { status: 'refunded' }, voided: { status: 'failed' } };

const canRefund  = (p) => (p.status || 'paid') === 'paid' && (p.payoutStatus || 'NOT_DUE') !== 'PAID';
const canRelease = (p) => (p.status || 'paid') === 'paid' && ['COMPLETED', 'ABORTED_BY_DOCTOR'].includes(p.bookingStatus) && (p.payoutStatus || 'NOT_DUE') !== 'PAID';
const canMark    = (p) => (p.status || 'paid') === 'paid' && ['PENDING', 'FAILED'].includes(p.payoutStatus);
const canCheck   = (p) => (p.status || 'paid') === 'paid';

// A payment is recorded, but the booking it belongs to never got confirmed (or was dropped) — worth checking with Razorpay.
const NEVER_CONFIRMED = ['PAYMENT_EXPIRED', 'REQUEST_EXPIRED', 'DOCTOR_REJECTED', 'PATIENT_CANCELLED'];
const mismatch = (p) => (p.status || 'paid') === 'paid' && NEVER_CONFIRMED.includes(p.bookingStatus);

function RowActions({ p, onRefund, onRelease, onMark, onCheck }) {
  const small = '!px-3 !py-1.5';
  return (
    <div className="flex flex-wrap gap-2">
      {canCheck(p) && <Btn variant={mismatch(p) ? 'primary' : 'ghost'} className={small} onClick={() => onCheck(p)}>Check</Btn>}
      {canRefund(p)  && <Btn variant="danger" className={small} onClick={() => onRefund(p)}>Refund</Btn>}
      {canRelease(p) && <Btn variant="ok" className={small} onClick={() => onRelease(p)}>{(p.payoutStatus || 'NOT_DUE') === 'NOT_DUE' ? 'Release payout' : 'Retry payout'}</Btn>}
      {canMark(p)    && <Btn variant="ghost" className={small} onClick={() => onMark(p)}>Mark paid</Btn>}
      {!canCheck(p) && !canRefund(p) && !canRelease(p) && !canMark(p) && <span className="text-xs font-semibold opacity-40">—</span>}
    </div>
  );
}

function PaymentDetail({ p }) {
  return (
    <>
      {mismatch(p) && (
        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
          <AlertTriangle size={12} className="inline -mt-0.5 mr-1" />The booking was never confirmed, but a payment is recorded. Use “Check” to see what Razorpay says.
        </p>
      )}
      {p.doctorPayoutPaise != null && (
        <p className="text-xs font-semibold opacity-60">Doctor {inr(p.doctorPayoutPaise / 100)} · Fee {inr((p.commissionPaise || 0) / 100)}{p.payoutReference ? ` · Ref ${p.payoutReference}` : ''}</p>
      )}
      {p.payoutError && <p className="text-xs font-bold text-rose-600">Payout error: {p.payoutError}</p>}
      {p.refundedAt && <p className="text-xs font-semibold opacity-60">Refunded {fmtDate(p.refundedAt)}{p.refundReason ? ` · ${p.refundReason}` : ''} · by {p.refundedBy || 'system'}</p>}
    </>
  );
}

function PaymentsTable({ rows, ...actions }) {
  return (
    <>
      <Panel className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest opacity-60 border-b border-[#1F3A4B]/10 dark:border-white/10">
              {['When', 'Patient → Doctor', 'Amount', 'Status', 'Actions'].map((h) => <th key={h} className="px-5 py-3 font-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F3A4B]/5 dark:divide-white/5">
            {rows.map((p) => (
              <tr key={p._id} className="align-top">
                <td className="px-5 py-4 whitespace-nowrap font-semibold">{fmtDateTime(p.createdAt)}</td>
                <td className="px-5 py-4"><p className="font-bold">{p.patientName || '—'} <span className="opacity-40">→</span> Dr. {p.doctorName || '—'}</p><p className="text-[11px] font-mono opacity-40 break-all">{p.razorpay_payment_id}</p></td>
                <td className="px-5 py-4 whitespace-nowrap font-extrabold font-sans">{inr((p.amountPaise || 0) / 100)}</td>
                <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5 mb-1">{p.bookingStatus && <StatusPill status={p.bookingStatus} />}{tagFor(PAY_STATUS, p.status || 'paid')}{tagFor(PAYOUT, p.payoutStatus || 'NOT_DUE')}</div><PaymentDetail p={p} /></td>
                <td className="px-5 py-4"><RowActions p={p} {...actions} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="md:hidden space-y-3">
        {rows.map((p) => (
          <Panel key={p._id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xl font-extrabold font-sans">{inr((p.amountPaise || 0) / 100)}</p><p className="text-xs font-semibold opacity-60">{fmtDateTime(p.createdAt)}</p></div>
              <p className="text-sm font-bold text-right">{p.patientName || '—'} → Dr. {p.doctorName || '—'}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">{p.bookingStatus && <StatusPill status={p.bookingStatus} />}{tagFor(PAY_STATUS, p.status || 'paid')}{tagFor(PAYOUT, p.payoutStatus || 'NOT_DUE')}</div>
            <PaymentDetail p={p} />
            <RowActions p={p} {...actions} />
          </Panel>
        ))}
      </div>
    </>
  );
}

function Payments({ disputes = false, filter, setFilter, onChanged }) {
  const [modal, setModal] = useState(null);

  const { rows, error, reload } = useAdminList(
    () => (disputes ? api.get('/admin/disputes') : api.get('/admin/payments', { params: FILTERS[filter] || {} })).then((r) => r.data.data || []),
    disputes ? 'disputes' : `payments:${filter}`
  );

  const post = async (url, body, okMsg, p) => {
    try { await api.post(url, body); toast.success(okMsg); reload(); onChanged(); }
    catch (e) {
      const code = e.response?.data?.code;
      if (p && ['NOT_CAPTURED', 'NOT_AT_RAZORPAY', 'ALREADY_REFUNDED'].includes(code)) {
        toast.error(errMsg(e), { duration: 7000 });
        setModal({ type: 'check', p });          // show exactly what Razorpay says, with the right next step
        return true;
      }
      toast.error(errMsg(e));
      return false;
    }
  };

  const total = useMemo(() => (rows || []).reduce((sum, p) => sum + (p.amountPaise || 0), 0) / 100, [rows]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {!disputes ? (
          <Segmented label="Filter payments" value={filter} onChange={setFilter}
            options={[['', 'All'], ['PENDING', 'Payout pending'], ['FAILED', 'Payout failed'], ['refunded', 'Refunded'], ['voided', 'Voided']]} />
        ) : <span />}
        {rows && rows.length > 0 && <p className="text-xs font-bold uppercase tracking-widest opacity-60">{rows.length} shown · {inr(total)}</p>}
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} />
        : rows === null ? <Skeleton />
        : rows.length === 0 ? <Empty title={disputes ? 'No open disputes' : 'No payments here'} hint={disputes ? 'Nothing to resolve right now.' : 'Try another filter.'} />
        : (
          <PaymentsTable
            rows={rows}
            onRefund={(p) => setModal({ type: 'refund', p })}
            onRelease={(p) => post(`/admin/payments/${p._id}/payout/release`, {}, 'Payout processed.', p)}
            onMark={(p) => setModal({ type: 'paid', p })}
            onCheck={(p) => setModal({ type: 'check', p })}
          />
        )}

      {modal?.type === 'refund' && (
        <PromptModal title="Refund patient" intro={`Refund ${inr((modal.p.amountPaise || 0) / 100)} to the patient. If the booking is still active it is cancelled too.`} label="Reason" confirmLabel="Refund"
          onClose={() => setModal((m) => (m?.type === 'refund' ? null : m))}
          onConfirm={(reason) => post(`/admin/payments/${modal.p._id}/refund`, { reason }, 'Refund initiated.', modal.p)} />
      )}
      {modal?.type === 'paid' && (
        <PromptModal title="Mark payout paid" intro={`Record that you paid the doctor ${inr((modal.p.doctorPayoutPaise || 0) / 100)} outside Razorpay.`} label="Bank / UPI reference" confirmLabel="Mark paid"
          onClose={() => setModal((m) => (m?.type === 'paid' ? null : m))}
          onConfirm={(reference) => post(`/admin/payments/${modal.p._id}/payout/mark-paid`, { reference }, 'Payout recorded.')} />
      )}
      {modal?.type === 'check' && (
        <CheckModal
          p={modal.p}
          onClose={() => setModal(null)}
          onChanged={() => { reload(); onChanged(); }}
          onRefund={(p) => setModal({ type: 'refund', p })}
        />
      )}
    </>
  );
}

// ── Webhook issues ───────────────────────────────────────────────────────────
function Webhooks() {
  const { rows, error, reload } = useAdminList(() => api.get('/admin/webhook-events').then((r) => r.data.data || []), 'webhooks');
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (rows === null) return <Skeleton />;
  if (rows.length === 0) return <Empty title="No problems" hint="Every payment notification was handled." />;
  return (
    <div className="space-y-3">
      {rows.map((e) => (
        <Panel key={e._id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-sm">{e.event} <span className="opacity-50 font-semibold">· {fmtDateTime(e.createdAt)}</span></p>
            <div className="flex gap-2"><Pill tone={e.status === 'error' ? 'red' : 'amber'}>{words(e.status, 'unknown')}</Pill>{e.outcome && <Pill tone="gray">{words(e.outcome)}</Pill>}</div>
          </div>
          <p className="mt-2 text-[11px] font-mono opacity-60 break-all">payment {e.razorpayPaymentId || '—'} · order {e.razorpayOrderId || '—'}{e.refundId ? ` · refund ${e.refundId}` : ''}</p>
          {e.detail && <p className="mt-1 text-xs font-semibold opacity-80">{e.detail}</p>}
        </Panel>
      ))}
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────
function NavButton({ t, mobile, active, count, onSelect }) {
  const Icon = t.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(t.key)}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
        mobile ? 'px-4 py-2.5 shrink-0' : 'w-full px-4 py-3'
      } ${active
        ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] shadow'
        : 'text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 hover:bg-[#1F3A4B]/5 dark:hover:bg-white/10'}`}
    >
      <Icon size={17} />
      <span className={mobile ? '' : 'flex-1 text-left'}>{t.label}</span>
      {count > 0 && <span className="min-w-[1.4rem] h-[1.4rem] px-1.5 rounded-full bg-amber-400 text-[#1F3A4B] text-[11px] font-extrabold flex items-center justify-center" aria-label={`${count} need attention`}>{count}</span>}
    </button>
  );
}

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();

  const rawTab = params.get('tab');
  const tab = TAB_KEYS.includes(rawTab) ? rawTab : 'overview';
  const current = TABS.find((t) => t.key === tab);
  const filter = Object.prototype.hasOwnProperty.call(FILTERS, params.get('filter') ?? '') ? (params.get('filter') ?? '') : '';

  // Each tab is a real history entry, so the browser's Back button moves between tabs.
  const go = useCallback((key, extra = {}) => {
    setParams(key === 'overview' ? {} : { tab: key, ...extra });
  }, [setParams]);
  const setFilter = (f) => setParams(f ? { tab: 'payments', filter: f } : { tab: 'payments' }, { replace: true });

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const loadStats = useCallback(() => {
    api.get('/admin/overview')
      .then(({ data }) => { setStats(data.data); setStatsError(null); })
      .catch((e) => {
        if (e.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; return; }
        setStatsError(errMsg(e, 'Could not load the overview.'));
      });
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [tab]);

  const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] text-[#1F3A4B] dark:text-[#FAFDEE] font-roboto-slab antialiased">
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#1F3A4B', color: '#FAFDEE', borderRadius: '20px' } }} />

      {/* Top bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-[#1F3A4B]/10 dark:border-white/10 bg-white/85 dark:bg-[#0a111a]/85 backdrop-blur-xl">
        <div className="h-full px-4 md:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" aria-label="HealthHub home" className="font-sans font-extrabold italic uppercase tracking-tighter text-2xl leading-none">
              HEALT<span className="text-emerald-600 dark:text-[#C2F84F]">HUB</span>
            </Link>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] text-[11px] font-bold uppercase tracking-widest">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme"
              className="h-10 w-10 rounded-full flex items-center justify-center bg-[#1F3A4B]/5 dark:bg-white/10 hover:scale-105 active:scale-95 transition-all">
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link to="/" title="Go to the website"
              className="h-10 px-3 sm:px-4 rounded-full inline-flex items-center gap-2 bg-[#1F3A4B]/5 dark:bg-white/10 text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
              <Home size={16} /><span className="hidden sm:inline">Website</span>
            </Link>
            <button type="button" onClick={logout} title="Log out"
              className="h-10 px-3 sm:px-4 rounded-full inline-flex items-center gap-2 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
              <LogOut size={16} /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r border-[#1F3A4B]/10 dark:border-white/10 p-4 overflow-y-auto">
          <nav aria-label="Admin sections" className="space-y-1.5">
            {TABS.map((t) => <NavButton key={t.key} t={t} active={tab === t.key} count={badgeFor(t.key, stats)} onSelect={go} />)}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {/* Tabs (mobile / tablet) */}
          <nav aria-label="Admin sections" className="lg:hidden sticky top-16 z-30 bg-[#FAFDEE]/95 dark:bg-[#0a111a]/95 backdrop-blur border-b border-[#1F3A4B]/10 dark:border-white/10 px-4 py-2 flex gap-2 overflow-x-auto">
            {TABS.map((t) => <NavButton key={t.key} t={t} mobile active={tab === t.key} count={badgeFor(t.key, stats)} onSelect={go} />)}
          </nav>

          <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl">
            {/* Breadcrumb + back */}
            <div className="flex items-center justify-between gap-3 mb-5 min-h-[2.25rem]">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Admin <ChevronRight size={12} className="inline -mt-0.5" /> {current.label}</p>
              {tab !== 'overview' && (
                <button type="button" onClick={() => go('overview')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1F3A4B]/5 dark:bg-white/10 text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                  <ArrowLeft size={14} /> Back to overview
                </button>
              )}
            </div>

            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold font-sans tracking-tight">{current.title}</h1>
                <p className="mt-1 text-sm font-semibold opacity-60 max-w-2xl">{current.blurb}</p>
              </div>
              <button type="button" onClick={loadStats} aria-label="Refresh counts" title="Refresh counts"
                className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-[#1F3A4B]/5 dark:bg-white/10 hover:scale-105 active:scale-95 transition-all">
                <RefreshCw size={16} />
              </button>
            </div>

            {tab === 'overview' && <Overview stats={stats} error={statsError} onRetry={loadStats} go={go} />}
            {tab === 'doctors'  && <Doctors onChanged={loadStats} />}
            {tab === 'payments' && <Payments filter={filter} setFilter={setFilter} onChanged={loadStats} />}
            {tab === 'disputes' && <Payments disputes onChanged={loadStats} />}
            {tab === 'webhooks' && <Webhooks />}
          </div>
        </main>
      </div>
    </div>
  );
}