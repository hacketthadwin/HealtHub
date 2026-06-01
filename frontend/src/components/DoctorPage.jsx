import React, { useEffect, useState, useRef } from 'react';
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
  Clock, UserCheck, ArrowLeft, Heart, Paperclip, FileText, Video
} from 'lucide-react';
import Header1 from './UIcomponents/Header1';
import { API_URL } from '../config/api';

const socket = io(`${API_URL}`);

const DoctorPage = () => {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('User');
  const [userSubscription, setUserSubscription] = useState('Free');
  const [patients, setPatients] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPatient, setChatPatient] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  // Fix Issue 10.2: replace dead myScheduledAppointments with actual accepted appointments
  const [todaysAppointments, setTodaysAppointments] = useState([]);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchAppointments = React.useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) { navigate('/login'); return; }
    try {
      const decoded = jwtDecode(token);
      setUserName(decoded.name || 'User');
      setUserId(decoded.id);
      setUserSubscription(decoded.subscription || 'Free');
    } catch { localStorage.clear(); navigate('/login'); return; }
    try {
      // Fix Bug E: use the correct doctor appointments endpoint
      const res = await axios.get(`${API_URL}/api/v1/appointments/doctorappointment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allAppointments = res.data.data;
      const pending = allAppointments.filter((app) => app.status === 'pending');
      const accepted = allAppointments.filter(
        (app) => app.status === 'accepted' || app.status === 'completed'
      );

      const formattedPendingRequests = pending.map((app) => ({
        id: app._id,
        patient: app.patientId?.name || 'Unknown Patient',
        reason: app.reason,
        date: app.appointmentDate ? new Date(app.appointmentDate).toLocaleDateString() : 'TBD',
        time: app.appointmentDate
          ? new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'TBD',
        originalApp: app,
      }));

      const formattedPatientList = accepted.map((app) => ({
        id: app.patientId?._id,
        name: app.patientId?.name || 'Unknown Patient',
        symptoms: app.reason,
        status: app.status,
        meetLink: app.meetLink || null,
        appointmentId: app._id,
      }));

      setPendingRequests(formattedPendingRequests);
      setPatients(formattedPatientList);

      // Fix Issue 10.2: populate today's appointments from actual accepted data
      const today = new Date().toDateString();
      const todays = accepted.filter((app) => {
        if (!app.appointmentDate) return false;
        return new Date(app.appointmentDate).toDateString() === today;
      }).map((app) => ({
        id: app._id,
        patient: app.patientId?.name || 'Unknown Patient',
        time: app.appointmentDate
          ? new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'TBD',
        meetLink: app.meetLink || null,
      }));
      setTodaysAppointments(todays);

    } catch (err) {
      toast.error('Error loading appointments');
      if (err.response && err.response.status === 401) { localStorage.clear(); navigate('/login'); }
    }
  }, [navigate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    if (!userId) return;
    socket.on('previousMessages', (prevMessages) => {
      const formattedMessages = prevMessages.map((msg) => ({
        text: msg.message || '',
        sender: msg.sender === userId ? 'doctor' : 'patient',
        timestamp: msg.timestamp,
        fileUrl: msg.fileUrl || null,
        fileName: msg.fileName || null,
        fileType: msg.fileType || null,
        messageType: msg.messageType || 'text',
      }));
      setMessages(formattedMessages);
    });
    socket.on('receiveMessage', (messageData) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text: messageData.message || '',
          sender: messageData.senderId === userId ? 'doctor' : 'patient',
          timestamp: messageData.timestamp,
          fileUrl: messageData.fileUrl || null,
          fileName: messageData.fileName || null,
          fileType: messageData.fileType || null,
          messageType: messageData.messageType || 'text',
        },
      ]);
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

  // File select handler (Issue 5)
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('userToken');

    // File message (Issue 5)
    if (selectedFile && chatPatient) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const { data } = await axios.post(
          `${API_URL}/api/v1/upload/medical`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        const roomId = [userId, chatPatient.id].sort().join('_');
        socket.emit('sendMessage', {
          roomId,
          senderId: userId,
          senderName: userName,
          receiverId: chatPatient.id,
          message: '',
          fileUrl: data.url,
          fileName: data.fileName,
          fileType: data.fileType,
          messageType: 'file',
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        toast.error('File upload failed. Please try again.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Text message
    if (inputMessage.trim() && chatPatient) {
      const roomId = [userId, chatPatient.id].sort().join('_');
      socket.emit('sendMessage', { roomId, senderId: userId, senderName: userName, receiverId: chatPatient.id, message: inputMessage });
      setInputMessage('');
    }
  };

  const handleRequest = async (appointmentId, action) => {
    const token = localStorage.getItem('userToken');
    try {
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      await axios.patch(
        `${API_URL}/api/v1/appointments/${appointmentId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Appointment ${action}ed successfully!`);
      fetchAppointments();
    } catch (err) {
      toast.error(`Failed to ${action} appointment.`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 text-[#1F3A4B] dark:text-[#FAFDEE] font-sans overflow-x-hidden">
      <ToastContainer autoClose={2000} />
      <Header1 />

      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>

      {/* PAGE HEADER */}
      <header className="relative z-10 px-4 md:px-10 pt-4 md:pt-6 pb-2 flex items-center gap-4">
        <div className="p-1 rounded-full bg-gradient-to-tr from-[#1F3A4B] to-[#C2F84F] shrink-0">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white dark:bg-[#1F3A4B] flex items-center justify-center">
            <Stethoscope size={26} className="text-[#1F3A4B] dark:text-[#C2F84F]" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-black text-[8px] md:text-[10px] rounded-full uppercase tracking-widest">
            {userSubscription === 'Premium' ? '⭐ Premium' : 'Free Plan'}
          </span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      <main className="relative z-10 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-10 pb-24">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-[#1F3A4B] text-[#FAFDEE] shadow-2xl relative overflow-hidden group">
              <UserCheck className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150 transition-all duration-700" size={100} />
              <p className="text-[10px] font-black uppercase text-[#C2F84F] mb-2 tracking-widest">Active Patients</p>
              <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">{patients.length} Total</h3>
            </div>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white dark:bg-white/5 border-2 border-[#1F3A4B]/10 dark:border-white/10 shadow-xl relative group">
              <Clock className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:rotate-12 transition-transform duration-500" size={100} />
              <p className="text-[10px] font-black uppercase opacity-40 text-[#1F3A4B] dark:text-[#FAFDEE] tracking-widest">Waiting</p>
              <h3 className="text-3xl md:text-5xl font-black italic uppercase leading-none mt-2">{pendingRequests.length} Requests</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-8 border-2 border-[#1F3A4B]/10 dark:border-white/20 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter mb-6 uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">Calendar</h2>
              <style>{`
                .react-calendar { border: none !important; background: transparent !important; width: 100% !important; }
                .react-calendar__navigation button { font-weight: 900 !important; font-style: italic; border: none !important; background: none !important; min-width: 44px; color: #1F3A4B !important; transition: all 0.3s; }
                .dark .react-calendar__navigation button { color: #FAFDEE !important; }
                .react-calendar__navigation button:enabled:hover { color: #C2F84F !important; }
                .react-calendar__month-view__weekdays__weekday { text-transform: uppercase; font-weight: 900; opacity: 0.6; color: #1F3A4B; }
                .dark .react-calendar__month-view__weekdays__weekday { color: #FAFDEE; }
                .react-calendar__tile { padding: 1.2em 0.5em !important; border-radius: 1.2rem !important; font-weight: 800 !important; color: inherit; border: none !important; }
                .react-calendar__tile--active { background: #1F3A4B !important; color: #C2F84F !important; }
                .dark .react-calendar__tile--active { background: #C2F84F !important; color: #1F3A4B !important; }
                @media (max-width: 768px) { .react-calendar__tile { padding: 0.8em 0.2em !important; font-size: 0.8rem; } }
              `}</style>
              <Calendar onChange={setCalendarDate} value={calendarDate} />
            </div>

            {/* Fix Issue 10.2: show actual today's appointments */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border-2 border-[#1F3A4B]/10 dark:border-white/20 shadow-2xl min-h-[380px]">
              <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter mb-6 uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">Today's Schedule</h2>
              <div className="space-y-4">
                {todaysAppointments.length === 0 ? (
                  <p className="text-center py-16 opacity-40 italic font-medium text-sm uppercase tracking-wider">No appointments today</p>
                ) : (
                  todaysAppointments.map((app) => (
                    <div key={app.id} className="p-5 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 flex flex-col gap-3 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold italic text-base uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">{app.patient}</p>
                          <p className="text-xs opacity-60 font-medium tracking-wide uppercase mt-0.5">{app.time}</p>
                        </div>
                      </div>
                      {/* Issue 2: Start Call button for doctor */}
                      {app.meetLink && (
                        <a
                          href={app.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#C2F84F] text-[#1F3A4B] rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all w-fit shadow-md"
                        >
                          <Video size={12} />
                          Start Call
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border-2 border-[#1F3A4B]/10 shadow-3xl">
            <h2 className="text-2xl md:text-4xl font-black italic mb-8 flex items-center gap-4 uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE]">
              <Clock size={32} className="text-[#C2F84F] dark:text-[#1F3A4B] bg-[#1F3A4B] dark:bg-[#C2F84F] p-1.5 rounded-xl shrink-0" /> Pending Requests
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {pendingRequests.length === 0 ? (
                <p className="text-center py-20 italic font-medium text-base uppercase tracking-wider opacity-40">No pending requests</p>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-transparent hover:border-[#C2F84F] flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all shadow-md">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#1F3A4B] dark:text-[#C2F84F] tracking-widest mb-1">{req.date} {req.time !== 'TBD' ? `· ${req.time}` : ''}</p>
                      <p className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE]">{req.patient}</p>
                      <p className="text-sm text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 font-medium mt-1.5">
                        <span className="font-semibold text-xs uppercase tracking-wider text-[#1F3A4B] dark:text-[#FAFDEE]">Reason:</span> {req.reason}
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => handleRequest(req.id, 'accept')} className="px-6 py-3 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-bold rounded-xl md:rounded-2xl text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-md">Accept</button>
                      <button onClick={() => handleRequest(req.id, 'reject')} className="p-3 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl md:rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><X size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <button onClick={() => navigate('/community-support')} className="w-full py-8 md:py-12 px-6 md:px-10 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-[#1F3A4B] to-[#2a4d61] text-white flex justify-between items-center transition-all shadow-2xl border-2 border-transparent hover:border-[#C2F84F]">
            <div className="text-left">
              <h2 className="text-2xl md:text-4xl font-black italic uppercase">Community Support</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#C2F84F] mt-1">Connect Globally</p>
            </div>
            <ChevronRight size={24} />
          </button>

          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border-2 border-[#1F3A4B]/10 shadow-3xl backdrop-blur-md relative overflow-hidden">
            <h2 className="text-xl md:text-2xl font-black italic uppercase mb-6 text-[#1F3A4B] dark:text-[#FAFDEE]">My Patients</h2>

            {/* Mobile: tap to open full-screen list */}
            <div className="block lg:hidden">
              <button onClick={() => setShowPatientList(true)} className="w-full py-8 px-6 rounded-[2rem] bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] flex justify-between items-center group relative overflow-hidden shadow-xl active:scale-95 transition-all">
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">All Patients</p>
                  <h3 className="text-xl font-black italic uppercase">View List</h3>
                </div>
                <Users size={24} />
              </button>
            </div>

            {/* Desktop: inline list */}
            <div className="hidden lg:block space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {patients.length === 0 ? (
                <p className="text-center py-20 italic opacity-40 text-sm font-medium uppercase tracking-wider">No patients yet</p>
              ) : (
                patients.map((p) => (
                  <div key={p.id} className="p-5 rounded-[1.5rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-transparent hover:border-[#C2F84F] flex flex-col items-start transition-all shadow-sm">
                    <p className="text-lg font-black italic uppercase leading-none mb-3 text-[#1F3A4B] dark:text-[#FAFDEE]">{p.name}</p>
                    <div className="flex justify-between w-full items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase opacity-60 tracking-wider">Status: Active</span>
                      <div className="flex items-center gap-2">
                        {/* Issue 2: Start Call button on patient card */}
                        {p.meetLink && (
                          <a href={p.meetLink} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#C2F84F] text-[#1F3A4B] shadow-md hover:scale-105 transition-all">
                            <Video size={14} />
                          </a>
                        )}
                        <button onClick={() => handleOpenChat(p)} className="p-3 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] shadow-lg transition-transform hover:scale-105">
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

      {/* MOBILE PATIENT LIST OVERLAY */}
      <div className={`fixed inset-0 z-[120] bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 lg:hidden ${showPatientList ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col pt-24 relative">
          <button onClick={() => setShowPatientList(false)} className="absolute top-6 left-6 z-20 group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-[#1F3A4B]/20 dark:border-white/10 bg-white/50 dark:bg-[#1F3A4B]/20 backdrop-blur-md text-[#1F3A4B] dark:text-[#FAFDEE] font-bold text-xs tracking-widest transition-all hover:shadow-lg">
            <ArrowLeft size={16} />
            <span>BACK</span>
          </button>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black italic uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">My Patients</h2>
            <p className="text-xs font-medium text-[#1F3A4B]/60 dark:text-[#FAFDEE]/60 mt-1">Tap a patient to open chat</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pb-12 pr-2 scrollbar-hide">
            {patients.map((p) => (
              <div
                key={p.id}
                onClick={() => { handleOpenChat(p); setShowPatientList(false); }}
                className="p-6 rounded-[2rem] bg-white dark:bg-[#111827] border border-[#1F3A4B]/10 active:border-[#C2F84F] flex justify-between items-center transition-all shadow-md cursor-pointer"
              >
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE]">{p.name}</h3>
                  <p className="text-[10px] font-semibold opacity-40 uppercase tracking-widest mt-1">Status: Active</p>
                </div>
                <MessageSquare size={20} className="text-[#1F3A4B] dark:text-[#C2F84F] opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHAT PANEL */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] z-[150] transition-all duration-500 ${chatOpen ? 'translate-x-0 visible' : 'translate-x-full invisible'}`}>
        <div className="absolute inset-0 bg-white dark:bg-[#0d131b] border-l-4 border-[#1F3A4B] shadow-2xl backdrop-blur-2xl" />
        <div className="h-full p-6 md:p-8 flex flex-col relative z-10 text-[#1F3A4B] dark:text-[#FAFDEE]">
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-4">
              <span className="p-2 md:p-3 bg-[#1F3A4B] dark:bg-[#C2F84F] rounded-2xl text-[#C2F84F] dark:text-[#1F3A4B]"><Heart size={20} /></span>
              <h2 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter">{chatPatient?.name}</h2>
            </div>
            <button onClick={handleCloseChat} className="p-2 bg-[#1F3A4B]/5 hover:bg-rose-600 hover:text-white transition-all rounded-full"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 px-1 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 text-[11px] font-bold leading-relaxed max-w-[85%] rounded-2xl ${m.sender === 'doctor' ? 'bg-[#1F3A4B] text-[#FAFDEE] rounded-tr-none shadow-md' : 'bg-[#C2F84F] text-[#1F3A4B] rounded-tl-none'}`}>
                  {/* File message rendering (Issue 5) */}
                  {m.messageType === 'file' ? (
                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline font-black">
                      <FileText size={14} />
                      {m.fileName || 'View Document'}
                    </a>
                  ) : (
                    <span>{m.text}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Selected file preview */}
          {selectedFile && (
            <div className="mt-2 px-4 py-2 bg-[#C2F84F]/20 rounded-xl flex items-center justify-between">
              <span className="text-[10px] font-black truncate">{selectedFile.name}</span>
              <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="ml-2 text-rose-500"><X size={14} /></button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="mt-4 bg-[#1F3A4B]/5 dark:bg-white/5 p-1 rounded-full border border-[#1F3A4B]/20 flex items-center">
            {/* File attach button (Issue 5) */}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-full flex items-center justify-center text-[#1F3A4B]/50 hover:text-[#1F3A4B] transition-all ml-1">
              <Paperclip size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
            <input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 font-bold text-xs outline-none"
              placeholder={selectedFile ? 'Press send to upload file...' : 'Type a message...'}
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