import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, Video, User, Clock, AlertCircle,
  Activity, ArrowRight, IndianRupee, X, CheckCircle, Ban,
  Hourglass, CreditCard, TriangleAlert, AlertTriangle,
} from 'lucide-react';
import { API_URL } from '../../config/api';


// ─── Status display metadata ─────────────────────────────────────────────────
const STATUS_META = {
  PENDING_DOCTOR_APPROVAL: {
    label: 'Awaiting Doctor',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon:  Hourglass,
  },
  DOCTOR_ACCEPTED_AWAITING_PAYMENT: {
    label: 'Pay to Confirm',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    icon:  CreditCard,
  },
  PAID_CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon:  CheckCircle,
  },
  DOCTOR_REJECTED: {
    label: 'Declined',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon:  Ban,
  },
  PATIENT_CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    icon:  X,
  },
  PAYMENT_EXPIRED: {
    label: 'Payment Expired',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon:  TriangleAlert,
  },
  ABORTED_BY_DOCTOR: {
    label: 'Expired — Not Attended',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon:  AlertTriangle,
  },
};

const formatDate = (isoString) => {
  if (!isoString) return 'Date TBD';
  const d = new Date(isoString);
  return isNaN(d) ? 'Date TBD' : d.toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script    = document.createElement('script');
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload   = () => resolve(true);
    script.onerror  = () => resolve(false);
    document.body.appendChild(script);
  });

// localStorage key for dismissed expired appointment IDs
const LS_KEY = 'hh_dismissed_expired';

