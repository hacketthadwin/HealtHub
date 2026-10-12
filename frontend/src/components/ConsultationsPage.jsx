import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { RefreshCw, Star, FileText, Video, Sparkles, ShieldAlert, FolderOpen, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import {
  api, errMsg, inr, fmtDate, fmtDateTime, PageShell, Modal, Card, Btn, Pill, StatusPill,
  inputCls, Label, openProtectedFile, toast,
} from './consult/common';

const UPCOMING = new Set(['PENDING_DOCTOR_APPROVAL', 'DOCTOR_ACCEPTED_AWAITING_PAYMENT', 'PAID_CONFIRMED']);
const SUMMARY_OK = new Set(['PENDING_DOCTOR_APPROVAL', 'DOCTOR_ACCEPTED_AWAITING_PAYMENT', 'PAID_CONFIRMED', 'COMPLETED']);

// ── Cancel / reason modal ────────────────────────────────────────────────────
function ReasonModal({ title, intro, confirmLabel, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <p className="text-sm font-semibold opacity-80 mb-4">{intro}</p>
      <Label>Reason (optional)</Label>
      <textarea className={`${inputCls} min-h-[90px]`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex justify-end gap-3 mt-5">
        <Btn variant="ghost" onClick={onClose} disabled={busy}>Keep appointment</Btn>
        <Btn variant="danger" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(reason); setBusy(false); }}>
          {busy ? 'Working…' : confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Review modal (patient) ───────────────────────────────────────────────────
function ReviewModal({ row, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!rating) return toast.error('Choose a star rating.');
    setBusy(true);
    try {
      await api.post('/reviews', { bookingRequestId: row._id, rating, comment: comment.trim() });
      toast.success('Thanks for your review!');
      onDone();
    } catch (e) { toast.error(errMsg(e, 'Could not save your review.')); }
    setBusy(false);
  };
  return (
    <Modal title={`Rate Dr. ${row.counterpart?.name || ''}`} onClose={onClose}>
      <div className="flex gap-2 mb-5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
            <Star size={34} className={n <= rating ? 'fill-[#C2F84F] text-[#1F3A4B] dark:text-[#C2F84F]' : 'opacity-30'} />
          </button>
        ))}
      </div>
      <Label>Comment (optional)</Label>
      <textarea className={`${inputCls} min-h-[100px]`} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex justify-end gap-3 mt-5">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Submit review'}</Btn>
      </div>
    </Modal>
  );
}

// ── Prescription modal (doctor) ──────────────────────────────────────────────
const emptyMed = () => ({ name: '', dosage: '', frequency: '', duration: '', instructions: '' });

