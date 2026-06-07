import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Stethoscope, Send, AlertCircle, Activity, ArrowLeft,
  CheckCircle, IndianRupee, Layers, TriangleAlert
} from 'lucide-react';
import { API_URL } from '../config/api';

const SPECIALIZATIONS = [
  'All', 'General Physician', 'Cardiologist', 'Dermatologist', 'Neurologist',
  'Orthopedic', 'Gynecologist', 'Pediatrician', 'Psychiatrist',
  'Oncologist', 'ENT Specialist', 'Ophthalmologist', 'Urologist',
];


const PageWrapper = ({ children, isCenter = false, onBack }) => (
  <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 font-sans relative overflow-x-hidden pt-24 pb-24 px-4 md:px-6">
    <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
    </div>
    <button
      onClick={onBack}
      className="absolute top-6 left-6 z-20 group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-[#1F3A4B]/20 dark:border-white/10 bg-white/50 dark:bg-[#1F3A4B]/20 backdrop-blur-md text-[#1F3A4B] dark:text-[#FAFDEE] font-bold text-xs md:text-sm tracking-widest transition-all hover:border-[#1F3A4B] dark:hover:border-[#C2F84F] hover:shadow-lg"
    >
      <ArrowLeft size={16} /><span>BACK</span>
    </button>
    <div className={`max-w-5xl mx-auto relative z-10 ${isCenter ? 'flex flex-col items-center justify-center min-h-[70vh]' : 'mt-6 md:mt-10'}`}>
      {children}
    </div>
  </div>
);

// BLOCKING_STATUSES mirrors the backend logic — frontend pre-flight check only.
// Backend is always the authoritative source; this just prevents an obvious UI mistake.
const BLOCKING_STATUSES = new Set([
  'PENDING_DOCTOR_APPROVAL',
  'DOCTOR_ACCEPTED_AWAITING_PAYMENT',
  'PAID_CONFIRMED',
]);

