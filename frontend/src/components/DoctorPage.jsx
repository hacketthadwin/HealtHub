import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  MessageSquare, Users, Send, ChevronRight, X, Stethoscope,
  Clock, UserCheck, ArrowLeft, Heart, Paperclip, FileText,
  Video, IndianRupee, CalendarCheck, CheckCircle, TriangleAlert,
  Ban,
} from 'lucide-react';
import Header1 from './UIcomponents/Header1';
import { API_URL } from '../config/api';

const rawTimeTo12h = (raw) => {
  if (!raw) return '';
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const isAbortEligible = (booking) => {
  if (!booking?.scheduledDate) return false;
  const slotEnd = new Date(
    new Date(booking.scheduledDate).getTime() +
    (booking.slotDurationMinutes || 30) * 60 * 1000
  );
  return new Date() > slotEnd;
};

// ─── Abort Confirmation Modal ──────────────────────────────────────────────
const AbortConfirmModal = ({ booking, onClose, onConfirm, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 font-roboto-slab">
    <div className="w-full max-w-md bg-[#FAFDEE] dark:bg-[#0d131b] rounded-[2.5rem] p-8 shadow-2xl border border-[#1F3A4B]/10 dark:border-white/10 relative">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 p-2 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 text-[#1F3A4B] dark:text-white transition-all"
      >
        <X size={20} />
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
          <TriangleAlert size={20} />
        </div>
        <div>
          <h3 className="text-xl font-extrabold italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] leading-none font-sans">
            MARK AS EXPIRED
          </h3>
          <p className="text-xs font-bold text-[#1F3A4B]/50 dark:text-white/40 uppercase tracking-widest mt-1.5">
            PATIENT: {booking?.patient?.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-400/40 rounded-2xl p-5 mb-6">
        <p className="text-base font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide leading-relaxed">
          APPOINTMENT TIME HAS ALREADY PASSED. DO YOU WANT TO MARK THIS APPOINTMENT AS EXPIRED?
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-bold uppercase tracking-wide">
          THE PATIENT WILL BE NOTIFIED BY EMAIL. THIS APPOINTMENT WILL MOVE TO CONSULTATION HISTORY.
        </p>
      </div>

      {booking?.scheduledDate && (
        <div className="bg-[#1F3A4B]/5 dark:bg-white/5 rounded-2xl p-4 mb-6 text-xs font-bold uppercase tracking-widest text-[#1F3A4B]/60 dark:text-white/50 text-center">
          📅 {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          &nbsp;·&nbsp;⏰ {booking.scheduledTime || 'N/A'}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-4 rounded-2xl border-2 border-[#1F3A4B]/20 dark:border-white/20 text-[#1F3A4B] dark:text-white font-bold text-sm uppercase tracking-widest hover:border-rose-400 hover:text-rose-500 transition-all"
        >
          CANCEL
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Ban size={16} />
          )}
          {loading ? 'MARKING...' : 'MARK EXPIRED'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Accept Scheduling Modal ───────────────────────────────────────────────
const AcceptModal = ({ request, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({
    scheduledDate:       '',
    rawTime:             '',
    scheduledTime:       '',
    slotDurationMinutes: 30,
  });

  const today = new Date().toISOString().split('T')[0];

  const handleDateChange = (value) =>
    setForm((prev) => ({ ...prev, scheduledDate: value }));

  const handleTimeChange = (raw24h) => {
    const ampm = rawTimeTo12h(raw24h);
    setForm((prev) => ({
      ...prev,
      rawTime:       raw24h,
      scheduledTime: ampm,
    }));
  };

  const handleSubmit = () => {
    if (!form.scheduledDate || !form.rawTime) {
      toast.error('Please set both a date and a time.');
      return;
    }
    onSubmit(request.id, {
      scheduledDate:       form.scheduledDate,
      scheduledTime:       form.scheduledTime,
      slotDurationMinutes: form.slotDurationMinutes,
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 font-roboto-slab">
      <style>{`
        .accept-modal-input[type="date"],
        .accept-modal-input[type="time"] { color-scheme: light; }
        .dark .accept-modal-input[type="date"],
        .dark .accept-modal-input[type="time"] { color-scheme: dark; color: #FAFDEE; }
        .accept-modal-input[type="date"]::-webkit-calendar-picker-indicator,
        .accept-modal-input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.3) sepia(1) saturate(5) hue-rotate(60deg);
          cursor: pointer; opacity: 0.7;
        }
        .dark .accept-modal-input[type="date"]::-webkit-calendar-picker-indicator,
        .dark .accept-modal-input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.4); opacity: 0.85;
        }
      `}</style>

      <div className="w-full max-w-md bg-[#FAFDEE] dark:bg-[#0d131b] rounded-[2.5rem] p-8 shadow-2xl border border-[#1F3A4B]/10 dark:border-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 text-[#1F3A4B] dark:text-white transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-[#1F3A4B] text-[#C2F84F] shadow-md">
            <CalendarCheck size={22} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] leading-none font-sans">
              Propose Consultation Time
            </h3>
            <p className="text-xs font-bold text-[#1F3A4B]/50 dark:text-white/40 uppercase tracking-widest mt-1.5">
              PATIENT: {request.patient?.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="bg-[#1F3A4B]/5 dark:bg-white/5 rounded-2xl p-4 mb-6 text-sm font-bold text-[#1F3A4B]/70 dark:text-white/60 italic uppercase tracking-wide">
          <span className="font-extrabold text-[#1F3A4B] dark:text-white not-italic">REASON: </span>
          {request.reason}
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#1F3A4B] dark:text-[#FAFDEE] mb-2 ml-1">
              DATE
            </label>
            <input
              type="date"
              min={today}
              value={form.scheduledDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="accept-modal-input w-full p-4 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-base"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#1F3A4B] dark:text-[#FAFDEE] mb-2 ml-1">
              TIME
            </label>
            <input
              type="time"
              value={form.rawTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="accept-modal-input w-full p-4 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-base"
            />
            {form.scheduledTime && (
              <p className="mt-2 ml-1 text-xs font-bold text-[#C2F84F] uppercase tracking-widest">
                SELECTED: {form.scheduledTime}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#1F3A4B] dark:text-[#FAFDEE] mb-2 ml-1">
              DURATION
            </label>
            <select
              value={form.slotDurationMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, slotDurationMinutes: Number(e.target.value) }))}
              className="w-full p-4 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-base cursor-pointer uppercase tracking-wide"
            >
              <option value={15} className="text-sm">15 MINUTES</option>
              <option value={30} className="text-sm">30 MINUTES</option>
              <option value={45} className="text-sm">45 MINUTES</option>
              <option value={60} className="text-sm">60 MINUTES</option>
            </select>
          </div>

          {form.scheduledDate && form.scheduledTime && (
            <div className="bg-[#C2F84F]/10 dark:bg-[#C2F84F]/5 border border-[#C2F84F]/30 rounded-2xl p-4 text-xs font-bold uppercase tracking-widest text-[#476407] dark:text-[#C2F84F] text-center">
              📅 {form.scheduledDate} · ⏰ {form.scheduledTime} · ⏱ {form.slotDurationMinutes} MIN
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border-2 border-[#1F3A4B]/20 dark:border-white/20 text-[#1F3A4B] dark:text-white font-bold text-sm uppercase tracking-widest hover:border-rose-400 hover:text-rose-500 transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-4 rounded-2xl bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? 'ACCEPTING...' : 'CONFIRM & ACCEPT'}
          </button>
        </div>
      </div>
    </div>
  );
};

// fetch the file as a blob then trigger a real browser download.
// the HTML `download` attribute is only honoured for same-origin URLs;
// for cross-origin URLs (Cloudinary) the browser silently ignores it.
// creating a local blob: URL makes the link same-origin, so the
// download attribute is respected and the file saves with the correct name.
const handleFileDownload = async (fileUrl, fileName) => {
  try {
    const res  = await fetch(fileUrl);
    if (!res.ok) throw new Error('fetch failed');
    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link    = document.createElement('a');
    link.href     = blobUrl;
    link.download = fileName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // fallback: open in new tab so nothing is lost
    window.open(fileUrl, '_blank');
  }
};


const DoctorPage = () => {
  const navigate     = useNavigate();
  const chatEndRef   = useRef(null);
  const fileInputRef = useRef(null);

  const socketRef    = useRef(null);

  const [userId,       setUserId]       = useState(null);
  const [userName,     setUserName]     = useState('USER');
  const [consultingFee,          setConsultingFee]          = useState(null);
  const [consultingFeeConfirmed, setConsultingFeeConfirmed] = useState(false);
  const [feeInput,               setFeeInput]               = useState('');
  const [updatingFee,            setUpdatingFee]            = useState(false);
  const feePanelRef = useRef(null);

  const [patients,           setPatients]           = useState([]);
  const [pendingRequests,    setPendingRequests]     = useState([]);
  const [todaysAppointments, setTodaysAppointments] = useState([]);
  const [pastDueBookings,    setPastDueBookings]     = useState([]);

  const [chatOpen,      setChatOpen]      = useState(false);
  const [chatPatient,   setChatPatient]   = useState(null);
  const [calendarDate,  setCalendarDate]  = useState(new Date());
  const [messages,      setMessages]      = useState([]);
  const [inputMessage,  setInputMessage]  = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [isUploading,   setIsUploading]   = useState(false);

  const [acceptModal,   setAcceptModal]   = useState({ open: false, request: null });
  const [acceptLoading, setAcceptLoading] = useState(false);

  const [abortModal,   setAbortModal]   = useState({ open: false, booking: null });
  const [abortLoading, setAbortLoading] = useState(false);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);


  const fetchProfile = useCallback(async (token) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/v1/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.data) {
        if (data.data.consultingFee) {
          setConsultingFee(data.data.consultingFee / 100);
          setFeeInput(String(data.data.consultingFee / 100));
        }
        setConsultingFeeConfirmed(data.data.consultingFeeConfirmed ?? false);
      }
    } catch { /* silent */ }
  }, []);


  const fetchAppointments = useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) { navigate('/login'); return; }

    try {
      const decoded = jwtDecode(token);
      setUserName((decoded.name || 'USER').toUpperCase());
      setUserId(decoded.id);
    } catch {
      localStorage.clear(); navigate('/login'); return;
    }

    await fetchProfile(token);

    try {
      const { data } = await axios.get(
        `${API_URL}/api/v1/booking-requests/doctor/queue`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const all = data.data || [];
      const now = new Date();

      const pending = all
        .filter((r) => r.status === 'PENDING_DOCTOR_APPROVAL')
        .map((r) => ({
          id:          r._id,
          patient:     r.patientId?.name || 'Unknown Patient',
          reason:      r.reason,
          feeRupees:   r.consultingFeePaise / 100,
          originalReq: r,
        }));

      const seenPatients = new Set();
      const confirmed = all
        .filter((r) => r.status === 'PAID_CONFIRMED')
        .reduce((acc, r) => {
          const key = r.patientId?._id?.toString();
          if (!key || seenPatients.has(key)) return acc;
          seenPatients.add(key);
          acc.push({
            id:            r.patientId._id,
            name:          r.patientId.name || 'Unknown Patient',
            symptoms:      r.reason,
            status:        r.status,
            meetLink:      r.meetLink || null,
            requestId:     r._id,
            scheduledTime: r.proposedByDoctor?.scheduledTime || null,
            scheduledDate: r.proposedByDoctor?.scheduledDate || null,
          });
          return acc;
        }, []);

      const todayStr = now.toDateString();
      const todays = all
        .filter((r) => {
          if (r.status !== 'PAID_CONFIRMED') return false;
          if (!r.proposedByDoctor?.scheduledDate) return false;
          return new Date(r.proposedByDoctor.scheduledDate).toDateString() === todayStr;
        })
        .map((r) => ({
          id:                  r._id,
          patient:             r.patientId?.name || 'Unknown Patient',
          time:                r.proposedByDoctor?.scheduledTime || 'TBD',
          meetLink:            r.meetLink || null,
          scheduledDate:       r.proposedByDoctor?.scheduledDate || null,
          slotDurationMinutes: r.proposedByDoctor?.slotDurationMinutes || 30,
        }));

      const pastDue = all
        .filter((r) => {
          if (r.status !== 'PAID_CONFIRMED') return false;
          if (!r.proposedByDoctor?.scheduledDate) return false;
          const scheduledDate = new Date(r.proposedByDoctor.scheduledDate);
          if (scheduledDate.toDateString() === todayStr) return false;
          const durationMins = r.proposedByDoctor?.slotDurationMinutes || 30;
          const slotEnd = new Date(scheduledDate.getTime() + durationMins * 60 * 1000);
          return now > slotEnd;
        })
        .map((r) => ({
          id:                  r._id,
          patient:             r.patientId?.name || 'Unknown Patient',
          reason:              r.reason,
          scheduledTime:       r.proposedByDoctor?.scheduledTime || 'TBD',
          scheduledDate:       r.proposedByDoctor?.scheduledDate || null,
          slotDurationMinutes: r.proposedByDoctor?.slotDurationMinutes || 30,
          meetLink:            r.meetLink || null,
        }));

      setPendingRequests(pending);
      setPatients(confirmed);
      setTodaysAppointments(todays);
      setPastDueBookings(pastDue);
    } catch (err) {
      toast.error('Error loading appointments');
      if (err.response?.status === 401) { localStorage.clear(); navigate('/login'); }
    }
  }, [navigate, fetchProfile]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    if (!userId) return;

    const sock = io(API_URL);
    socketRef.current = sock;
    sock.emit('joinUserRoom', userId);

    const onPreviousMessages = (prev) => {
      setMessages(prev.map((msg) => ({
        text:        msg.message || '',
        sender:      msg.sender === userId ? 'doctor' : 'patient',
        timestamp:   msg.timestamp,
        fileUrl:     msg.fileUrl || null,
        fileName:    msg.fileName || null,
        fileType:    msg.fileType || null,
        messageType: msg.messageType || 'text',
      })));
    };

    const onReceiveMessage = (msgData) => {
      setMessages((prev) => [...prev, {
        text:        msgData.message || '',
        sender:      msgData.senderId === userId ? 'doctor' : 'patient',
        timestamp:   msgData.timestamp,
        fileUrl:     msgData.fileUrl || null,
        fileName:    msgData.fileName || null,
        fileType:    msgData.fileType || null,
        messageType: msgData.messageType || 'text',
      }]);
    };

    sock.on('previousMessages', onPreviousMessages);
    sock.on('receiveMessage',   onReceiveMessage);

    return () => {
      sock.off('previousMessages', onPreviousMessages);
      sock.off('receiveMessage',   onReceiveMessage);
      sock.disconnect();
    };
  }, [userId]);

  const todaysScheduleWithFlags = useMemo(() =>
    todaysAppointments.map((app) => ({ ...app, eligible: isAbortEligible(app) })),
    [todaysAppointments]
  );

  const handleOpenChat = (patient) => {
    setChatPatient(patient);
    setChatOpen(true);
    setMessages([]);
    const roomId = [userId, patient.id].sort().join('_');
    if (userId && socketRef.current) {
      socketRef.current.emit('joinRoom', { roomId, userId, role: 'doctor' });
    }
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setChatPatient(null);
    setMessages([]);
    setInputMessage('');
    setSelectedFile(null);
  };

  const handleReject = async (requestId) => {
    const token = localStorage.getItem('userToken');
    try {
      await axios.patch(
        `${API_URL}/api/v1/booking-requests/${requestId}/reject`,
        { rejectionReason: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Request rejected.');
      fetchAppointments();
    } catch {
      toast.error('Failed to reject request.');
    }
  };

  const handleAcceptOpen = (req) => {
    setAcceptModal({ open: true, request: req });
  };

  const handleAcceptSubmit = async (requestId, formData) => {
    const token = localStorage.getItem('userToken');
    setAcceptLoading(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/booking-requests/${requestId}/accept`,
        {
          scheduledDate:       formData.scheduledDate,
          scheduledTime:       formData.scheduledTime,
          slotDurationMinutes: formData.slotDurationMinutes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Request accepted! Patient has been notified to pay.');
      setAcceptModal({ open: false, request: null });
      fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to accept request.';
      toast.error(msg);
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleAbortOpen = (booking) => {
    setAbortModal({ open: true, booking });
  };

  const handleAbortConfirm = async () => {
    const token   = localStorage.getItem('userToken');
    const booking = abortModal.booking;
    if (!booking) return;

    setAbortLoading(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/booking-requests/${booking.id}/abort`,
        { abortReason: 'Consultation window passed — marked expired by doctor.' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Appointment marked as expired. Patient has been notified.');
      setAbortModal({ open: false, booking: null });
      fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark appointment as expired.';
      toast.error(msg);
    } finally {
      setAbortLoading(false);
    }
  };


  const handleFeeUpdate = async () => {
    const fee = parseFloat(feeInput);
    if (!fee || fee <= 0 || fee > 50000) {
      toast.error('Enter a valid fee between ₹1 and ₹50,000.');
      return;
    }
    const token = localStorage.getItem('userToken');
    setUpdatingFee(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/booking-requests/doctor/consulting-fee`,
        { consultingFeeRupees: fee },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConsultingFee(fee);
      setConsultingFeeConfirmed(true);
      toast.success(`Consulting fee set to ₹${fee}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update fee.');
    } finally {
      setUpdatingFee(false);
    }
  };


  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large. Max 10MB.'); return; }
    setSelectedFile(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('userToken');

    if (selectedFile && chatPatient) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const { data } = await axios.post(
          `${API_URL}/api/v1/upload/medical`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const roomId = [userId, chatPatient.id].sort().join('_');
        socketRef.current?.emit('sendMessage', {
          roomId, senderId: userId, senderName: userName, receiverId: chatPatient.id,
          message: '', fileUrl: data.url, fileName: data.fileName, fileType: data.fileType, messageType: 'file',
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch { toast.error('File upload failed.'); }
      finally { setIsUploading(false); }
      return;
    }

    if (inputMessage.trim() && chatPatient) {
      const roomId = [userId, chatPatient.id].sort().join('_');
      socketRef.current?.emit('sendMessage', {
        roomId, senderId: userId, senderName: userName,
        receiverId: chatPatient.id, message: inputMessage,
      });
      setInputMessage('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 text-[#1F3A4B] dark:text-[#FAFDEE] font-roboto-slab overflow-x-hidden antialiased">
      <ToastContainer autoClose={2500} />
      <Header1 />

      {/* ── Accept modal ── */}
      {acceptModal.open && (
        <AcceptModal
          request={acceptModal.request}
          onClose={() => setAcceptModal({ open: false, request: null })}
          onSubmit={handleAcceptSubmit}
          loading={acceptLoading}
        />
      )}

      {/* ── Abort confirmation modal ── */}
      {abortModal.open && (
        <AbortConfirmModal
          booking={abortModal.booking}
          onClose={() => !abortLoading && setAbortModal({ open: false, booking: null })}
          onConfirm={handleAbortConfirm}
          loading={abortLoading}
        />
      )}

      <div
        className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0"
        style={{ willChange: 'filter' }}
      >
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>

      {/* ── Page header ── */}
      <header className="relative z-10 px-4 md:px-10 pt-4 md:pt-6 pb-2 flex items-center gap-4">
        <div className="p-1 rounded-full bg-gradient-to-tr from-[#1F3A4B] to-[#C2F84F] shrink-0 shadow-md">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white dark:bg-[#1F3A4B] flex items-center justify-center">
            <Stethoscope size={26} className="text-[#1F3A4B] dark:text-[#C2F84F]" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-bold text-xs rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
            <IndianRupee size={12} />
            {consultingFee ? `₹${consultingFee} / SESSION` : 'FEE NOT SET'}
          </span>
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      <main className="relative z-10 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-10 pb-24">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">

          {/* ── Fee-not-confirmed banner ── */}
          {!consultingFeeConfirmed && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-[2rem] shadow-md">
              <TriangleAlert className="text-amber-500 shrink-0 mt-0.5" size={22} />
              <div className="flex-1">
                <p className="font-extrabold text-amber-800 dark:text-amber-300 text-sm uppercase tracking-wide">
                  CONSULTING FEE NOT CONFIRMED
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-bold uppercase tracking-wide">
                  {consultingFee
                    ? `PATIENTS CURRENTLY SEE ₹${consultingFee}/SESSION (MIGRATION DEFAULT). UPDATE IT TO YOUR ACTUAL RATE.`
                    : 'SET YOUR CONSULTING FEE SO PATIENTS CAN FIND AND BOOK YOU.'}
                </p>
              </div>
              <button
                onClick={() => feePanelRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="shrink-0 px-6 py-2.5 bg-amber-400 text-amber-900 font-bold text-xs uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                SET FEE NOW
              </button>
            </div>
          )}

          {/* ── Stats cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-[#1F3A4B] text-[#FAFDEE] shadow-2xl relative overflow-hidden group">
              <UserCheck className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150" size={100} />
              <p className="text-xs font-bold uppercase text-[#C2F84F] mb-2 tracking-widest">CONFIRMED PATIENTS</p>
              <h3 className="text-2xl md:text-4xl font-extrabold italic uppercase tracking-tighter font-sans leading-none">{patients.length} TOTAL</h3>
            </div>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white dark:bg-white/5 border-2 border-[#1F3A4B]/10 dark:border-white/5 shadow-xl relative group">
              <Clock className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:rotate-12 transition-transform duration-500" size={100} />
              <p className="text-xs font-bold uppercase opacity-50 text-[#1F3A4B] dark:text-[#FAFDEE] tracking-widest">AWAITING DECISION</p>
              <h3 className="text-2xl md:text-4xl font-extrabold italic uppercase leading-none mt-2 font-sans">{pendingRequests.length} REQUESTS</h3>
            </div>
          </div>

          {/* ── Calendar + Today's Schedule ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-8 border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-2xl">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold italic tracking-tighter mb-6 uppercase text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">CALENDAR</h2>
              <style>{`
                .react-calendar { border: none !important; background: transparent !important; width: 100% !important; }
                .react-calendar__navigation button { font-weight: 800 !important; font-style: italic; border: none !important; background: none !important; min-width: 44px; color: #1F3A4B !important; }
                .dark .react-calendar__navigation button { color: #FAFDEE !important; }
                .react-calendar__navigation button:enabled:hover { color: #C2F84F !important; }
                .react-calendar__month-view__weekdays__weekday { text-transform: uppercase; font-weight: 900; opacity: 0.6; color: #1F3A4B; }
                .dark .react-calendar__month-view__weekdays__weekday { color: #FAFDEE; }
                .react-calendar__month-view__days__day { color: #1F3A4B !important; }
                .dark .react-calendar__month-view__days__day { color: #FAFDEE !important; }
                .react-calendar__month-view__days__day--neighboringMonth { opacity: 0.25; }
                .react-calendar__tile { padding: 1.2em 0.5em !important; border-radius: 1.2rem !important; font-weight: 800 !important; border: none !important; }
                .react-calendar__tile--active { background: #1F3A4B !important; color: #C2F84F !important; }
                .dark .react-calendar__tile--active { background: #C2F84F !important; color: #1F3A4B !important; }
              `}</style>
              <Calendar onChange={setCalendarDate} value={calendarDate} />
            </div>

            {/* Today's Schedule */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-2xl min-h-[380px]">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold italic tracking-tighter mb-6 uppercase text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">TODAY'S SCHEDULE</h2>
              <div className="space-y-4">
                {todaysScheduleWithFlags.length === 0 ? (
                  <p className="text-center py-16 opacity-50 italic font-bold text-base uppercase tracking-wider">No appointments today</p>
                ) : (

                  todaysScheduleWithFlags.map((app) => {
                    const { eligible } = app;
                    return (
                      <div key={app.id} className={`p-5 rounded-2xl border flex flex-col gap-3 transition-all ${eligible ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/40' : 'bg-[#1F3A4B]/5 dark:bg-white/5 border-[#1F3A4B]/10'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-extrabold italic text-base uppercase text-[#1F3A4B] dark:text-[#FAFDEE] font-sans">{app.patient.toUpperCase()}</p>
                            <p className="text-xs opacity-60 font-bold tracking-wide uppercase mt-1">{app.time.toUpperCase()}</p>
                          </div>
                          {eligible ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 tracking-wider">
                              <Clock size={12} /> WINDOW PASSED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 tracking-wider">
                              <CheckCircle size={12} /> PAID
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {app.meetLink && !eligible && (
                            <a
                              href={app.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 px-5 py-2.5 bg-[#C2F84F] text-[#1F3A4B] rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all w-fit shadow-md"
                            >
                              <Video size={14} /> START CALL
                            </a>
                          )}
                          {eligible && (
                            <button
                              onClick={() => handleAbortOpen(app)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                            >
                              <Ban size={14} /> MARK AS EXPIRED
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Past Due Appointments ── */}
          {pastDueBookings.length > 0 && (
            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border-2 border-rose-500/20 shadow-2xl">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold italic mb-2 flex items-center gap-3 uppercase tracking-tighter text-rose-600 dark:text-rose-400 font-sans leading-none">
                <TriangleAlert size={28} className="shrink-0" />
                APPOINTMENTS REQUIRING ACTION
              </h2>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/60 font-bold uppercase tracking-widest mb-6">
                THESE CONFIRMED APPOINTMENTS HAVE PASSED THEIR SCHEDULED CONSULTATION WINDOW
              </p>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-rose-500/20
                dark:[&::-webkit-scrollbar-thumb]:bg-rose-500/10"
              >
                {pastDueBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/40 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all hover:border-rose-400 shadow-sm"
                  >
                    <div>
                      <p className="font-extrabold italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] text-base font-sans">{booking.patient.toUpperCase()}</p>
                      <p className="text-xs opacity-60 font-bold tracking-wide uppercase mt-1">
                        {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        }).toUpperCase()} · {booking.scheduledTime.toUpperCase()}
                      </p>
                      {booking.reason && (
                        <p className="text-xs text-[#1F3A4B]/50 dark:text-white/40 font-bold italic mt-1.5 max-w-xs truncate uppercase tracking-wide">
                          {booking.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAbortOpen(booking)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shrink-0 shadow-sm active:scale-95"
                    >
                      <Ban size={14} /> MARK AS EXPIRED
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Pending Requests ── */}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold italic mb-8 flex items-center gap-4 uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">
              <Clock size={32} className="text-[#C2F84F] dark:text-[#1F3A4B] bg-[#1F3A4B] dark:bg-[#C2F84F] p-1.5 rounded-xl shrink-0" />
              PENDING REQUESTS
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-[#1F3A4B]/20
              dark:[&::-webkit-scrollbar-thumb]:bg-white/10"
            >
              {pendingRequests.length === 0 ? (
                <p className="text-center py-20 italic font-bold text-base uppercase tracking-wider opacity-50">No pending requests</p>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-transparent hover:border-[#C2F84F] flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all shadow-md">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-[#C2F84F]/20 text-[#476407] mb-2 tracking-wider">
                        <IndianRupee size={10} />₹{req.feeRupees} CONSULTATION
                      </span>
                      <p className="text-xl md:text-2xl font-extrabold italic uppercase tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE] font-sans truncate">{req.patient.toUpperCase()}</p>
                      <p className="text-sm text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 font-bold mt-2 uppercase tracking-wide">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-[#1F3A4B] dark:text-white">REASON: </span>{req.reason}
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => handleAcceptOpen(req)}
                        className="px-6 py-3.5 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-bold rounded-xl md:rounded-2xl text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md"
                      >
                        Accept & Schedule
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="p-3.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl md:rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <button
            onClick={() => navigate('/community-support')}
            className="w-full py-8 md:py-12 px-6 md:px-10 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-[#1F3A4B] to-[#2a4d61] text-white flex justify-between items-center transition-all shadow-2xl border-2 border-transparent hover:border-[#C2F84F]"
          >
            <div className="text-left">
              <h2 className="text-2xl md:text-4xl font-extrabold italic uppercase font-sans leading-none mb-1.5">COMMUNITY SUPPORT</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C2F84F]">CONNECT GLOBALLY</p>
            </div>
            <ChevronRight size={24} />
          </button>

          {/* Fee panel */}
          <div ref={feePanelRef} className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-8 border-2 border-transparent border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl transition-all" style={!consultingFeeConfirmed ? { borderColor: 'rgb(251 191 36 / 0.6)', borderWidth: '2px' } : {}}>
            <h2 className="text-base md:text-lg font-extrabold italic uppercase mb-4 text-[#1F3A4B] dark:text-[#FAFDEE] flex items-center gap-2 font-sans leading-none">
              <IndianRupee size={18} className="text-[#C2F84F]" />
              MY CONSULTING FEE
              {!consultingFeeConfirmed && <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full uppercase tracking-widest">NOT SET</span>}
            </h2>
            <p className="text-xs text-[#1F3A4B]/50 dark:text-white/40 font-bold uppercase tracking-widest mb-4">
              PATIENTS ARE CHARGED THIS AMOUNT PER CONFIRMED APPOINTMENT
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F3A4B]/40 font-bold text-sm">₹</span>
                <input
                  type="number" min="1" max="50000"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-3.5 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-sm uppercase tracking-wide"
                  placeholder="e.g. 500"
                />
              </div>
              <button
                onClick={handleFeeUpdate}
                disabled={updatingFee}
                className="px-5 py-3.5 bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] font-bold rounded-2xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {updatingFee ? '...' : 'SET'}
              </button>
            </div>
          </div>

          {/* My Patients */}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl backdrop-blur-md relative overflow-hidden">
            <h2 className="text-xl md:text-2xl font-extrabold italic uppercase mb-6 text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">MY PATIENTS</h2>
            <div className="block lg:hidden">
              <button
                onClick={() => setShowPatientList(true)}
                className="w-full py-8 px-6 rounded-[2rem] bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] flex justify-between items-center shadow-xl transition-all active:scale-95"
              >
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">CONFIRMED</p>
                  <h3 className="text-xl font-extrabold italic uppercase font-sans">VIEW LIST</h3>
                </div>
                <Users size={24} />
              </button>
            </div>
            <div className="hidden lg:block space-y-4 max-h-[600px] overflow-y-auto pr-2
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-[#1F3A4B]/20
              dark:[&::-webkit-scrollbar-thumb]:bg-white/10"
            >
              {patients.length === 0 ? (
                <p className="text-center py-20 italic opacity-40 text-sm font-bold uppercase tracking-wider">No confirmed patients yet</p>
              ) : (
                patients.map((p) => (
                  <div key={p.id} className="p-5 rounded-[1.5rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-transparent hover:border-[#C2F84F] flex flex-col items-start transition-all shadow-sm">
                    <p className="text-lg font-extrabold italic uppercase leading-none mb-1 text-[#1F3A4B] dark:text-[#FAFDEE] font-sans">{p.name.toUpperCase()}</p>
                    {p.scheduledTime && (
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-3">{p.scheduledTime.toUpperCase()}</p>
                    )}
                    <div className="flex justify-between w-full items-center gap-2">
                      <span className="text-[10px] font-bold uppercase opacity-60 tracking-wider">PAID & CONFIRMED</span>
                      <div className="flex items-center gap-2">
                        {p.meetLink && (
                          <a href={p.meetLink} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#C2F84F] text-[#1F3A4B] shadow-md hover:scale-105 active:scale-95 transition-all">
                            <Video size={14} />
                          </a>
                        )}
                        <button onClick={() => handleOpenChat(p)} className="p-3 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] shadow-lg hover:scale-105 active:scale-95 transition-transform">
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile patient list overlay ── */}
      <div className={`fixed inset-0 z-[120] bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 lg:hidden ${showPatientList ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col pt-24 relative">
          <button onClick={() => setShowPatientList(false)} className="absolute top-6 left-4 z-20 group flex items-center justify-center gap-3.5 h-12 w-12 rounded-full border border-neutral-200/40 dark:border-white/5 bg-white/40 dark:bg-neutral-950/20 backdrop-blur-md text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 text-sm font-bold tracking-widest transition-all duration-300 shadow-sm uppercase">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">MY PATIENTS</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pb-12 pr-2
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-[#1F3A4B]/20
            dark:[&::-webkit-scrollbar-thumb]:bg-white/10"
          >
            {patients.map((p) => (
              <div key={p.id} onClick={() => { handleOpenChat(p); setShowPatientList(false); }}
                className="p-6 rounded-[2rem] bg-white dark:bg-[#111827] border border-[#1F3A4B]/10 active:border-[#C2F84F] flex justify-between items-center transition-all shadow-md cursor-pointer"
              >
                <div>
                  <h3 className="text-xl font-extrabold italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">{p.name.toUpperCase()}</h3>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1.5">CONFIRMED</p>
                </div>
                <MessageSquare size={20} className="text-[#1F3A4B] dark:text-[#C2F84F] opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] z-[150] transition-all duration-500 ${chatOpen ? 'translate-x-0 visible' : 'translate-x-full invisible'}`}>
        <div className="absolute inset-0 bg-white dark:bg-[#0d131b] border-l-4 border-[#1F3A4B] dark:border-[#C2F84F] shadow-2xl" />
        <div className="h-full p-6 md:p-8 flex flex-col relative z-10 text-[#1F3A4B] dark:text-[#FAFDEE]">
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-4">
              <span className="p-3 bg-[#1F3A4B] dark:bg-[#C2F84F] rounded-2xl text-[#C2F84F] dark:text-[#1F3A4B] shadow-md"><Heart size={20} /></span>
              <h2 className="text-xl md:text-2xl font-extrabold italic uppercase font-sans leading-none">{chatPatient?.name?.toUpperCase()}</h2>
            </div>
            <button onClick={handleCloseChat} className="p-2.5 bg-[#1F3A4B]/5 dark:bg-white/5 hover:bg-rose-600 hover:text-white transition-all rounded-full shadow-sm active:scale-95"><X size={22} /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 px-1 min-h-0
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-[#1F3A4B]/20
            dark:[&::-webkit-scrollbar-thumb]:bg-white/10"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 text-sm font-bold leading-relaxed max-w-[85%] rounded-[1.5rem] shadow-sm ${m.sender === 'doctor' ? 'bg-[#1F3A4B] text-[#FAFDEE] rounded-tr-none shadow-md' : 'bg-[#C2F84F] text-[#1F3A4B] rounded-tl-none border border-transparent dark:border-white/5'}`}>
                  {m.messageType === 'file' ? (
                    <button
                      type="button"
                      onClick={() => handleFileDownload(m.fileUrl, m.fileName)}
                      className="flex items-center gap-2 underline font-extrabold uppercase text-xs tracking-wider border-0 bg-transparent p-0 cursor-pointer text-inherit"
                    >
                      <FileText size={16} />{m.fileName ? m.fileName.toUpperCase() : 'DOWNLOAD FILE'}
                    </button>
                  ) : <span className="uppercase tracking-wide">{m.text.toUpperCase()}</span>}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {selectedFile && (
            <div className="mt-3 px-5 py-3 bg-[#C2F84F]/20 rounded-xl flex items-center justify-between border border-[#C2F84F]/30 shadow-inner">
              <span className="text-xs font-bold truncate text-[#1F3A4B] dark:text-[#C2F84F] uppercase tracking-wide">{selectedFile.name}</span>
              <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 text-rose-500 hover:scale-105 transition-transform"><X size={16} /></button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="mt-4 bg-[#1F3A4B]/5 dark:bg-white/5 p-1 rounded-full border-2 border-[#1F3A4B]/10 dark:border-white/10 flex items-center shadow-inner">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-12 w-12 rounded-full flex items-center justify-center text-[#1F3A4B]/50 dark:text-white/40 hover:text-[#1F3A4B] dark:hover:text-[#C2F84F] transition-all ml-1">
              <Paperclip size={18} />
            </button>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
            <input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 font-bold text-sm uppercase tracking-wide placeholder:text-xs outline-none"
              placeholder={selectedFile ? 'PRESS SEND TO UPLOAD...' : 'TYPE A MESSAGE...'}
              disabled={!!selectedFile}
            />
            <button type="submit" disabled={isUploading}
              className="h-12 w-12 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center transition-all disabled:opacity-50 shadow-md shrink-0 active:scale-95"
            >
              {isUploading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorPage;