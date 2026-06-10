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
  /* Changed global wrapper text footprint to font-roboto-slab and enhanced sub-pixel rendering antialiasing */
  <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 font-roboto-slab relative overflow-x-hidden pt-24 pb-24 px-4 md:px-6 antialiased">
    <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
    </div>
    
    {/* Clean, responsive adaptive circular capsule return action */}
    <button
      onClick={onBack}
      className="absolute top-6 left-4 md:top-8 md:left-8 z-20 group flex items-center justify-center gap-3.5 h-12 w-12 md:h-auto md:w-auto md:px-6 md:py-3.5 rounded-full border border-neutral-200/40 dark:border-white/5 bg-white/40 dark:bg-neutral-950/20 backdrop-blur-md text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 text-sm font-bold tracking-widest transition-all duration-300 hover:text-emerald-600 dark:hover:text-[#C2F84F] hover:border-neutral-300/60 dark:hover:border-white/20 hover:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.05)] uppercase"
    >
      <ArrowLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
      <span className="hidden md:inline leading-none pt-[1px]">BACK</span>
    </button>
    
    <div className={`max-w-5xl mx-auto relative z-10 ${isCenter ? 'flex flex-col items-center justify-center min-h-[70vh]' : 'mt-6 md:mt-10'}`}>
      {children}
    </div>
  </div>
);

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

      const blocked = new Set();
      (slotsRes.data.data || []).forEach((r) => {
        const doctorId = r.doctorId?._id || r.doctorId;
        if (!doctorId || !BLOCKING_STATUSES.has(r.status)) return;

        if (r.status === 'PAID_CONFIRMED') {
          const scheduledDate = r.proposedByDoctor?.scheduledDate;
          const durationMins  = r.proposedByDoctor?.slotDurationMinutes || 30;
          if (scheduledDate) {
            const slotEnd = new Date(
              new Date(scheduledDate).getTime() + durationMins * 60 * 1000
            );
            if (new Date() >= slotEnd) return;
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
        <p className="text-[#1F3A4B] dark:text-[#FAFDEE] font-bold uppercase tracking-widest text-sm sm:text-base font-roboto-slab">
          SYNCING STAFF LOG...
        </p>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper isCenter onBack={goBack}>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] sm:rounded-[3rem] font-roboto-slab border-2 border-[#1F3A4B]/10 shadow-3xl text-center max-w-md mx-auto w-full">
          <AlertCircle className="text-rose-600 mx-auto mb-4" size={48} />
          <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-base font-bold mb-6 uppercase tracking-wide">{error}</p>
          <button
            onClick={fetchDoctors}
            className="w-full sm:w-auto px-10 py-4 bg-[#1F3A4B] text-[#C2F84F] font-bold uppercase rounded-full hover:scale-105 transition-all shadow-xl text-base tracking-wider"
          >
            RETRY
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

      {/* Page Heading — Size increased cleanly */}
      <div className="text-center mb-8 sm:mb-14">
        <h1 className="text-5xl sm:text-7xl font-extrabold italic tracking-tighter uppercase leading-none text-[#1F3A4B] dark:text-[#FAFDEE] mb-4 font-sans">
          BOOK <span className="text-[#1F3A4B]/40 dark:text-[#C2F84F] sm:inline block">APPOINTMENT</span>
        </h1>
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-70 text-[#1F3A4B] dark:text-[#FAFDEE]">
          PAY-PER-CONSULTATION · DOCTOR SETS PRICE · YOU PAY AFTER ACCEPTANCE
        </p>
      </div>

      {/* Active Slots Banner — Font footprint scaled up */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70">
          <Layers size={16} />
          <span>ACTIVE REQUESTS: {activeCount} / {maxAllowed}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: maxAllowed }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-7 rounded-full transition-all ${
                i < activeCount
                  ? 'bg-amber-400'
                  : 'bg-[#1F3A4B]/10 dark:bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Filtering Options Track — Sizing expanded layout */}
      <div className="flex flex-wrap gap-2.5 mb-10 justify-center">
        {SPECIALIZATIONS.slice(0, 8).map((spec) => (
          <button
            key={spec}
            onClick={() => setFilterSpec(spec)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              filterSpec === spec
                ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] shadow-lg scale-105'
                : 'bg-[#1F3A4B]/5 dark:bg-white/10 text-[#1F3A4B] dark:text-[#FAFDEE] hover:bg-[#1F3A4B]/10 border border-[#1F3A4B]/10'
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      <div className="space-y-8 sm:space-y-12">
        {filteredDoctors.length === 0 ? (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2rem] sm:rounded-[4rem] p-8 sm:p-16 text-center border-2 border-[#1F3A4B]/5 shadow-3xl">
            <p className="text-xl sm:text-2xl font-bold italic text-[#1F3A4B]/50 dark:text-[#FAFDEE]/50 uppercase tracking-wide">
              NO DOCTORS FOUND FOR THIS SPECIALIZATION.
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
    ? 'AWAITING FEE SETUP'
    : isBlocked
    ? 'ALREADY BOOKED'
    : slotsExhausted
    ? 'SLOTS FULL'
    : 'REQUEST CONSULTATION';

  return (
  <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl hover:border-[#C2F84F] transition-all group overflow-hidden relative">
    <Stethoscope
      className="absolute right-[-10px] top-[-10px] opacity-[0.03] dark:opacity-[0.07] transition-all group-hover:rotate-12 hidden md:block"
      size={240}
    />

    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 sm:gap-8 relative z-10">

      <div className="flex-1">
        <div className="flex items-center gap-3 sm:gap-4 mb-3">
          <div className="p-3 rounded-2xl bg-[#1F3A4B] text-[#C2F84F] shadow-lg shrink-0">
            <Stethoscope size={24} />
          </div>
          {/* Card Name — Kept style with font-sans, weight updated */}
          <h3 className="text-2xl sm:text-4xl font-extrabold italic tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE] uppercase leading-none font-sans">
            {doctor.name.startsWith('Dr. ') ? doctor.name : `Dr. ${doctor.name}`}
          </h3>
        </div>

        {/* Info badging track — font footings scaled up */}
        <div className="flex flex-wrap gap-2.5 mt-4 sm:ml-14">
          {doctor.specialization && (
            <span className="text-xs font-bold uppercase text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 tracking-widest bg-[#1F3A4B]/5 dark:bg-white/5 py-1.5 px-3.5 rounded-full border border-[#1F3A4B]/10">
              {doctor.specialization}
            </span>
          )}
          {doctor.experience && (
            <span className="text-xs font-bold uppercase text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 tracking-widest bg-[#1F3A4B]/5 dark:bg-white/5 py-1.5 px-3.5 rounded-full border border-[#1F3A4B]/10">
              {doctor.experience} YRS EXP
            </span>
          )}
          {doctor.availability && (
            <span className={`text-xs font-bold uppercase tracking-widest py-1.5 px-3.5 rounded-full flex items-center gap-1.5 ${
              doctor.availability === 'Available'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : doctor.availability === 'Busy'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              <CheckCircle size={12} />
              {doctor.availability}
            </span>
          )}
          {doctor.consultingFee > 0 ? (
            <span className="text-xs font-bold uppercase tracking-widest py-1.5 px-3.5 rounded-full flex items-center gap-1.5 bg-[#C2F84F]/20 text-[#476407] border border-[#C2F84F]/40">
              <IndianRupee size={12} />
              {(doctor.consultingFee / 100).toFixed(0)} / SESSION
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-widest py-1.5 px-3.5 rounded-full flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-300">
              <TriangleAlert size={12} />
              FEE NOT SET YET
            </span>
          )}
          {doctor.consultingFee > 0 && !doctor.consultingFeeConfirmed && (
            <span className="text-xs font-bold uppercase tracking-widest py-1.5 px-3.5 rounded-full flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-300">
              <TriangleAlert size={12} />
              FEE UNCONFIRMED
            </span>
          )}
          {isBlocked && (
            <span className="text-xs font-bold uppercase tracking-widest py-1.5 px-3.5 rounded-full flex items-center gap-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-300">
              <CheckCircle size={12} />
              ACTIVE REQUEST
            </span>
          )}
        </div>

        {doctor.bio && (
          <p className="text-sm text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 mt-4 sm:ml-14 italic leading-relaxed max-w-md">
            {doctor.bio}
          </p>
        )}
      </div>

      {/* Consultation Fields Box */}
      <div className="flex-1 space-y-3 sm:space-y-4 w-full">
        <label className="block text-xs sm:text-sm font-bold uppercase text-[#1F3A4B] dark:text-[#FAFDEE] tracking-widest leading-none ml-1">
          REASON FOR CONSULTATION
        </label>
        <textarea
          className="w-full p-4 sm:p-5 bg-[#1F3A4B]/5 dark:bg-white/5 rounded-[1.5rem] sm:rounded-[2rem] text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all placeholder-[#1F3A4B]/30 dark:placeholder-white/30 text-sm italic resize-none uppercase tracking-wide"
          rows={3}
          placeholder="BRIEFLY DESCRIBE YOUR SYMPTOMS OR REASON..."
          value={reason}
          onChange={(e) => onReasonChange(doctor._id, e.target.value)}
          disabled={isBlocked}
        />

        {noFee ? (
          <p className="text-xs font-bold text-amber-600 italic px-1 uppercase tracking-wide">
            This doctor has not set their consulting fee yet. Booking will be available once they do.
          </p>
        ) : isBlocked ? (
          <p className="text-xs font-bold text-sky-600 dark:text-sky-400 italic px-1 uppercase tracking-wide">
            You have an active or confirmed appointment with this doctor. Complete or cancel it before booking again.
          </p>
        ) : (
          <p className="text-xs font-bold text-[#1F3A4B]/60 dark:text-[#FAFDEE]/60 italic px-1 uppercase tracking-wide">
            {doctor.consultingFeeConfirmed
              ? `₹${(doctor.consultingFee / 100).toFixed(0)} WILL BE CHARGED ONLY IF THE DOCTOR ACCEPTS AND YOU CONFIRM PAYMENT.`
              : `₹${(doctor.consultingFee / 100).toFixed(0)} SHOWN — DOCTOR SHOULD CONFIRM THEIR ACTUAL RATE.`}
          </p>
        )}
      </div>

      {/* Primary Row Submission Trigger */}
      <div className="lg:w-fit w-full flex items-end self-stretch lg:self-center">
        <button
          onClick={() => onBook(doctor)}
          disabled={isDisabled}
          className={`w-full lg:w-auto group flex items-center justify-center gap-3.5 px-8 sm:px-10 py-4 sm:py-5 font-bold italic rounded-[1.5rem] sm:rounded-[2rem] hover:scale-105 active:scale-95 transition-all shadow-2xl leading-none text-base tracking-wider disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 uppercase ${
            isBlocked
              ? 'bg-sky-700 dark:bg-sky-600 text-white'
              : 'bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] shadow-[#1F3A4B]/30'
          }`}
        >
          <Send size={18} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
          <span>{buttonLabel}</span>
        </button>
      </div>

    </div>
  </div>
  );
});

export default BookAppointments;