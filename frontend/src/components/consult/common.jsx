import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft, X } from 'lucide-react';
import { API_URL } from '../../config/api';

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('userToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const errMsg = (e, fallback = 'Something went wrong') => e?.response?.data?.message || fallback;

export const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

export const STATUS = {
  PENDING_DOCTOR_APPROVAL:          { label: 'Awaiting doctor',    tone: 'amber' },
  DOCTOR_ACCEPTED_AWAITING_PAYMENT: { label: 'Awaiting payment',   tone: 'amber' },
  PAID_CONFIRMED:                   { label: 'Confirmed',          tone: 'green' },
  COMPLETED:                        { label: 'Completed',          tone: 'blue'  },
  DOCTOR_REJECTED:                  { label: 'Declined',           tone: 'red'   },
  PAID_CANCELLED:                   { label: 'Cancelled · refunded', tone: 'red' },
  PAYMENT_EXPIRED:                  { label: 'Payment expired',    tone: 'gray'  },
  REQUEST_EXPIRED:                  { label: 'No response',        tone: 'gray'  },
  ABORTED_BY_DOCTOR:                { label: 'Expired',            tone: 'gray'  },
};

const TONES = {
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  blue:  'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300',
  red:   'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300',
  gray:  'bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300',
};

export const Pill = ({ tone = 'gray', children }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest ${TONES[tone]}`}>{children}</span>
);

export const StatusPill = ({ status }) => {
  const s = STATUS[status] || { label: status, tone: 'gray' };
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

const BTN = {
  primary: 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B]',
  ghost:   'bg-neutral-200/60 text-[#1F3A4B] dark:bg-white/10 dark:text-[#FAFDEE]',
  danger:  'bg-rose-500 text-white',
  ok:      'bg-emerald-600 text-white',
};

export const Btn = ({ variant = 'primary', className = '', ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${BTN[variant]} ${className}`}
  />
);

export const Card = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-white/5 border-2 border-[#1F3A4B]/5 dark:border-white/5 rounded-[1.5rem] p-5 sm:p-6 ${className}`}>{children}</div>
);

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl border-2 border-[#1F3A4B]/10 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold outline-none focus:border-[#C2F84F]';

export const Label = ({ children }) => (
  <label className="block text-[11px] font-bold uppercase tracking-widest opacity-70 mb-1.5">{children}</label>
);

export function PageShell({ title, subtitle, children, wide = false }) {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const home = role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/patient';
  return (
    <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] text-[#1F3A4B] dark:text-[#FAFDEE] font-roboto-slab relative overflow-x-hidden pt-24 pb-24 px-4 md:px-6 antialiased">
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#1F3A4B', color: '#FAFDEE', borderRadius: '20px' } }} />
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>
      <button
        onClick={() => navigate(home)}
        className="absolute top-6 left-4 md:top-8 md:left-8 z-20 flex items-center gap-3 h-12 w-12 md:h-auto md:w-auto md:px-6 md:py-3.5 justify-center rounded-full border border-neutral-200/40 dark:border-white/5 bg-white/40 dark:bg-neutral-950/20 backdrop-blur-md text-sm font-bold tracking-widest uppercase hover:text-emerald-600 dark:hover:text-[#C2F84F]"
      >
        <ArrowLeft size={18} />
        <span className="hidden md:inline">DASHBOARD</span>
      </button>
      <div className={`${wide ? 'max-w-6xl' : 'max-w-4xl'} mx-auto relative z-10 mt-6 md:mt-10`}>
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-6xl font-extrabold italic tracking-tighter uppercase leading-none font-sans">{title}</h1>
          {subtitle && <p className="mt-3 text-xs sm:text-sm font-bold uppercase tracking-widest opacity-70">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto bg-[#FAFDEE] dark:bg-[#12202b] text-[#1F3A4B] dark:text-[#FAFDEE] rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-[#1F3A4B]/10 dark:border-white/10`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 className="text-xl sm:text-2xl font-extrabold italic uppercase tracking-tight font-sans">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Opens a protected file (prescription PDF, health record) in a new tab. The Authorization header
// can't be sent by a plain link, so it is fetched as a blob first.
export async function openProtectedFile(path) {
  const win = window.open('', '_blank');           // opened inside the click so popup blockers allow it
  try {
    const res = await api.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    if (win) win.location.href = url; else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  } catch (e) {
    if (win) win.close();
    let msg = 'Could not open the file.';
    try { msg = JSON.parse(await e.response.data.text()).message || msg; } catch { /* keep default */ }
    toast.error(msg);
  }
}

export { toast };