function PrescriptionModal({ row, onClose, onDone }) {
  const [f, setF] = useState({ diagnosis: '', advice: '', notes: '', followUpDate: '' });
  const [meds, setMeds] = useState([emptyMed()]);
  const [busy, setBusy] = useState(false);
  const setMed = (i, k, v) => setMeds((m) => m.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const submit = async () => {
    const medications = meds.filter((m) => m.name.trim()).map((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.trim()])));
    if (!f.diagnosis.trim() && !f.advice.trim() && !f.notes.trim() && medications.length === 0) {
      return toast.error('Add a diagnosis, medication, advice or note.');
    }
    setBusy(true);
    try {
      await api.post('/prescriptions', {
        bookingRequestId: row._id,
        diagnosis: f.diagnosis.trim(), advice: f.advice.trim(), notes: f.notes.trim(),
        followUpDate: f.followUpDate || null,
        medications,
      });
      toast.success('Prescription issued.');
      onDone();
    } catch (e) { toast.error(errMsg(e, 'Could not issue the prescription.')); }
    setBusy(false);
  };

  return (
    <Modal title={`Prescription · ${row.counterpart?.name || 'Patient'}`} onClose={() => !busy && onClose()} wide>
      <div className="space-y-4">
        <div><Label>Diagnosis</Label><input className={inputCls} maxLength={500} value={f.diagnosis} onChange={(e) => setF({ ...f, diagnosis: e.target.value })} /></div>

        <div>
          <Label>Medication</Label>
          <div className="space-y-3">
            {meds.map((m, i) => (
              <div key={i} className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2">
                <div className="flex gap-2">
                  <input className={inputCls} placeholder="Medicine name" maxLength={100} value={m.name} onChange={(e) => setMed(i, 'name', e.target.value)} />
                  {meds.length > 1 && (
                    <button type="button" aria-label="Remove medicine" onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="px-3 rounded-xl hover:bg-rose-500/10 text-rose-500"><Trash2 size={16} /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input className={inputCls} placeholder="Dosage (e.g. 500 mg)" maxLength={100} value={m.dosage} onChange={(e) => setMed(i, 'dosage', e.target.value)} />
                  <input className={inputCls} placeholder="Frequency (e.g. twice daily)" maxLength={100} value={m.frequency} onChange={(e) => setMed(i, 'frequency', e.target.value)} />
                  <input className={inputCls} placeholder="Duration (e.g. 5 days)" maxLength={100} value={m.duration} onChange={(e) => setMed(i, 'duration', e.target.value)} />
                </div>
                <input className={inputCls} placeholder="Instructions (e.g. after food)" maxLength={300} value={m.instructions} onChange={(e) => setMed(i, 'instructions', e.target.value)} />
              </div>
            ))}
          </div>
          {meds.length < 20 && (
            <button type="button" onClick={() => setMeds([...meds, emptyMed()])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-[#C2F84F]">
              <Plus size={14} /> Add medicine
            </button>
          )}
        </div>

        <div><Label>Advice</Label><textarea className={`${inputCls} min-h-[70px]`} maxLength={2000} value={f.advice} onChange={(e) => setF({ ...f, advice: e.target.value })} /></div>
        <div><Label>Notes</Label><textarea className={`${inputCls} min-h-[70px]`} maxLength={5000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="max-w-xs"><Label>Follow-up date (optional)</Label><input type="date" className={inputCls} min={new Date().toISOString().slice(0, 10)} value={f.followUpDate} onChange={(e) => setF({ ...f, followUpDate: e.target.value })} /></div>
      </div>
      <p className="text-xs font-semibold opacity-60 mt-4">A prescription cannot be edited after it is issued. It will carry your registration number.</p>
      <div className="flex justify-end gap-3 mt-5">
        <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn onClick={submit} disabled={busy}>{busy ? 'Issuing…' : 'Issue prescription'}</Btn>
      </div>
    </Modal>
  );
}

// ── AI intake summary (doctor) ───────────────────────────────────────────────
function SummaryModal({ row, onClose }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const run = useCallback(async (force) => {
    setState({ loading: true, data: null, error: null });
    try {
      const { data } = await api.post('/ai/intake-summary', { bookingRequestId: row._id, force: !!force });
      setState({ loading: false, data: data.data, error: null });
    } catch (e) { setState({ loading: false, data: null, error: errMsg(e, 'Could not generate a summary.') }); }
  }, [row._id]);
  useEffect(() => { run(false); }, [run]);

  const d = state.data;
  return (
    <Modal title="AI intake summary" onClose={onClose} wide>
      {state.loading && <p className="text-sm font-bold uppercase tracking-widest opacity-60">Preparing summary…</p>}
      {state.error && <p className="text-sm font-bold text-rose-600">{state.error}</p>}
      {d && (
        <>
          {d.redFlags?.length > 0 && (
            <div className="flex gap-3 p-4 mb-4 rounded-2xl bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300">
              <ShieldAlert size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">Possible red flags in the patient's own words: {d.redFlags.join(', ')}. Review before the consultation.</p>
            </div>
          )}
          <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-relaxed p-4 rounded-2xl bg-black/5 dark:bg-white/5">{d.summary}</pre>
          <p className="text-xs font-semibold opacity-60 mt-3">
            AI-generated from the patient's request{d.usedProfile ? ' and the health profile they allowed it to use' : ''}. It is not a diagnosis — confirm everything with the patient.
          </p>
          <div className="flex justify-end mt-4"><Btn variant="ghost" onClick={() => run(true)}>Regenerate</Btn></div>
        </>
      )}
    </Modal>
  );
}

// ── Patient info shared with the doctor ──────────────────────────────────────
const ListLine = ({ label, items }) => (
  <p className="text-sm"><span className="font-bold uppercase text-[11px] tracking-widest opacity-60">{label}: </span>
    <span className="font-semibold">{items?.length ? items.join(', ') : 'None listed'}</span></p>
);

function PatientInfoModal({ row, onClose }) {
  const [state, setState] = useState({ loading: true, profile: null, records: [], error: null });
  useEffect(() => {
    let alive = true;
    Promise.all([api.get(`/profile/health/booking/${row._id}`), api.get(`/records/shared/${row._id}`)])
      .then(([p, r]) => alive && setState({ loading: false, profile: p.data.data, records: r.data.data, error: null }))
      .catch((e) => alive && setState({ loading: false, profile: null, records: [], error: errMsg(e) }));
    return () => { alive = false; };
  }, [row._id]);
  const { profile: p } = state;

  return (
    <Modal title={`${row.counterpart?.name || 'Patient'} · health info`} onClose={onClose} wide>
      {state.loading && <p className="text-sm font-bold uppercase tracking-widest opacity-60">Loading…</p>}
      {state.error && <p className="text-sm font-bold text-rose-600">{state.error}</p>}
      {!state.loading && !state.error && (
        <div className="space-y-5">
          {p ? (
            <div className="space-y-1.5 p-4 rounded-2xl bg-black/5 dark:bg-white/5">
              <p className="text-sm font-semibold">
                {[p.sex, p.dateOfBirth && `Born ${fmtDate(p.dateOfBirth)}`, p.bloodGroup && `Blood group ${p.bloodGroup}`, p.heightCm && `${p.heightCm} cm`, p.weightKg && `${p.weightKg} kg`].filter(Boolean).join(' · ') || 'No basic details'}
              </p>
              <ListLine label="Allergies" items={p.allergies} />
              <ListLine label="Conditions" items={p.chronicConditions} />
              <ListLine label="Current medicines" items={p.currentMedications} />
              <ListLine label="Past surgeries" items={p.pastSurgeries} />
              {p.emergencyContact?.name && <p className="text-sm font-semibold">Emergency contact: {p.emergencyContact.name} {p.emergencyContact.phone}</p>}
            </div>
          ) : <p className="text-sm font-semibold opacity-70">The patient has not shared a health profile.</p>}

          <div>
            <Label>Records shared for this consultation</Label>
            {state.records.length === 0 && <p className="text-sm font-semibold opacity-70">Nothing shared yet.</p>}
            <div className="space-y-2">
              {state.records.map((r) => (
                <div key={r._id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                  <div className="min-w-0"><p className="text-sm font-bold truncate">{r.title}</p><p className="text-xs opacity-60 uppercase tracking-widest">{r.category.replace('_', ' ')}</p></div>
                  <Btn variant="ghost" onClick={() => openProtectedFile(`/records/${r._id}/file`)}>Open</Btn>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Share records with a consultation (patient) ─────────────────────────────
function ShareModal({ row, onClose }) {
  const [records, setRecords] = useState(null);
  useEffect(() => { api.get('/records').then(({ data }) => setRecords(data.data)).catch((e) => { toast.error(errMsg(e)); setRecords([]); }); }, []);

  const toggle = async (rec, on) => {
    try {
      const { data } = on
        ? await api.post(`/records/${rec._id}/share`, { bookingRequestId: row._id })
        : await api.delete(`/records/${rec._id}/share/${row._id}`);
      setRecords((rs) => rs.map((r) => (r._id === rec._id ? data.data : r)));
    } catch (e) { toast.error(errMsg(e, 'Could not update sharing.')); }
  };

  return (
    <Modal title="Share records with your doctor" onClose={onClose} wide>
      <p className="text-sm font-semibold opacity-80 mb-4">Dr. {row.counterpart?.name} can open only the records you tick, for this consultation. Untick any time to stop sharing.</p>
      {records === null && <p className="text-sm font-bold uppercase tracking-widest opacity-60">Loading…</p>}
      {records && records.length === 0 && (
        <p className="text-sm font-semibold">You have no records yet. <Link to="/health-profile" className="underline font-bold">Add some in your health profile</Link>.</p>
      )}
      <div className="space-y-2">
        {records?.map((r) => (
          <label key={r._id} className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={r.sharedWith.includes(row._id)} onChange={(e) => toggle(r, e.target.checked)} />
            <span className="min-w-0"><span className="block text-sm font-bold truncate">{r.title}</span><span className="block text-xs opacity-60 uppercase tracking-widest">{r.category.replace('_', ' ')} · {fmtDate(r.createdAt)}</span></span>
          </label>
        ))}
      </div>
      <div className="flex justify-end mt-5"><Btn onClick={onClose}>Done</Btn></div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
function ConsultationsContent() {
  const role = localStorage.getItem('role');
  const isDoctor = role === 'doctor';
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ freeCancelHours: 24 });
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [modal, setModal] = useState(null);           // { type, row }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([api.get('/consultations'), isDoctor ? api.get('/me') : Promise.resolve(null)]);
      setRows(c.data.data); setMeta(c.data.meta || {}); setMe(m?.data?.data || null);
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login'); return; }
      toast.error(errMsg(e, 'Could not load consultations.'));
    }
    setLoading(false);
  }, [isDoctor, navigate]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => rows.filter((r) => (tab === 'upcoming' ? UPCOMING.has(r.status) : !UPCOMING.has(r.status))), [rows, tab]);
  const close = () => setModal(null);
  const done = () => { setModal(null); load(); };

  const complete = async (row) => {
    if (!window.confirm('Mark this consultation as completed? This starts your payout and lets the patient review you.')) return;
    try { await api.patch(`/booking-requests/${row._id}/complete`); toast.success('Marked as completed.'); load(); }
    catch (e) { toast.error(errMsg(e, 'Could not mark as completed.')); }
  };

  const cancelPaid = async (row, reason) => {
    try {
      await api.patch(`/booking-requests/${row._id}/${isDoctor ? 'doctor-cancel' : 'cancel-paid'}`, { reason });
      toast.success('Cancelled. A full refund has been issued.');
      done();
    } catch (e) { toast.error(errMsg(e, 'Could not cancel.')); }
  };

  const verification = isDoctor && me && me.verificationStatus !== 'approved' ? me : null;

  return (
    <PageShell title="CONSULTATIONS" subtitle={isDoctor ? 'Complete, prescribe and manage your paid consultations' : 'Your appointments, prescriptions and reviews'} wide>
      {verification && (
        <div className="flex gap-3 p-5 mb-6 rounded-[1.5rem] border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="text-amber-500 shrink-0" size={22} />
          <div>
            <p className="font-extrabold text-sm uppercase tracking-wide text-amber-800 dark:text-amber-300">
              {verification.verificationStatus === 'rejected' ? 'Registration could not be verified' : 'Registration verification pending'}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mt-1">
              {verification.verificationStatus === 'rejected'
                ? `${verification.verificationNote || 'Please contact support.'}`
                : 'Patients can find you and you can act on bookings once an admin approves your registration.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex gap-2">
          {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${tab === k ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B]' : 'bg-neutral-200/60 dark:bg-white/10'}`}>
              {label}
            </button>
          ))}
        </div>
        <Btn variant="ghost" onClick={load} disabled={loading}><RefreshCw size={14} className={`inline mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Btn>
      </div>

      {loading && rows.length === 0 && <p className="text-center text-sm font-bold uppercase tracking-widest opacity-60 py-12">Loading…</p>}
      {!loading && shown.length === 0 && <Card><p className="text-center text-sm font-bold uppercase tracking-widest opacity-60 py-6">Nothing here yet</p></Card>}

      <div className="space-y-4">
        {shown.map((r) => {
          const name = r.counterpart?.name ? `${isDoctor ? '' : 'Dr. '}${r.counterpart.name}` : '—';
          return (
            <Card key={r._id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-extrabold font-sans truncate">{name}</p>
                  {!isDoctor && r.counterpart?.specialization && <p className="text-xs font-bold uppercase tracking-widest opacity-60">{r.counterpart.specialization}</p>}
                </div>
                <StatusPill status={r.status} />
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm font-semibold">
                <p><span className="opacity-60 uppercase text-[11px] tracking-widest font-bold">When </span>{r.scheduledDate ? `${fmtDate(r.scheduledDate)} · ${r.scheduledTime || ''}` : 'Not scheduled'}</p>
                <p><span className="opacity-60 uppercase text-[11px] tracking-widest font-bold">Fee </span>{inr(r.feeRupees)}</p>
                <p><span className="opacity-60 uppercase text-[11px] tracking-widest font-bold">Requested </span>{fmtDateTime(r.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm font-semibold opacity-80 line-clamp-2">“{r.reason}”</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === 'PAID_CANCELLED' && <Pill tone="red">Refund {r.refundStatus === 'processed' ? 'processed' : 'initiated'}</Pill>}
                {isDoctor && r.payoutStatus === 'PENDING' && <Pill tone="amber">Payout pending · {inr(r.doctorPayoutRupees)}</Pill>}
                {isDoctor && r.payoutStatus === 'PAID' && <Pill tone="green">Paid out · {inr(r.doctorPayoutRupees)}</Pill>}
                {isDoctor && r.payoutStatus === 'FAILED' && <Pill tone="red">Payout failed — admin will retry</Pill>}
                {!isDoctor && r.reviewRating != null && <Pill tone="blue">You rated {r.reviewRating}★</Pill>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {r.meetLink && (
                  <a href={r.meetLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-600 text-white">
                    <Video size={14} /> Join call
                  </a>
                )}

                {isDoctor && r.canComplete && <Btn variant="ok" onClick={() => complete(r)}>Mark completed</Btn>}
                {isDoctor && r.canPrescribe && <Btn onClick={() => setModal({ type: 'rx', row: r })}>Write prescription</Btn>}
                {isDoctor && SUMMARY_OK.has(r.status) && <Btn variant="ghost" onClick={() => setModal({ type: 'summary', row: r })}><Sparkles size={13} className="inline mr-1.5" />AI summary</Btn>}
                {isDoctor && ['PAID_CONFIRMED', 'COMPLETED'].includes(r.status) && <Btn variant="ghost" onClick={() => setModal({ type: 'info', row: r })}><FolderOpen size={13} className="inline mr-1.5" />Patient info</Btn>}
                {isDoctor && r.canCancel && <Btn variant="danger" onClick={() => setModal({ type: 'cancel', row: r })}>Cancel &amp; refund</Btn>}

                {!isDoctor && r.canShareRecords && <Btn variant="ghost" onClick={() => setModal({ type: 'share', row: r })}><FolderOpen size={13} className="inline mr-1.5" />Share records</Btn>}
                {!isDoctor && r.canReview && <Btn onClick={() => setModal({ type: 'review', row: r })}><Star size={13} className="inline mr-1.5" />Rate doctor</Btn>}
                {!isDoctor && r.canCancel && <Btn variant="danger" onClick={() => setModal({ type: 'cancel', row: r })}>Cancel &amp; refund</Btn>}

                {r.prescriptionId && (
                  <Btn variant="ghost" onClick={() => openProtectedFile(`/prescriptions/${r.prescriptionId}/pdf`)}>
                    <FileText size={13} className="inline mr-1.5" />Prescription PDF
                  </Btn>
                )}
              </div>

              {!isDoctor && r.status === 'PAID_CONFIRMED' && !r.canCancel && (
                <p className="mt-3 text-xs font-semibold opacity-60">Free cancellation closed {meta.freeCancelHours} hours before the appointment. Contact support if you need help.</p>
              )}
              {!isDoctor && r.status === 'DOCTOR_ACCEPTED_AWAITING_PAYMENT' && (
                <p className="mt-3 text-xs font-semibold opacity-70">The doctor accepted your request. Pay from your <Link to="/patient" className="underline font-bold">dashboard</Link> to confirm the slot.</p>
              )}
            </Card>
          );
        })}
      </div>

      {modal?.type === 'rx' && <PrescriptionModal row={modal.row} onClose={close} onDone={done} />}
      {modal?.type === 'summary' && <SummaryModal row={modal.row} onClose={close} />}
      {modal?.type === 'info' && <PatientInfoModal row={modal.row} onClose={close} />}
      {modal?.type === 'share' && <ShareModal row={modal.row} onClose={() => { close(); load(); }} />}
      {modal?.type === 'review' && <ReviewModal row={modal.row} onClose={close} onDone={done} />}
      {modal?.type === 'cancel' && (
        <ReasonModal
          title="Cancel & refund"
          intro={isDoctor
            ? 'The patient is refunded in full and the slot is released. They are notified by email.'
            : `You will get a full refund to your original payment method (usually 5–7 working days). Free until ${meta.freeCancelHours} hours before the appointment.`}
          confirmLabel="Cancel & refund"
          onClose={close}
          onConfirm={(reason) => cancelPaid(modal.row, reason)}
        />
      )}
    </PageShell>
  );
}

// Consultations belong to doctors and patients; an admin has no consultations, so send them to their own dashboard.
export default function ConsultationsPage() {
  if (localStorage.getItem('role') === 'admin') return <Navigate to="/admin" replace />;
  return <ConsultationsContent />;
}