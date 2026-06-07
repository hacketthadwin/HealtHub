import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Video, IndianRupee, CalendarCheck, CheckCircle, TriangleAlert
} from 'lucide-react';
import Header1 from './UIcomponents/Header1';
import { API_URL } from '../config/api';

const socket = io(`${API_URL}`);


const AcceptModal = ({ request, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({
    scheduledDate:       '',
    scheduledTime:       '',
    slotDurationMinutes: 30,
  });

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.scheduledDate || !form.scheduledTime) {
      toast.error('Please set both a date and a time.');
      return;
    }
    onSubmit(request.id, form);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#FAFDEE] dark:bg-[#0d131b] rounded-[2.5rem] p-8 shadow-2xl border border-[#1F3A4B]/10 dark:border-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 text-[#1F3A4B] dark:text-white transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-[#1F3A4B] text-[#C2F84F]">
            <CalendarCheck size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE] leading-none">
              Propose Consultation Time
            </h3>
            <p className="text-[10px] font-bold text-[#1F3A4B]/50 dark:text-white/40 uppercase tracking-widest mt-0.5">
              Patient: {request.patient}
            </p>
          </div>
        </div>

        <div className="bg-[#1F3A4B]/5 dark:bg-white/5 rounded-2xl p-4 mb-6 text-xs font-bold text-[#1F3A4B]/70 dark:text-white/60 italic">
          <span className="font-black text-[#1F3A4B] dark:text-white not-italic">Reason: </span>
          {request.reason}
        </div>

        <div className="space-y-4">
          {}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#1F3A4B] dark:text-[#FAFDEE] mb-1.5">
              Date
            </label>
            <input
              type="date"
              min={today}
              value={form.scheduledDate}
              onChange={(e) => handleChange('scheduledDate', e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-sm"
            />
          </div>

          {}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#1F3A4B] dark:text-[#FAFDEE] mb-1.5">
              Time
            </label>
            <input
              type="time"
              value={form.scheduledTime}
              onChange={(e) => {

                const [h, m]  = e.target.value.split(':').map(Number);
                const ampm    = h >= 12 ? 'PM' : 'AM';
                const h12     = h % 12 || 12;
                handleChange('scheduledTime', `${h12}:${String(m).padStart(2, '0')} ${ampm}`);

                handleChange('_rawTime', e.target.value);
              }}
              className="w-full p-3 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-sm"
            />
          </div>

          {}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#1F3A4B] dark:text-[#FAFDEE] mb-1.5">
              Duration
            </label>
            <select
              value={form.slotDurationMinutes}
              onChange={(e) => handleChange('slotDurationMinutes', Number(e.target.value))}
              className="w-full p-3 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-sm cursor-pointer"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-[#1F3A4B]/20 dark:border-white/20 text-[#1F3A4B] dark:text-white font-black text-sm uppercase tracking-widest hover:border-rose-400 hover:text-rose-500 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? 'Accepting...' : 'Confirm & Accept'}
          </button>
        </div>
      </div>
    </div>
  );
};


const DoctorPage = () => {
  const navigate     = useNavigate();
  const chatEndRef   = useRef(null);
  const fileInputRef = useRef(null);

  const [userId,       setUserId]       = useState(null);
  const [userName,     setUserName]     = useState('User');
  const [consultingFee,          setConsultingFee]          = useState(null);
  const [consultingFeeConfirmed, setConsultingFeeConfirmed] = useState(false);
  const [feeInput,               setFeeInput]               = useState('');
  const [updatingFee,            setUpdatingFee]            = useState(false);
  const feePanelRef = useRef(null);

  const [patients,         setPatients]         = useState([]);
  const [pendingRequests,  setPendingRequests]  = useState([]);
  const [todaysAppointments, setTodaysAppointments] = useState([]);

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

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);


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
    } catch {

    }
  }, []);


  const fetchAppointments = useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) { navigate('/login'); return; }

    try {
      const decoded = jwtDecode(token);
      setUserName(decoded.name || 'User');
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
            id:           r.patientId._id,
            name:         r.patientId.name || 'Unknown Patient',
            symptoms:     r.reason,
            status:       r.status,
            meetLink:     r.meetLink || null,
            requestId:    r._id,
            scheduledTime: r.proposedByDoctor?.scheduledTime || null,
            scheduledDate: r.proposedByDoctor?.scheduledDate || null,
          });
          return acc;
        }, []);


      const todayStr = new Date().toDateString();
      const todays = all
        .filter((r) => {
          if (r.status !== 'PAID_CONFIRMED') return false;
          if (!r.proposedByDoctor?.scheduledDate) return false;
          return new Date(r.proposedByDoctor.scheduledDate).toDateString() === todayStr;
        })
        .map((r) => ({
          id:       r._id,
          patient:  r.patientId?.name || 'Unknown Patient',
          time:     r.proposedByDoctor?.scheduledTime || 'TBD',
          meetLink: r.meetLink || null,
        }));

      setPendingRequests(pending);
      setPatients(confirmed);
      setTodaysAppointments(todays);
    } catch (err) {
      toast.error('Error loading appointments');
      if (err.response?.status === 401) { localStorage.clear(); navigate('/login'); }
    }
  }, [navigate, fetchProfile]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);


  useEffect(() => {
    if (!userId) return;
    socket.on('previousMessages', (prev) => {
      setMessages(prev.map((msg) => ({
        text:        msg.message || '',
        sender:      msg.sender === userId ? 'doctor' : 'patient',
        timestamp:   msg.timestamp,
        fileUrl:     msg.fileUrl || null,
        fileName:    msg.fileName || null,
        fileType:    msg.fileType || null,
        messageType: msg.messageType || 'text',
      })));
    });
    socket.on('receiveMessage', (msgData) => {
      setMessages((prev) => [...prev, {
        text:        msgData.message || '',
        sender:      msgData.senderId === userId ? 'doctor' : 'patient',
        timestamp:   msgData.timestamp,
        fileUrl:     msgData.fileUrl || null,
        fileName:    msgData.fileName || null,
        fileType:    msgData.fileType || null,
        messageType: msgData.messageType || 'text',
      }]);
    });
    return () => { socket.off('previousMessages'); socket.off('receiveMessage'); };
  }, [userId]);

  const handleOpenChat = (patient) => {
    setChatPatient(patient);
    setChatOpen(true);
    setMessages([]);
    const roomId = [userId, patient.id].sort().join('_');
    if (userId) socket.emit('joinRoom', { roomId, userId, role: 'doctor' });
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
        socket.emit('sendMessage', {
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
      socket.emit('sendMessage', {
        roomId, senderId: userId, senderName: userName,
        receiverId: chatPatient.id, message: inputMessage,
      });
      setInputMessage('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 text-[#1F3A4B] dark:text-[#FAFDEE] font-sans overflow-x-hidden">
      <ToastContainer autoClose={2500} />
      <Header1 />


      {acceptModal.open && (
        <AcceptModal
          request={acceptModal.request}
          onClose={() => setAcceptModal({ open: false, request: null })}
          onSubmit={handleAcceptSubmit}
          loading={acceptLoading}
        />
      )}


      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>


      <header className="relative z-10 px-4 md:px-10 pt-4 md:pt-6 pb-2 flex items-center gap-4">
        <div className="p-1 rounded-full bg-gradient-to-tr from-[#1F3A4B] to-[#C2F84F] shrink-0">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white dark:bg-[#1F3A4B] flex items-center justify-center">
            <Stethoscope size={26} className="text-[#1F3A4B] dark:text-[#C2F84F]" />
          </div>
        </div>
        <div className="flex items-center gap-3">

          <span className="px-3 py-1 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-black text-[8px] md:text-[10px] rounded-full uppercase tracking-widest flex items-center gap-1">
            <IndianRupee size={10} />
            {consultingFee ? `₹${consultingFee}/session` : 'Fee Not Set'}
          </span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      <main className="relative z-10 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-10 pb-24">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          {}

          {!consultingFeeConfirmed && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-[2rem] shadow-md">
              <TriangleAlert className="text-amber-500 shrink-0 mt-0.5" size={22} />
              <div className="flex-1">
                <p className="font-black text-amber-800 dark:text-amber-300 text-sm uppercase tracking-wide">
                  Consulting fee not confirmed
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
                  {consultingFee
                    ? `Patients currently see ₹${consultingFee}/session (migration default). Update it to your actual rate.`
                    : 'Set your consulting fee so patients can find and book you.'}
                </p>
              </div>
              <button
                onClick={() => feePanelRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="shrink-0 px-5 py-2 bg-amber-400 text-amber-900 font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-md"
              >
                Set Fee Now
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-[#1F3A4B] text-[#FAFDEE] shadow-2xl relative overflow-hidden group">
              <UserCheck className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150" size={100} />
              <p className="text-[10px] font-black uppercase text-[#C2F84F] mb-2 tracking-widest">Confirmed Patients</p>
              <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">{patients.length} Total</h3>
            </div>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white dark:bg-white/5 border-2 border-[#1F3A4B]/10 dark:border-white/10 shadow-xl relative group">
              <Clock className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:rotate-12 transition-transform duration-500" size={100} />
              <p className="text-[10px] font-black uppercase opacity-40 text-[#1F3A4B] dark:text-[#FAFDEE] tracking-widest">Awaiting Decision</p>
              <h3 className="text-3xl md:text-5xl font-black italic uppercase leading-none mt-2">{pendingRequests.length} Requests</h3>
            </div>
          </div>

          {}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-8 border-2 border-[#1F3A4B]/10 dark:border-white/20 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter mb-6 uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">Calendar</h2>
              <style>{`
                .react-calendar { border: none !important; background: transparent !important; width: 100% !important; }
                .react-calendar__navigation button { font-weight: 900 !important; font-style: italic; border: none !important; background: none !important; min-width: 44px; color: #1F3A4B !important; }
                .dark .react-calendar__navigation button { color: #FAFDEE !important; }
                .react-calendar__navigation button:enabled:hover { color: #C2F84F !important; }
                .react-calendar__month-view__weekdays__weekday { text-transform: uppercase; font-weight: 900; opacity: 0.6; color: #1F3A4B; }
                .dark .react-calendar__month-view__weekdays__weekday { color: #FAFDEE; }
                .react-calendar__tile { padding: 1.2em 0.5em !important; border-radius: 1.2rem !important; font-weight: 800 !important; border: none !important; }
                .react-calendar__tile--active { background: #1F3A4B !important; color: #C2F84F !important; }
                .dark .react-calendar__tile--active { background: #C2F84F !important; color: #1F3A4B !important; }
              `}</style>
              <Calendar onChange={setCalendarDate} value={calendarDate} />
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border-2 border-[#1F3A4B]/10 dark:border-white/20 shadow-2xl min-h-[380px]">
              <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter mb-6 uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">Today's Schedule</h2>
              <div className="space-y-4">
                {todaysAppointments.length === 0 ? (
                  <p className="text-center py-16 opacity-40 italic font-medium text-sm uppercase tracking-wider">No appointments today</p>
                ) : (
                  todaysAppointments.map((app) => (
                    <div key={app.id} className="p-5 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold italic text-base uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">{app.patient}</p>
                          <p className="text-xs opacity-60 font-medium tracking-wide uppercase mt-0.5">{app.time}</p>
                        </div>
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700">
                          <CheckCircle size={10} /> Paid
                        </span>
                      </div>
                      {app.meetLink && (
                        <a
                          href={app.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#C2F84F] text-[#1F3A4B] rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all w-fit shadow-md"
                        >
                          <Video size={12} /> Start Call
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border-2 border-[#1F3A4B]/10 shadow-3xl">
            <h2 className="text-2xl md:text-4xl font-black italic mb-8 flex items-center gap-4 uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE]">
              <Clock size={32} className="text-[#C2F84F] dark:text-[#1F3A4B] bg-[#1F3A4B] dark:bg-[#C2F84F] p-1.5 rounded-xl shrink-0" />
              Pending Requests
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {pendingRequests.length === 0 ? (
                <p className="text-center py-20 italic font-medium text-base uppercase tracking-wider opacity-40">No pending requests</p>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-transparent hover:border-[#C2F84F] flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all shadow-md">
                    <div>
                      {}
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#C2F84F]/20 text-[#476407] mb-2">
                        <IndianRupee size={9} />₹{req.feeRupees} consultation
                      </span>
                      <p className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE]">{req.patient}</p>
                      <p className="text-sm text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 font-medium mt-1.5">
                        <span className="font-semibold text-xs uppercase tracking-wider">Reason: </span>{req.reason}
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      {}
                      <button
                        onClick={() => handleAcceptOpen(req)}
                        className="px-6 py-3 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-bold rounded-xl md:rounded-2xl text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-md"
                      >
                        Accept & Schedule
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="p-3 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl md:rounded-2xl hover:bg-rose-600 hover:text-white transition-all"
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

        {}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <button
            onClick={() => navigate('/community-support')}
            className="w-full py-8 md:py-12 px-6 md:px-10 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-[#1F3A4B] to-[#2a4d61] text-white flex justify-between items-center transition-all shadow-2xl border-2 border-transparent hover:border-[#C2F84F]"
          >
            <div className="text-left">
              <h2 className="text-2xl md:text-4xl font-black italic uppercase">Community Support</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#C2F84F] mt-1">Connect Globally</p>
            </div>
            <ChevronRight size={24} />
          </button>

          {}
          <div ref={feePanelRef} className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-8 border-2 border-amber-400/40 shadow-3xl transition-all" style={!consultingFeeConfirmed ? {borderColor: 'rgb(251 191 36 / 0.6)'} : {}}>
            <h2 className="text-lg md:text-xl font-black italic uppercase mb-4 text-[#1F3A4B] dark:text-[#FAFDEE] flex items-center gap-2">
              <IndianRupee size={18} className="text-[#C2F84F]" />
              My Consulting Fee
              {!consultingFeeConfirmed && <span className="ml-auto text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Not Set</span>}
            </h2>
            <p className="text-[10px] text-[#1F3A4B]/50 dark:text-white/40 font-bold uppercase tracking-widest mb-4">
              Patients are charged this amount per confirmed appointment
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F3A4B]/40 font-black text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-3 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-sm"
                  placeholder="e.g. 500"
                />
              </div>
              <button
                onClick={handleFeeUpdate}
                disabled={updatingFee}
                className="px-5 py-3 bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
              >
                {updatingFee ? '...' : 'Set'}
              </button>
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border-2 border-[#1F3A4B]/10 shadow-3xl backdrop-blur-md relative overflow-hidden">
            <h2 className="text-xl md:text-2xl font-black italic uppercase mb-6 text-[#1F3A4B] dark:text-[#FAFDEE]">My Patients</h2>
            <div className="block lg:hidden">
              <button
                onClick={() => setShowPatientList(true)}
                className="w-full py-8 px-6 rounded-[2rem] bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] flex justify-between items-center shadow-xl transition-all"
              >
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Confirmed</p>
                  <h3 className="text-xl font-black italic uppercase">View List</h3>
                </div>
                <Users size={24} />
              </button>
            </div>
            <div className="hidden lg:block space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {patients.length === 0 ? (
                <p className="text-center py-20 italic opacity-40 text-sm font-medium uppercase tracking-wider">No confirmed patients yet</p>
              ) : (
                patients.map((p) => (
                  <div key={p.id} className="p-5 rounded-[1.5rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-transparent hover:border-[#C2F84F] flex flex-col items-start transition-all shadow-sm">
                    <p className="text-lg font-black italic uppercase leading-none mb-1 text-[#1F3A4B] dark:text-[#FAFDEE]">{p.name}</p>
                    {p.scheduledTime && (
                      <p className="text-[9px] font-bold uppercase opacity-50 tracking-widest mb-3">{p.scheduledTime}</p>
                    )}
                    <div className="flex justify-between w-full items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase opacity-60 tracking-wider">Paid & Confirmed</span>
                      <div className="flex items-center gap-2">
                        {p.meetLink && (
                          <a href={p.meetLink} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#C2F84F] text-[#1F3A4B] shadow-md hover:scale-105 transition-all">
                            <Video size={14} />
                          </a>
                        )}
                        <button onClick={() => handleOpenChat(p)} className="p-3 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] shadow-lg hover:scale-105 transition-transform">
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

      {}
      <div className={`fixed inset-0 z-[120] bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 lg:hidden ${showPatientList ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col pt-24 relative">
          <button onClick={() => setShowPatientList(false)} className="absolute top-6 left-6 z-20 group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-[#1F3A4B]/20 dark:border-white/10 bg-white/50 dark:bg-[#1F3A4B]/20 backdrop-blur-md text-[#1F3A4B] dark:text-[#FAFDEE] font-bold text-xs tracking-widest">
            <ArrowLeft size={16} /><span>BACK</span>
          </button>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">My Patients</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pb-12 pr-2 scrollbar-hide">
            {patients.map((p) => (
              <div key={p.id} onClick={() => { handleOpenChat(p); setShowPatientList(false); }}
                className="p-6 rounded-[2rem] bg-white dark:bg-[#111827] border border-[#1F3A4B]/10 active:border-[#C2F84F] flex justify-between items-center transition-all shadow-md cursor-pointer">
                <div>
                  <h3 className="text-xl font-black italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">{p.name}</h3>
                  <p className="text-[10px] font-semibold opacity-40 uppercase tracking-widest mt-1">Confirmed</p>
                </div>
                <MessageSquare size={20} className="text-[#1F3A4B] dark:text-[#C2F84F] opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] z-[150] transition-all duration-500 ${chatOpen ? 'translate-x-0 visible' : 'translate-x-full invisible'}`}>
        <div className="absolute inset-0 bg-white dark:bg-[#0d131b] border-l-4 border-[#1F3A4B] shadow-2xl" />
        <div className="h-full p-6 md:p-8 flex flex-col relative z-10 text-[#1F3A4B] dark:text-[#FAFDEE]">
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-4">
              <span className="p-2 md:p-3 bg-[#1F3A4B] dark:bg-[#C2F84F] rounded-2xl text-[#C2F84F] dark:text-[#1F3A4B]"><Heart size={20} /></span>
              <h2 className="text-lg md:text-2xl font-black italic uppercase">{chatPatient?.name}</h2>
            </div>
            <button onClick={handleCloseChat} className="p-2 bg-[#1F3A4B]/5 hover:bg-rose-600 hover:text-white transition-all rounded-full"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 px-1 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 text-[11px] font-bold leading-relaxed max-w-[85%] rounded-2xl ${m.sender === 'doctor' ? 'bg-[#1F3A4B] text-[#FAFDEE] rounded-tr-none shadow-md' : 'bg-[#C2F84F] text-[#1F3A4B] rounded-tl-none'}`}>
                  {m.messageType === 'file' ? (
                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline font-black">
                      <FileText size={14} />{m.fileName || 'View Document'}
                    </a>
                  ) : <span>{m.text}</span>}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {selectedFile && (
            <div className="mt-2 px-4 py-2 bg-[#C2F84F]/20 rounded-xl flex items-center justify-between">
              <span className="text-[10px] font-black truncate">{selectedFile.name}</span>
              <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 text-rose-500"><X size={14} /></button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="mt-4 bg-[#1F3A4B]/5 dark:bg-white/5 p-1 rounded-full border border-[#1F3A4B]/20 flex items-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-10 w-10 rounded-full flex items-center justify-center text-[#1F3A4B]/50 hover:text-[#1F3A4B] transition-all ml-1">
              <Paperclip size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
            <input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 font-bold text-xs outline-none"
              placeholder={selectedFile ? 'Press send to upload...' : 'Type a message...'}
              disabled={!!selectedFile}
            />
            <button type="submit" disabled={isUploading}
              className="h-10 w-10 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center transition-all disabled:opacity-50">
              {isUploading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorPage;