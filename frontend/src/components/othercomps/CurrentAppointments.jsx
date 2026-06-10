import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, Video, User, Clock, AlertCircle,
  Activity, ArrowRight, IndianRupee, X, CheckCircle, Ban,
  Hourglass, CreditCard, TriangleAlert, AlertTriangle,
} from 'lucide-react';
import { API_URL } from '../../config/api';


// ─── Status display metadata ─────────────────────────────────────────────────
// CONVERTED ALL LABELS TO UPPERCASE CASE ALIGNMENT
const STATUS_META = {
  PENDING_DOCTOR_APPROVAL: {
    label: 'AWAITING DOCTOR',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon:  Hourglass,
  },
  DOCTOR_ACCEPTED_AWAITING_PAYMENT: {
    label: 'PAY TO CONFIRM',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    icon:  CreditCard,
  },
  PAID_CONFIRMED: {
    label: 'CONFIRMED',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon:  CheckCircle,
  },
  DOCTOR_REJECTED: {
    label: 'DECLINED',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon:  Ban,
  },
  PATIENT_CANCELLED: {
    label: 'CANCELLED',
    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    icon:  X,
  },
  PAYMENT_EXPIRED: {
    label: 'PAYMENT EXPIRED',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon:  TriangleAlert,
  },
  ABORTED_BY_DOCTOR: {
    label: 'EXPIRED — NOT ATTENDED',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon:  AlertTriangle,
  },
};