const BookAppointments = () => {
  const navigate          = useNavigate();
  const [doctorsList,   setDoctorsList]   = useState([]);
  const [reasons,       setReasons]       = useState({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [filterSpec,    setFilterSpec]    = useState('All');

  const [activeCount,   setActiveCount]   = useState(0);
  const [maxAllowed,    setMaxAllowed]    = useState(5);
  // ISSUE 1 FIX: track which doctorIds already have an active/confirmed request
  const [blockedDoctors, setBlockedDoctors] = useState(new Set());

  const goBack = useCallback(() => navigate('/patient'), [navigate]);

  const fetchDoctors = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Authentication required.');

      const [doctorsRes, slotsRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/book-appointment/users?role=Doctor`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        }),
        axios.get(`${API_URL}/api/v1/booking-requests/my-requests`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        }),
      ]);

      const doctors = doctorsRes.data.data;
      if (!Array.isArray(doctors)) throw new Error('Unexpected response format.');
      setDoctorsList(doctors);

      const meta = slotsRes.data.meta || {};
      setActiveCount(meta.activeCount ?? 0);
      setMaxAllowed(meta.maxAllowed ?? 5);

      // Build the set of blocked doctorIds from existing requests
      const blocked = new Set();
      (slotsRes.data.data || []).forEach((r) => {
        const doctorId = r.doctorId?._id || r.doctorId;
        if (!doctorId || !BLOCKING_STATUSES.has(r.status)) return;

        // For PAID_CONFIRMED, only block while the slot is still active
        if (r.status === 'PAID_CONFIRMED') {
          const scheduledDate = r.proposedByDoctor?.scheduledDate;
          const durationMins  = r.proposedByDoctor?.slotDurationMinutes || 30;
          if (scheduledDate) {
            const slotEnd = new Date(
              new Date(scheduledDate).getTime() + durationMins * 60 * 1000
            );
            if (new Date() >= slotEnd) return; // slot has ended — allow re-booking
          }
        }
        blocked.add(String(doctorId));
      });
      setBlockedDoctors(blocked);

      setError(null);
      setLoading(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load doctors';
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleReasonChange = useCallback((id, value) => {
    setReasons((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleBook = useCallback(async (doctor) => {
    const reason = reasons[doctor._id]?.trim();
    const token  = localStorage.getItem('userToken');

    if (!doctor._id) { toast.error('Invalid selection'); return; }
    if (!reason)     { toast.error('Please describe your reason for consultation'); return; }

    if (activeCount >= maxAllowed) {
      toast.error(`You've used all ${maxAllowed} active request slots. Cancel or wait for a response first.`);
      return;
    }

    // ISSUE 1 FIX: frontend pre-flight check — backend will enforce this too
    if (blockedDoctors.has(String(doctor._id))) {
      toast.error(`You already have an active or confirmed appointment with Dr. ${doctor.name}. Please complete or cancel it before sending a new request.`);
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/v1/booking-requests`,
        { doctorId: doctor._id, reason },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      toast.success(`Request sent to Dr. ${doctor.name}! They'll propose a time if they accept.`);
      setReasons((prev) => ({ ...prev, [doctor._id]: '' }));
      setActiveCount((prev) => Math.min(prev + 1, maxAllowed));
      // Immediately mark this doctor as blocked in UI until next full refresh
      setBlockedDoctors((prev) => new Set([...prev, String(doctor._id)]));
    } catch (err) {
      const msg = err?.response?.data?.message || 'Booking request failed';
      toast.error(msg);
    }
  }, [reasons, activeCount, maxAllowed, blockedDoctors]);

  const filteredDoctors = filterSpec === 'All'
    ? doctorsList
    : doctorsList.filter((d) => d.specialization === filterSpec);

  if (loading) {
    return (
      <PageWrapper isCenter onBack={goBack}>
        <Activity className="animate-spin text-[#1F3A4B] dark:text-[#C2F84F] mb-4" size={48} />
        <p className="text-[#1F3A4B] dark:text-[#FAFDEE] font-black italic uppercase tracking-widest text-xs sm:text-base">
          Syncing Staff Log...
        </p>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper isCenter onBack={goBack}>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] sm:rounded-[3rem] border-2 border-[#1F3A4B]/10 shadow-3xl text-center max-w-md mx-auto w-full">
          <AlertCircle className="text-rose-600 mx-auto mb-4" size={48} />
          <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-lg font-bold mb-6 italic">{error}</p>
          <button
            onClick={fetchDoctors}
            className="w-full sm:w-auto px-10 py-4 bg-[#1F3A4B] text-[#C2F84F] font-black uppercase rounded-full hover:scale-105 transition-all shadow-xl text-sm tracking-wide"
          >
            Retry
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper onBack={goBack}>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 3000, style: { background: '#1F3A4B', color: '#FAFDEE', borderRadius: '20px' } }}
      />

      {}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none text-[#1F3A4B] dark:text-[#FAFDEE] mb-4">
          Book <span className="text-[#1F3A4B]/40 dark:text-[#C2F84F] sm:inline block">Appointment</span>
        </h1>
        <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-60 text-[#1F3A4B] dark:text-[#FAFDEE]">
          Pay-Per-Consultation · Doctor Sets Price · You Pay After Acceptance
        </p>
      </div>

      {}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1F3A4B]/60 dark:text-[#FAFDEE]/60">
          <Layers size={14} />
          <span>Active Requests: {activeCount} / {maxAllowed}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxAllowed }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-6 rounded-full transition-all ${
                i < activeCount
                  ? 'bg-amber-400'
                  : 'bg-[#1F3A4B]/10 dark:bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {SPECIALIZATIONS.slice(0, 8).map((spec) => (
          <button
            key={spec}
            onClick={() => setFilterSpec(spec)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
              filterSpec === spec
                ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] shadow-lg'
                : 'bg-[#1F3A4B]/5 dark:bg-white/10 text-[#1F3A4B] dark:text-[#FAFDEE] hover:bg-[#1F3A4B]/10 border border-[#1F3A4B]/10'
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      {}
      <div className="space-y-6 sm:space-y-10">
        {filteredDoctors.length === 0 ? (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2rem] sm:rounded-[4rem] p-8 sm:p-16 text-center border-2 border-[#1F3A4B]/5 shadow-3xl">
            <p className="text-xl sm:text-2xl font-black italic text-[#1F3A4B]/50 dark:text-[#FAFDEE]/50 uppercase">
              No doctors found for this specialization.
            </p>
          </div>
        ) : (
          filteredDoctors.map((doctor) => (
            <DoctorCard
              key={doctor._id}
              doctor={doctor}
              reason={reasons[doctor._id] || ''}
              onReasonChange={handleReasonChange}
              onBook={handleBook}
              slotsExhausted={activeCount >= maxAllowed}
              noFee={!doctor.consultingFee || doctor.consultingFee === 0}
              isBlocked={blockedDoctors.has(String(doctor._id))}
            />
          ))
        )}
      </div>
    </PageWrapper>
  );
};

const DoctorCard = React.memo(({
  doctor, reason, onReasonChange, onBook, slotsExhausted, noFee, isBlocked,
}) => {
  const isDisabled = slotsExhausted || noFee || isBlocked;
  const buttonLabel = noFee
    ? 'Awaiting Fee Setup'
    : isBlocked
    ? 'Already Booked'
    : slotsExhausted
    ? 'Slots Full'
    : 'Request Consultation';

  return (
  <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl hover:border-[#C2F84F] transition-all group overflow-hidden relative">
    <Stethoscope
      className="absolute right-[-10px] top-[-10px] opacity-[0.03] dark:opacity-[0.07] transition-all group-hover:rotate-12 hidden md:block"
      size={240}
    />

    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 sm:gap-8 relative z-10">

      <div className="flex-1">
        <div className="flex items-center gap-3 sm:gap-4 mb-2">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-[#1F3A4B] text-[#C2F84F] shadow-lg shrink-0">
            <Stethoscope size={20} className="sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-xl sm:text-3xl font-black italic tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE] uppercase leading-none">
            {doctor.name.startsWith('Dr. ') ? doctor.name : `Dr. ${doctor.name}`}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 sm:ml-12">
          {doctor.specialization && (
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#1F3A4B]/60 dark:text-[#FAFDEE]/60 tracking-widest bg-[#1F3A4B]/5 dark:bg-white/5 py-1 px-3 rounded-full border border-[#1F3A4B]/10">
              {doctor.specialization}
            </span>
          )}
          {doctor.experience && (
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#1F3A4B]/60 dark:text-[#FAFDEE]/60 tracking-widest bg-[#1F3A4B]/5 dark:bg-white/5 py-1 px-3 rounded-full border border-[#1F3A4B]/10">
              {doctor.experience} yrs exp
            </span>
          )}
          {doctor.availability && (
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1 ${
              doctor.availability === 'Available'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : doctor.availability === 'Busy'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              <CheckCircle size={10} />
              {doctor.availability}
            </span>
          )}
          {doctor.consultingFee > 0 ? (
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1 bg-[#C2F84F]/20 text-[#476407] border border-[#C2F84F]/40">
              <IndianRupee size={10} />
              {(doctor.consultingFee / 100).toFixed(0)} / session
            </span>
          ) : (
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-300">
              <TriangleAlert size={10} />
              Fee not set yet
            </span>
          )}
          {doctor.consultingFee > 0 && !doctor.consultingFeeConfirmed && (
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-300">
              <TriangleAlert size={10} />
              Fee Unconfirmed
            </span>
          )}
          {isBlocked && (
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-300">
              <CheckCircle size={10} />
              Active Request
            </span>
          )}
        </div>

        {doctor.bio && (
          <p className="text-xs text-[#1F3A4B]/60 dark:text-[#FAFDEE]/60 mt-3 sm:ml-12 italic leading-relaxed max-w-sm">
            {doctor.bio}
          </p>
        )}
      </div>

      <div className="flex-1 space-y-3 sm:space-y-4">
        <p className="text-[9px] sm:text-[10px] font-black uppercase text-[#1F3A4B] dark:text-[#FAFDEE] tracking-widest leading-none">
          Reason for Consultation
        </p>
        <textarea
          className="w-full p-4 sm:p-5 bg-[#1F3A4B]/5 dark:bg-white/5 rounded-[1.5rem] sm:rounded-[2rem] text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all placeholder-[#1F3A4B]/20 dark:placeholder-white/20 text-xs sm:text-sm italic resize-none"
          rows={3}
          placeholder="Briefly describe your symptoms or reason..."
          value={reason}
          onChange={(e) => onReasonChange(doctor._id, e.target.value)}
          disabled={isBlocked}
        />

        {noFee ? (
          <p className="text-[9px] font-bold text-amber-600 italic px-1">
            This doctor has not set their consulting fee yet. Booking will be available once they do.
          </p>
        ) : isBlocked ? (
          <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400 italic px-1">
            You have an active or confirmed appointment with this doctor. Complete or cancel it before booking again.
          </p>
        ) : (
          <p className="text-[9px] font-bold text-[#1F3A4B]/50 dark:text-[#FAFDEE]/50 italic px-1">
            {doctor.consultingFeeConfirmed
              ? `₹${(doctor.consultingFee / 100).toFixed(0)} will be charged only if the doctor accepts and you confirm payment.`
              : `₹${(doctor.consultingFee / 100).toFixed(0)} shown — doctor should confirm their actual rate.`}
          </p>
        )}
      </div>

      <div className="lg:w-fit w-full flex justify-end">
        <button
          onClick={() => onBook(doctor)}
          disabled={isDisabled}
          className={`w-full lg:w-auto group flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-5 font-black italic rounded-[1.5rem] sm:rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all shadow-2xl leading-none text-sm sm:text-base tracking-wide disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 ${
            isBlocked
              ? 'bg-sky-700 dark:bg-sky-600 text-white'
              : 'bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] shadow-[#1F3A4B]/30'
          }`}
        >
          <Send size={18} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
          {buttonLabel}
        </button>
      </div>
    </div>
  </div>
  );
});

export default BookAppointments;