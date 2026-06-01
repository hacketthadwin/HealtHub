import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  User, 
  Clock, 
  AlertCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { API_URL } from '../../config/api';

const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  if (isNaN(date)) return 'Date TBD';
  const options = {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  };
  return date.toLocaleDateString('en-US', options);
};

function CurrentAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  const fetchAppointments = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      setError(new Error('Authentication required'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/api/v1/appointments/patient-doctors`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const formattedAppointments = (response.data.data || []).map((app) => ({
        id: app._id,
        type: app.status === 'accepted' ? 'Accepted' : app.status === 'pending' ? 'Pending' : 'Rejected',
        provider: app.doctorId?.name || 'Doctor',
        dateTime: app.appointmentDate || app.createdAt || app.updatedAt || new Date().toISOString(),
        link: app.meetLink || '',       // Video call link from backend (Issue 2)
        reason: app.reason || '',
        status: app.status,
      }));

      setAppointments(formattedAppointments);
      setCurrentIndex(0);
    } catch (e) {
      console.error('Error fetching appointments:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    intervalRef.current = setInterval(fetchAppointments, 5 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handlePrev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentIndex((prev) => Math.min(appointments.length - 1, prev + 1));

  const currentAppointment = appointments[currentIndex];

  if (loading) {
    return (
      <div className="w-full h-[18rem] flex flex-col items-center justify-center p-8 bg-white/40 dark:bg-[#1F3A4B]/10 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-[#1F3A4B]/10 animate-pulse">
        <Activity className="text-[#1F3A4B] dark:text-[#C2F84F] animate-spin mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1F3A4B] dark:text-[#FAFDEE]">Fetching Consultation Log...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[18rem] flex flex-col items-center justify-center p-8 bg-rose-50 dark:bg-rose-900/10 backdrop-blur-md rounded-[2.5rem] border-2 border-rose-500/20 shadow-xl shadow-rose-500/10">
        <AlertCircle className="text-rose-500 mb-4" size={32} />
        <p className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">Diagnostic Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[18rem] p-6 sm:p-8 bg-white dark:bg-[#1F3A4B]/20 backdrop-blur-2xl rounded-[3rem] border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl flex flex-col group relative transition-all overflow-hidden">

      {/* HEADER CONTROLS */}
      <div className="flex flex-row justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1F3A4B] text-[#C2F84F] rounded-2xl shadow-lg">
            <Clock size={20} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">
            Visits
          </h2>
        </div>

        {appointments.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1F3A4B]/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5">
            <button onClick={handlePrev} disabled={currentIndex === 0}
              className="p-2 rounded-full hover:bg-[#C2F84F] hover:text-[#1F3A4B] transition-all duration-200 disabled:opacity-10 text-[#1F3A4B] dark:text-[#C2F84F]">
              <ChevronLeft size={18} />
            </button>
            <span className="text-[10px] font-black italic tracking-widest min-w-[40px] text-center text-[#1F3A4B] dark:text-[#FAFDEE]">
              {currentIndex + 1} / {appointments.length}
            </span>
            <button onClick={handleNext} disabled={currentIndex === appointments.length - 1}
              className="p-2 rounded-full hover:bg-[#C2F84F] hover:text-[#1F3A4B] transition-all duration-200 disabled:opacity-10 text-[#1F3A4B] dark:text-[#C2F84F]">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {appointments.length > 0 && currentAppointment ? (
        <div className="flex-1 flex flex-col justify-between relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                currentAppointment.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                currentAppointment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              }`}>{currentAppointment.type}</span>
            </div>
            <p className="text-lg sm:text-xl font-black italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] leading-tight flex items-center gap-3">
              <User size={18} className="opacity-40" />
              {currentAppointment.provider}
            </p>
            {currentAppointment.reason && (
              <p className="text-[10px] font-bold text-[#1F3A4B]/60 dark:text-white/40 ml-7 italic">
                {currentAppointment.reason}
              </p>
            )}
            <div className="flex items-center gap-2 text-[#1F3A4B]/60 dark:text-white/40 ml-7">
              <Activity size={12} className="text-[#C2F84F]" />
              <p className="text-[11px] font-bold uppercase tracking-widest leading-none">
                {formatDateTime(currentAppointment.dateTime)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between mt-4">
            {/* Video call button — shown when accepted & meetLink exists (Issue 2) */}
            {currentAppointment.status === 'accepted' && currentAppointment.link ? (
              <a
                href={currentAppointment.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-3 px-6 py-3 bg-[#C2F84F] text-[#1F3A4B] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl text-xs font-black uppercase italic tracking-widest leading-none"
              >
                <Video size={16} className="transition-transform group-hover:rotate-12" />
                Join Video Call
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
            ) : currentAppointment.status === 'accepted' ? (
              <span className="text-[9px] font-black italic uppercase tracking-widest text-[#1F3A4B]/40 dark:text-white/20">
                Clinic Visitation Required
              </span>
            ) : (
              <span className="text-[9px] font-black italic uppercase tracking-widest text-[#1F3A4B]/40 dark:text-white/20">
                Awaiting Doctor Response
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#1F3A4B]/40 dark:text-white/30 text-center">
          <p className="text-sm font-black italic uppercase tracking-widest mb-1">Schedule is Clear</p>
          <p className="text-[10px] font-bold uppercase opacity-60">No patient directives found</p>
        </div>
      )}
    </div>
  );
}

export default CurrentAppointments;
