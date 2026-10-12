import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Trash2, FileText, ShieldCheck } from 'lucide-react';
import {
  api, errMsg, fmtDate, PageShell, Card, Btn, Pill, inputCls, Label, openProtectedFile, toast,
} from './consult/common';

const CATEGORIES = [
  ['lab_report', 'Lab report'], ['imaging', 'Imaging / scan'], ['prescription', 'Prescription'],
  ['discharge_summary', 'Discharge summary'], ['other', 'Other'],
];

const toList = (text) =>
  [...new Set(String(text || '').split(/[\n,]/).map((s) => s.trim().slice(0, 100)).filter(Boolean))].slice(0, 50);
const fromList = (arr) => (arr || []).join(', ');
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const SectionTitle = ({ children, hint }) => (
  <div className="mb-4">
    <h2 className="text-xl font-extrabold italic uppercase tracking-tight font-sans">{children}</h2>
    {hint && <p className="text-xs font-semibold opacity-60 mt-1">{hint}</p>}
  </div>
);

export default function HealthProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);

  const [contact, setContact] = useState({ phone: '', notifyConsent: false });
  const [savingContact, setSavingContact] = useState(false);

  const [form, setForm] = useState({
    dateOfBirth: '', sex: '', bloodGroup: '', heightCm: '', weightKg: '',
    allergies: '', chronicConditions: '', currentMedications: '', pastSurgeries: '',
    emergencyName: '', emergencyPhone: '', allowAiSummary: false, consent: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [up, setUp] = useState({ title: '', category: 'lab_report', recordDate: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api.get('/profile/health'), api.get('/records')]);
      const d = p.data.data;
      setProfile(d);
      setContact(p.data.contact || { phone: '', notifyConsent: false });
      setRecords(r.data.data);
      if (d) {
        setForm({
          dateOfBirth: dateInput(d.dateOfBirth), sex: d.sex || '', bloodGroup: d.bloodGroup || '',
          heightCm: d.heightCm ?? '', weightKg: d.weightKg ?? '',
          allergies: fromList(d.allergies), chronicConditions: fromList(d.chronicConditions),
          currentMedications: fromList(d.currentMedications), pastSurgeries: fromList(d.pastSurgeries),
          emergencyName: d.emergencyContact?.name || '', emergencyPhone: d.emergencyContact?.phone || '',
          allowAiSummary: !!d.allowAiSummary, consent: true,
        });
      }
    } catch (e) { toast.error(errMsg(e, 'Could not load your health profile.')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const { data } = await api.patch('/profile/contact', { phone: contact.phone.trim(), notifyConsent: contact.notifyConsent });
      setContact(data.data);
      toast.success('Contact details saved.');
    } catch (e) { toast.error(errMsg(e, 'Could not save contact details.')); }
    setSavingContact(false);
  };

  const saveProfile = async () => {
    if (!form.consent) return toast.error('Please tick the consent box to save your health information.');
    setSavingProfile(true);
    try {
      const { data } = await api.put('/profile/health', {
        consent: true,
        allowAiSummary: form.allowAiSummary,
        dateOfBirth: form.dateOfBirth || null,
        sex: form.sex || null,
        bloodGroup: form.bloodGroup || null,
        heightCm: form.heightCm === '' ? null : Number(form.heightCm),
        weightKg: form.weightKg === '' ? null : Number(form.weightKg),
        allergies: toList(form.allergies),
        chronicConditions: toList(form.chronicConditions),
        currentMedications: toList(form.currentMedications),
        pastSurgeries: toList(form.pastSurgeries),
        emergencyContact: { name: form.emergencyName.trim(), phone: form.emergencyPhone.trim() },
      });
      setProfile(data.data);
      toast.success('Health profile saved.');
    } catch (e) { toast.error(errMsg(e, 'Could not save your health profile.')); }
    setSavingProfile(false);
  };

  const deleteProfile = async () => {
    if (!window.confirm('Delete your health profile? Doctors will no longer see it. Your uploaded records are kept.')) return;
    try {
      await api.delete('/profile/health');
      setProfile(null);
      setForm((f) => ({ ...f, consent: false, allowAiSummary: false }));
      toast.success('Health profile deleted.');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const upload = async () => {
    if (!file) return toast.error('Choose a PDF, JPG or PNG file.');
    if (!up.title.trim()) return toast.error('Give the record a title.');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', up.title.trim());
    fd.append('category', up.category);
    if (up.recordDate) fd.append('recordDate', up.recordDate);
    setUploading(true);
    try {
      const { data } = await api.post('/records', fd);
      setRecords((r) => [data.data, ...r]);
      setUp({ title: '', category: 'lab_report', recordDate: '' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Record uploaded.');
    } catch (e) { toast.error(errMsg(e, 'Upload failed.')); }
    setUploading(false);
  };

  const removeRecord = async (rec) => {
    if (!window.confirm(`Delete "${rec.title}" permanently?`)) return;
    try {
      await api.delete(`/records/${rec._id}`);
      setRecords((r) => r.filter((x) => x._id !== rec._id));
      toast.success('Record deleted.');
    } catch (e) { toast.error(errMsg(e, 'Could not delete the record.')); }
  };

  if (loading) {
    return <PageShell title="HEALTH PROFILE"><p className="text-center text-sm font-bold uppercase tracking-widest opacity-60 py-12">Loading…</p></PageShell>;
  }

  return (
    <PageShell title="HEALTH PROFILE" subtitle="Your details and records — shared with a doctor only when you choose">
      <div className="space-y-6">

        <Card>
          <SectionTitle hint="Used for appointment reminders. Messages are sent only if you tick the box.">Contact &amp; reminders</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div><Label>Mobile number</Label><input className={inputCls} inputMode="tel" placeholder="+91 98765 43210" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
            <label className="flex items-center gap-3 text-sm font-semibold cursor-pointer pb-2.5">
              <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={contact.notifyConsent} disabled={!contact.phone.trim()}
                onChange={(e) => setContact({ ...contact, notifyConsent: e.target.checked })} />
              Send me appointment reminders on SMS / WhatsApp
            </label>
          </div>
          <div className="flex justify-end mt-4"><Btn onClick={saveContact} disabled={savingContact}>{savingContact ? 'Saving…' : 'Save contact'}</Btn></div>
        </Card>

        <Card>
          <SectionTitle hint="Helps doctors treat you safely. Separate items with commas.">Health details</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="col-span-2"><Label>Date of birth</Label><input type="date" className={inputCls} max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div>
            <div><Label>Sex</Label>
              <select className={inputCls} value={form.sex} onChange={set('sex')}>
                <option value="">—</option>{['Female', 'Male', 'Other', 'Prefer not to say'].map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div><Label>Blood group</Label>
              <select className={inputCls} value={form.bloodGroup} onChange={set('bloodGroup')}>
                <option value="">—</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
              <div><Label>Height cm</Label><input type="number" min="30" max="260" className={inputCls} value={form.heightCm} onChange={set('heightCm')} /></div>
              <div><Label>Weight kg</Label><input type="number" min="1" max="500" className={inputCls} value={form.weightKg} onChange={set('weightKg')} /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div><Label>Allergies</Label><textarea className={`${inputCls} min-h-[70px]`} placeholder="e.g. penicillin, peanuts" value={form.allergies} onChange={set('allergies')} /></div>
            <div><Label>Long-term conditions</Label><textarea className={`${inputCls} min-h-[70px]`} placeholder="e.g. asthma, hypertension" value={form.chronicConditions} onChange={set('chronicConditions')} /></div>
            <div><Label>Current medicines</Label><textarea className={`${inputCls} min-h-[70px]`} value={form.currentMedications} onChange={set('currentMedications')} /></div>
            <div><Label>Past surgeries</Label><textarea className={`${inputCls} min-h-[70px]`} value={form.pastSurgeries} onChange={set('pastSurgeries')} /></div>
            <div><Label>Emergency contact name</Label><input className={inputCls} maxLength={100} value={form.emergencyName} onChange={set('emergencyName')} /></div>
            <div><Label>Emergency contact phone</Label><input className={inputCls} maxLength={20} inputMode="tel" value={form.emergencyPhone} onChange={set('emergencyPhone')} /></div>
          </div>

          <div className="mt-5 p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-3">
            <label className="flex items-start gap-3 text-sm font-semibold cursor-pointer">
              <input type="checkbox" className="h-4 w-4 mt-0.5 accent-emerald-600" checked={form.consent} onChange={set('consent')} />
              <span>I consent to HealthHub storing this health information and showing it to doctors I book a consultation with, for that consultation. I can edit or delete it at any time.</span>
            </label>
            <label className="flex items-start gap-3 text-sm font-semibold cursor-pointer">
              <input type="checkbox" className="h-4 w-4 mt-0.5 accent-emerald-600" checked={form.allowAiSummary} onChange={set('allowAiSummary')} />
              <span>Optional: let an AI assistant use this profile to prepare a short summary for my doctor. (Without this, the summary uses only the reason I write in my request.)</span>
            </label>
          </div>

          <div className="flex flex-wrap justify-between gap-3 mt-4">
            {profile ? <Btn variant="ghost" onClick={deleteProfile}>Delete profile</Btn> : <span />}
            <Btn onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : profile ? 'Update profile' : 'Save profile'}</Btn>
          </div>
        </Card>

        <Card>
          <SectionTitle hint="PDF, JPG or PNG up to 10 MB. Stored privately — only you, and a doctor you share a record with, can open it.">Medical records</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2"><Label>Title</Label><input className={inputCls} maxLength={150} placeholder="e.g. Blood test — March" value={up.title} onChange={(e) => setUp({ ...up, title: e.target.value })} /></div>
            <div><Label>Type</Label>
              <select className={inputCls} value={up.category} onChange={(e) => setUp({ ...up, category: e.target.value })}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><Label>Record date</Label><input type="date" className={inputCls} max={new Date().toISOString().slice(0, 10)} value={up.recordDate} onChange={(e) => setUp({ ...up, recordDate: e.target.value })} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm font-semibold" />
            <Btn onClick={upload} disabled={uploading}><Upload size={13} className="inline mr-1.5" />{uploading ? 'Uploading…' : 'Upload'}</Btn>
          </div>

          <div className="mt-6 space-y-2">
            {records.length === 0 && <p className="text-sm font-semibold opacity-60">No records yet.</p>}
            {records.map((r) => (
              <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} className="shrink-0 opacity-60" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{r.title}</p>
                    <p className="text-xs opacity-60 uppercase tracking-widest">
                      {r.category.replace('_', ' ')} · {fmtDate(r.recordDate || r.createdAt)} · {(r.bytes / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.sharedWith.length > 0 && <Pill tone="blue"><ShieldCheck size={11} className="inline mr-1" />Shared · {r.sharedWith.length}</Pill>}
                  <Btn variant="ghost" onClick={() => openProtectedFile(`/records/${r._id}/file`)}>Open</Btn>
                  <button onClick={() => removeRecord(r)} aria-label={`Delete ${r.title}`} className="p-2 rounded-full text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold opacity-60 mt-4">To let a doctor see a record, open <strong>Consultations</strong> and choose “Share records” on the appointment.</p>
        </Card>
      </div>
    </PageShell>
  );
}