// ─── Component ───────────────────────────────────────────────────────────────
function CurrentAppointments({ refreshTrigger = 0 }) {
  const [requests,     setRequests]     = useState([]);
  const [meta,         setMeta]         = useState({ activeCount: 0, maxAllowed: 5 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [payingId,     setPayingId]     = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const intervalRef = useRef(null);

  // ── [NEW] IDs of expired appointments the patient has already dismissed ──
  // Lazy-initialised from localStorage so dismissed cards survive a page reload.
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // ── [NEW] Derived list — raw requests minus locally-dismissed expired ones ─
  const visibleRequests = useMemo(
    () => requests.filter(
      (r) => !(r.status === 'ABORTED_BY_DOCTOR' && dismissedIds.includes(r.id))
    ),
    [requests, dismissedIds]
  );

  // ── [NEW] Keep currentIndex in bounds whenever visible list shrinks ────────
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, visibleRequests.length - 1)));
  }, [visibleRequests.length]);

  // ── [NEW] Dismiss handler — persists to localStorage, no API call needed ──
  const handleDismiss = useCallback((id) => {
    setDismissedIds((prev) => {
      if (prev.includes(id)) return prev;          // already dismissed — no-op
      const updated = [...prev, id];
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
      } catch { /* storage quota hit — state still updates */ }
      return updated;
    });
  }, []);

  const fetchRequests = useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) { setError(new Error('Authentication required')); setLoading(false); return; }

    try {
      setError(null);
      const { data } = await axios.get(
        `${API_URL}/api/v1/booking-requests/my-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const formatted = (data.data || []).map((r) => ({
        id:              r._id,
        status:          r.status,
        doctorName:      r.doctorId?.name || 'Doctor',
        reason:          r.reason || '',
        feeRupees:       r.consultingFeePaise / 100,
        meetLink:        r.meetLink || null,
        scheduledDate:   r.proposedByDoctor?.scheduledDate || null,
        scheduledTime:   r.proposedByDoctor?.scheduledTime || null,
        paymentDeadline: r.paymentDeadline || null,
        createdAt:       r.createdAt,
        abortedAt:       r.abortedAt   || null,
        abortReason:     r.abortReason || null,
      }));

      setRequests(formatted);
      setMeta(data.meta || { activeCount: 0, maxAllowed: 5 });
      // clamp index against full list; visibleRequests effect will re-clamp if needed
      setCurrentIndex((prev) => Math.min(prev, Math.max(0, formatted.length - 1)));
    } catch (e) {
      console.error('Error fetching booking requests:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    intervalRef.current = setInterval(fetchRequests, 5 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchRequests]);

  useEffect(() => {
    if (refreshTrigger > 0) fetchRequests();
  }, [refreshTrigger, fetchRequests]);

  // ── Pay now ───────────────────────────────────────────────────────────────
  const handlePayNow = async (request) => {
    const token = localStorage.getItem('userToken');
    setPayingId(request.id);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { alert('Razorpay failed to load. Please check your connection.'); return; }

      const { data: keyData } = await axios.get(
        `${API_URL}/api/v1/payment/razorpay-key`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { data: orderData } = await axios.post(
        `${API_URL}/api/v1/booking-requests/${request.id}/initiate-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!orderData.success) throw new Error(orderData.message || 'Order creation failed');

      const options = {
        key:         keyData.keyId,
        amount:      orderData.amountPaise,
        currency:    orderData.currency || 'INR',
        name:        'HealthHub',
        description: `Consultation with Dr. ${request.doctorName}`,
        order_id:    orderData.orderId,
        handler: async (response) => {
          try {
            const { data: verifyData } = await axios.post(
              `${API_URL}/api/v1/booking-requests/${request.id}/verify-payment`,
              {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (verifyData.success) {
              alert(`✅ Payment confirmed! Your appointment with Dr. ${request.doctorName} is confirmed. Check your email for the meeting link.`);
              fetchRequests();
            }
          } catch (err) {
            alert(err.response?.data?.message || 'Payment verification failed. Please contact support.');
          }
        },
        modal: { ondismiss: () => { setPayingId(null); } },
        theme: { color: '#1F3A4B' },
      };
      const rp = new window.Razorpay(options);
      rp.on('payment.failed', (resp) => { alert(`Payment failed: ${resp.error.description}`); setPayingId(null); });
      rp.open();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Payment initiation failed');
    } finally {
      setPayingId(null);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async (request) => {
    if (!window.confirm(`Cancel your request with Dr. ${request.doctorName}?`)) return;
    const token = localStorage.getItem('userToken');
    setCancellingId(request.id);
    try {
      await axios.patch(
        `${API_URL}/api/v1/booking-requests/${request.id}/cancel`,
        { cancellationReason: 'Patient cancelled from dashboard' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancellingId(null);
    }
  };

  // ── Navigation — operate on visibleRequests ───────────────────────────────
  const handlePrev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentIndex((prev) => Math.min(visibleRequests.length - 1, prev + 1));

  const current    = visibleRequests[currentIndex];
  const statusMeta = current
    ? (STATUS_META[current.status] || { label: current.status, color: 'bg-gray-100 text-gray-500', icon: Clock })
    : null;
  const StatusIcon = statusMeta?.icon || Clock;

  const canPay    = current?.status === 'DOCTOR_ACCEPTED_AWAITING_PAYMENT';
  const canCancel = current?.status === 'PENDING_DOCTOR_APPROVAL' ||
                    current?.status === 'DOCTOR_ACCEPTED_AWAITING_PAYMENT';
  const isExpired = current?.status === 'ABORTED_BY_DOCTOR';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-[18rem] flex flex-col items-center justify-center p-8 bg-white/40 dark:bg-[#1F3A4B]/10 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-[#1F3A4B]/10 animate-pulse">
        <Activity className="text-[#1F3A4B] dark:text-[#C2F84F] animate-spin mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1F3A4B] dark:text-[#FAFDEE]">Loading Requests...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full h-[18rem] flex flex-col items-center justify-center p-8 bg-rose-50 dark:bg-rose-900/10 backdrop-blur-md rounded-[2.5rem] border-2 border-rose-500/20">
        <AlertCircle className="text-rose-500 mb-4" size={32} />
        <p className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[20rem] p-6 sm:p-8 bg-white dark:bg-[#1F3A4B]/20 backdrop-blur-2xl rounded-[3rem] border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl flex flex-col group relative transition-all overflow-hidden">

      {/* ── Header ── */}
      <div className="flex flex-row justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1F3A4B] text-[#C2F84F] rounded-2xl shadow-lg">
            <Clock size={20} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">
            My Requests
          </h2>
        </div>

        {/* Pagination — driven by visibleRequests */}
        {visibleRequests.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1F3A4B]/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5">
            <button onClick={handlePrev} disabled={currentIndex === 0}
              className="p-2 rounded-full hover:bg-[#C2F84F] hover:text-[#1F3A4B] transition-all disabled:opacity-10 text-[#1F3A4B] dark:text-[#C2F84F]">
              <ChevronLeft size={18} />
            </button>
            <span className="text-[10px] font-black italic tracking-widest min-w-[40px] text-center text-[#1F3A4B] dark:text-[#FAFDEE]">
              {currentIndex + 1} / {visibleRequests.length}
            </span>
            <button onClick={handleNext} disabled={currentIndex === visibleRequests.length - 1}
              className="p-2 rounded-full hover:bg-[#C2F84F] hover:text-[#1F3A4B] transition-all disabled:opacity-10 text-[#1F3A4B] dark:text-[#C2F84F]">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ── Card ── */}
      {visibleRequests.length > 0 && current ? (
        <div className="flex-1 flex flex-col justify-between relative z-10">
          <div className="space-y-2">

            {/* Status + fee badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${statusMeta?.color}`}>
                <StatusIcon size={10} />
                {statusMeta?.label}
              </span>
              {current.feeRupees > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-[#C2F84F]/20 text-[#476407]">
                  <IndianRupee size={9} />₹{current.feeRupees.toFixed(0)}
                </span>
              )}
            </div>

            {/* Doctor name */}
            <p className="text-lg sm:text-xl font-black italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] leading-tight flex items-center gap-3">
              <User size={18} className="opacity-40 shrink-0" />
              Dr. {current.doctorName}
            </p>

            {/* Reason */}
            {current.reason && (
              <p className="text-[10px] font-bold text-[#1F3A4B]/60 dark:text-white/40 ml-7 italic">
                {current.reason}
              </p>
            )}

            {/* Scheduled slot */}
            {current.scheduledTime && (
              <div className="ml-7 flex flex-col gap-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#1F3A4B]/50 dark:text-white/40">
                  {isExpired ? 'Was Scheduled' : 'Proposed Slot'}
                </p>
                <p className={`text-sm font-black ${isExpired ? 'text-rose-600/70 dark:text-rose-400/70 line-through' : 'text-[#1F3A4B] dark:text-[#FAFDEE]'}`}>
                  {formatDate(current.scheduledDate)} · {current.scheduledTime}
                </p>
              </div>
            )}

            {/* Payment deadline */}
            {canPay && current.paymentDeadline && (
              <div className="ml-7 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Hourglass size={11} />
                Pay before {new Date(current.paymentDeadline).toLocaleString('en-IN')}
              </div>
            )}

            {/* Expired notice with inline "Got it" dismiss button */}
            {isExpired && (
              <div className="ml-7 mt-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-400">
                      Appointment Expired
                    </p>
                    <p className="text-[10px] text-rose-600/80 dark:text-rose-400/70 font-medium mt-0.5">
                      The consultation window has passed. Book a new appointment if you still need help.
                    </p>
                    {current.abortedAt && (
                      <p className="text-[9px] text-rose-500/60 font-medium mt-1 uppercase tracking-widest">
                        Marked on {new Date(current.abortedAt).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── [NEW] Dismiss button — sits right inside the notice box ── */}
                <button
                  onClick={() => handleDismiss(current.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <CheckCircle size={12} />
                  Got it — clear this notice
                </button>
              </div>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
            <div className="flex flex-wrap gap-2">
              {/* Join Video Call */}
              {current.status === 'PAID_CONFIRMED' && current.meetLink && (
                <a
                  href={current.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-5 py-3 bg-[#C2F84F] text-[#1F3A4B] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl text-xs font-black uppercase italic tracking-widest"
                >
                  <Video size={15} className="transition-transform group-hover:rotate-12" />
                  Join Video Call
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </a>
              )}

              {/* Pay Now */}
              {canPay && (
                <button
                  onClick={() => handlePayNow(current)}
                  disabled={payingId === current.id}
                  className="flex items-center gap-2 px-5 py-3 bg-[#1F3A4B] text-[#C2F84F] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl text-xs font-black uppercase tracking-widest disabled:opacity-60"
                >
                  {payingId === current.id
                    ? <div className="w-4 h-4 border-2 border-[#C2F84F] border-t-transparent rounded-full animate-spin" />
                    : <IndianRupee size={15} />}
                  Pay ₹{current.feeRupees.toFixed(0)}
                </button>
              )}

              {/* Cancel */}
              {canCancel && (
                <button
                  onClick={() => handleCancel(current)}
                  disabled={cancellingId === current.id}
                  className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-2xl hover:bg-rose-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest disabled:opacity-60"
                >
                  {cancellingId === current.id
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <X size={14} />}
                  Cancel
                </button>
              )}

              {/* Waiting hint */}
              {!canPay && !canCancel && !isExpired && current.status === 'PENDING_DOCTOR_APPROVAL' && (
                <span className="text-[9px] font-black italic uppercase tracking-widest text-[#1F3A4B]/40 dark:text-white/20">
                  Waiting for doctor response...
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#1F3A4B]/40 dark:text-white/30 text-center">
          <p className="text-sm font-black italic uppercase tracking-widest mb-1">No Requests Yet</p>
          <p className="text-[10px] font-bold uppercase opacity-60">Book your first consultation from the Appointments tab</p>
        </div>
      )}

      {/* ── Slot usage bar — driven by meta (from API, not affected by dismissals) ── */}
      {meta.maxAllowed > 0 && (
        <div className="mt-4 pt-4 border-t border-[#1F3A4B]/5 dark:border-white/5 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#1F3A4B]/40 dark:text-white/30">
            Active slots: {meta.activeCount} / {meta.maxAllowed}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: meta.maxAllowed }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-5 rounded-full transition-all ${
                  i < meta.activeCount ? 'bg-amber-400' : 'bg-[#1F3A4B]/10 dark:bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CurrentAppointments;