const formatDate = (isoString) => {
  if (!isoString) return 'DATE TBD';
  const d = new Date(isoString);
  return isNaN(d) ? 'DATE TBD' : d.toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase();
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

const LS_KEY = 'hh_dismissed_expired';

// ─── Component ───────────────────────────────────────────────────────────────
function CurrentAppointments({ refreshTrigger = 0 }) {
  const [requests,     setRequests]     = useState([]);
  const [meta,         setMeta]         = useState({ activeCount: 0, maxAllowed: 5 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  /* Decoupled loading state setters using specialized token mappings */
  const [payingId,     setPayingId]     = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const intervalRef = useRef(null);

  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const visibleRequests = useMemo(
    () => requests.filter(
      (r) => !(r.status === 'ABORTED_BY_DOCTOR' && dismissedIds.includes(r.id))
    ),
    [requests, dismissedIds]
  );

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, visibleRequests.length - 1)));
  }, [visibleRequests.length]);

  const handleDismiss = useCallback((id) => {
    setDismissedIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
      } catch { /* storage quota hit */ }
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
        description: `Consultation with Dr. ${request.doctorName}`.toUpperCase(),
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

  if (loading) {
    return (
      <div className="w-full h-[18rem] font-roboto-slab flex flex-col items-center justify-center p-6 bg-white/40 dark:bg-[#1F3A4B]/10 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-dashed border-[#1F3A4B]/10 animate-pulse">
        <Activity className="text-[#1F3A4B] dark:text-[#C2F84F] animate-spin mb-4 shrink-0" size={32} />
        {/* Loader text size bumped up */}
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-[#1F3A4B] dark:text-[#FAFDEE] text-center">LOADING REQUESTS...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[18rem] font-roboto-slab flex flex-col items-center justify-center p-6 bg-rose-50 dark:bg-rose-900/10 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-rose-500/20 text-center">
        <AlertCircle className="text-rose-500 mb-4 shrink-0" size={32} />
        {/* Error text size bumped up */}
        <p className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 break-all px-2">ERROR: {error.message.toUpperCase()}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[20rem] p-5 sm:p-8 bg-white dark:bg-[#1F3A4B]/20 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[3rem] border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl flex flex-col group relative transition-all overflow-hidden min-w-0 font-roboto-slab">

      {/* ── Header ── */}
      <div className="flex flex-row justify-between items-center gap-2 mb-6 relative z-10 w-full min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-3 bg-[#1F3A4B] text-[#C2F84F] rounded-xl sm:rounded-2xl shadow-lg shrink-0">
            <Clock size={18} className="sm:size-[20px]" />
          </div>
          {/* Changed font weight structure to clean font-extrabold */}
          <h2 className="text-xl sm:text-3xl font-extrabold italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] truncate font-sans">
            MY REQUESTS
          </h2>
        </div>

        {visibleRequests.length > 0 && (
          <div className="flex items-center gap-1 bg-[#1F3A4B]/5 dark:bg-white/5 p-0.5 sm:p-1 rounded-full border border-black/5 dark:border-white/5 shrink-0">
            <button onClick={handlePrev} disabled={currentIndex === 0}
              className="p-1.5 sm:p-2 rounded-full hover:bg-[#C2F84F] hover:text-[#1F3A4B] transition-all disabled:opacity-10 text-[#1F3A4B] dark:text-[#C2F84F]">
              <ChevronLeft size={16} />
            </button>
            {/* Pagination tracking metric font size bumped up */}
            <span className="text-xs font-bold italic tracking-widest min-w-[32px] sm:min-w-[40px] text-center text-[#1F3A4B] dark:text-[#FAFDEE]">
              {currentIndex + 1}/{visibleRequests.length}
            </span>
            <button onClick={handleNext} disabled={currentIndex === visibleRequests.length - 1}
              className="p-1.5 sm:p-2 rounded-full hover:bg-[#C2F84F] hover:text-[#1F3A4B] transition-all disabled:opacity-10 text-[#1F3A4B] dark:text-[#C2F84F]">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Card ── */}
      {visibleRequests.length > 0 && current ? (
        <div className="flex-1 flex flex-col justify-between relative z-10 w-full min-w-0">
          <div className="space-y-4 w-full min-w-0">

            {/* Status + fee badges — font footprint increased */}
            <div className="flex items-center gap-1.5 flex-wrap w-full">
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest leading-none ${statusMeta?.color}`}>
                <StatusIcon size={11} className="shrink-0" />
                {statusMeta?.label}
              </span>
              {current.feeRupees > 0 && (
                <span className="flex items-center gap-0.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest leading-none bg-[#C2F84F]/20 text-[#476407]">
                  <IndianRupee size={10} className="shrink-0" />₹{current.feeRupees.toFixed(0)}
                </span>
              )}
            </div>

            {/* Doctor name — Wrapped text size boosted cleanly */}
            <div className="text-lg sm:text-2xl font-extrabold italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] leading-tight flex items-center gap-2 min-w-0 w-full font-sans">
              <User size={18} className="opacity-40 shrink-0" />
              <span className="truncate flex-1">DR. {current.doctorName.toUpperCase()}</span>
            </div>

            {/* Reason — Text footprint size bumped and transformed */}
            {current.reason && (
              <p className="text-xs sm:text-sm font-bold text-[#1F3A4B]/60 dark:text-white/40 ml-6 italic break-words uppercase tracking-wide">
                "{current.reason.toUpperCase()}"
              </p>
            )}

            {/* Scheduled slot — Font footprint size bumped */}
            {current.scheduledTime && (
              <div className="ml-6 flex flex-col gap-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#1F3A4B]/50 dark:text-white/40">
                  {isExpired ? 'WAS SCHEDULED' : 'PROPOSED SLOT'}
                </p>
                <p className={`text-sm sm:text-base font-bold truncate uppercase tracking-wide ${isExpired ? 'text-rose-600/70 dark:text-rose-400/70 line-through' : 'text-[#1F3A4B] dark:text-[#FAFDEE]'}`}>
                  {formatDate(current.scheduledDate)} · {current.scheduledTime.toUpperCase()}
                </p>
              </div>
            )}

            {/* Payment deadline — Font size expanded */}
            {canPay && current.paymentDeadline && (
              <div className="ml-6 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 w-full min-w-0 uppercase tracking-wider">
                <Hourglass size={12} className="shrink-0" />
                <span className="truncate">PAY BEFORE {new Date(current.paymentDeadline).toLocaleString('en-IN').toUpperCase()}</span>
              </div>
            )}

            {/* Expired notice box with inline dismiss */}
            {isExpired && (
              <div className="ml-0 sm:ml-6 mt-2 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 w-full min-w-0">
                <div className="flex items-start gap-2.5 w-full min-w-0">
                  <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                      APPOINTMENT EXPIRED
                    </p>
                    <p className="text-xs text-rose-600/80 dark:text-rose-400/70 font-bold mt-1 leading-normal uppercase tracking-wide">
                      THE CONSULTATION WINDOW HAS PASSED. BOOK A NEW APPOINTMENT IF YOU STILL NEED HELP.
                    </p>
                    {current.abortedAt && (
                      <p className="text-[10px] text-rose-500/60 font-bold mt-1.5 uppercase tracking-widest">
                        MARKED ON {new Date(current.abortedAt).toLocaleDateString('en-IN').toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(current.id)}
                  className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-all text-xs font-bold uppercase tracking-widest shrink-0"
                >
                  <CheckCircle size={14} className="shrink-0" />
                  CLEAR NOTICE
                </button>
              </div>
            )}
          </div>

          {/* ── Action buttons ── Font sizes boosted cleanly */}
          <div className="flex flex-row items-center gap-2.5 mt-6 w-full min-w-0 flex-wrap sm:flex-nowrap">
            {/* Join Video Call */}
            {current.status === 'PAID_CONFIRMED' && current.meetLink && (
              <a
                href={current.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-1 items-center justify-center gap-1.5 px-4 py-3.5 bg-[#C2F84F] text-[#1F3A4B] rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl text-xs sm:text-sm font-bold uppercase italic tracking-wider sm:tracking-widest min-w-0 truncate text-center"
              >
                <Video size={15} className="shrink-0 transition-transform group-hover:rotate-12" />
                <span className="truncate">JOIN CALL</span>
                <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-1 hidden sm:inline" />
              </a>
            )}

            {/* Pay Now */}
            {canPay && (
              <button
                onClick={() => handlePayNow(current)}
                disabled={payingId === current.id}
                className="flex flex-1 items-center justify-center gap-1.5 px-4 py-3.5 bg-[#1F3A4B] text-[#C2F84F] rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-widest disabled:opacity-60 min-w-0"
              >
                {payingId === current.id ? (
                  <div className="w-4 h-4 border-2 border-[#C2F84F] border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <IndianRupee size={15} className="shrink-0" />
                )}
                <span className="truncate">PAY ₹{current.feeRupees.toFixed(0)}</span>
              </button>
            )}

            {/* Cancel */}
            {canCancel && (
              <button
                onClick={() => handleCancel(current)}
                disabled={cancellingId === current.id}
                className="flex items-center justify-center gap-1.5 px-4 py-3.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl sm:rounded-2xl hover:bg-rose-600 hover:text-white transition-all text-xs sm:text-sm font-bold uppercase tracking-widest disabled:opacity-60 shrink-0"
              >
                {cancellingId === current.id ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <X size={14} className="shrink-0" />
                )}
                <span>CANCEL</span>
              </button>
            )}

            {/* Waiting hint — Cases updated */}
            {!canPay && !canCancel && !isExpired && current.status === 'PENDING_DOCTOR_APPROVAL' && (
              <span className="text-xs font-bold italic uppercase tracking-widest text-[#1F3A4B]/40 dark:text-white/20 block py-2.5 truncate">
                WAITING FOR DOCTOR RESPONSE...
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Empty States — Font footprint size increased */
        <div className="flex-1 flex flex-col items-center justify-center text-[#1F3A4B]/40 dark:text-white/30 text-center py-8">
          <p className="text-sm sm:text-base font-bold italic uppercase tracking-widest mb-1.5">NO REQUESTS YET</p>
          <p className="text-xs font-bold uppercase opacity-60 px-4 tracking-wide leading-normal">BOOK YOUR FIRST CONSULTATION FROM THE APPOINTMENTS TAB</p>
        </div>
      )}

      {/* ── Slot usage bar ── Font footprint expanded cleanly */}
      {meta.maxAllowed > 0 && (
        <div className="mt-5 pt-4 border-t border-[#1F3A4B]/5 dark:border-white/5 flex items-center justify-between gap-2 w-full min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1F3A4B]/40 dark:text-white/30 truncate">
            ACTIVE SLOTS: {meta.activeCount} / {meta.maxAllowed}
          </span>
          <div className="flex gap-1.5 shrink-0">
            {Array.from({ length: meta.maxAllowed }).map((_, i) => (
              <div
                key={i}
                className={`h-1 w-3 sm:h-2 sm:w-5 rounded-full transition-all ${
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