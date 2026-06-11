import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  MessageSquare, Users, Send, ChevronRight, X, Plus,
  User, Stethoscope, Heart, Paperclip, FileText, Layers,
} from 'lucide-react';

import DailyTaskCompletionChart from './othercomps/DailyTaskCompletionChart';
import DailyTaskLog         from './othercomps/DailyTaskLog';
import CurrentAppointments      from './othercomps/CurrentAppointments';
import AIChatButton             from './othercomps/AIChatButton';
import HealthVideos             from './othercomps/HealthVideos';
import Header1                  from './UIcomponents/Header1';
import { API_URL }              from '../config/api';

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
    window.open(fileUrl, '_blank');
  }
};

const PatientPage = () => {
  const navigate     = useNavigate();
  const chatEndRef   = useRef(null);
  const fileInputRef = useRef(null);

  const socketRef    = useRef(null);

  const chartRef     = useRef(null);

  const [userId,      setUserId]      = useState(null);
  const [userName,    setUserName]    = useState('USER');

  const [activeCount, setActiveCount] = useState(0);
  const [maxAllowed,  setMaxAllowed]  = useState(5);

  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
  const [chatView,        setChatView]           = useState('closed');
  const [selectedDoctor,  setSelectedDoctor]     = useState(null);
  const [messages,        setMessages]           = useState([]);
  const [inputMessage,    setInputMessage]       = useState('');
  const [doctors,         setDoctors]            = useState([]);
  const [selectedFile,    setSelectedFile]       = useState(null);
  const [isUploading,     setIsUploading]        = useState(false);


  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const fetchDoctors = useCallback(async (token, currentUserId) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/api/v1/booking-requests/my-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const seenDoctors = new Set();
      const chatDoctors = (data.data || [])
        .filter((r) => r.status === 'PAID_CONFIRMED')
        .reduce((acc, r) => {
          const doctorId = r.doctorId?._id;
          if (!doctorId || seenDoctors.has(doctorId)) return acc;
          seenDoctors.add(doctorId);
          acc.push({
            id:       doctorId,
            name:     r.doctorId?.name || 'UNKNOWN DOCTOR',
            meetLink: r.meetLink || null,
            roomId:   [currentUserId, doctorId].sort().join('_'),
          });
          return acc;
        }, []);

      setDoctors(chatDoctors);

      const meta = data.meta || {};
      setActiveCount(meta.activeCount ?? 0);
      setMaxAllowed(meta.maxAllowed ?? 5);
    } catch (err) {
      console.error('Error fetching booking requests:', err);
      setDoctors([]);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserName((decoded.name || 'USER').toUpperCase());
        setUserId(decoded.id);
        fetchDoctors(token, decoded.id);
      } catch {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate, fetchDoctors]);


  useEffect(() => {
    if (!userId) return;

    const sock = io(API_URL);
    socketRef.current = sock;
    sock.emit('joinUserRoom', userId);

    const onPreviousMessages = (prevMessages) => {
      setMessages(
        prevMessages.map((msg) => ({
          text:        msg.message || '',
          sender:      msg.sender === userId ? 'user' : 'doctor',
          timestamp:   msg.timestamp,
          fileUrl:     msg.fileUrl   || null,
          fileName:    msg.fileName  || null,
          fileType:    msg.fileType  || null,
          messageType: msg.messageType || 'text',
        }))
      );
    };

    const onReceiveMessage = (messageData) => {
      setMessages((prev) => [
        ...prev,
        {
          text:        messageData.message || '',
          sender:      messageData.senderId === userId ? 'user' : 'doctor',
          timestamp:   messageData.timestamp,
          fileUrl:     messageData.fileUrl   || null,
          fileName:    messageData.fileName  || null,
          fileType:    messageData.fileType  || null,
          messageType: messageData.messageType || 'text',
        },
      ]);
    };

    const onAppointmentAborted = () => {
      setAppointmentRefreshKey((prev) => prev + 1);
      const token = localStorage.getItem('userToken');
      if (token) fetchDoctors(token, userId);
    };

    sock.on('previousMessages',     onPreviousMessages);
    sock.on('receiveMessage',        onReceiveMessage);
    sock.on('appointment_aborted',   onAppointmentAborted);

    return () => {
      sock.off('previousMessages',   onPreviousMessages);
      sock.off('receiveMessage',      onReceiveMessage);
      sock.off('appointment_aborted', onAppointmentAborted);
      sock.disconnect();
    };
  }, [userId, fetchDoctors]);

  const handleSelectDoctor = (doctor) => {
    const roomId = [userId, doctor.id].sort().join('_');
    setSelectedDoctor({ ...doctor, roomId });
    setChatView('chatting');
    setMessages([]);
    if (userId && socketRef.current) {
      socketRef.current.emit('joinRoom', { roomId, userId, role: 'patient' });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('FILE TOO LARGE. MAX 10MB.'); return; }
    setSelectedFile(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('userToken');

    if (selectedFile && selectedDoctor) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const { data } = await axios.post(
          `${API_URL}/api/v1/upload/medical`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        socketRef.current?.emit('sendMessage', {
          roomId:      selectedDoctor.roomId,
          senderId:    userId,
          senderName:  userName,
          receiverId:  selectedDoctor.id,
          message:     '',
          fileUrl:     data.url,
          fileName:    data.fileName,
          fileType:    data.fileType,
          messageType: 'file',
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch { alert('FILE UPLOAD FAILED. PLEASE TRY AGAIN.'); }
      finally   { setIsUploading(false); }
      return;
    }

    if (inputMessage.trim() && selectedDoctor) {
      socketRef.current?.emit('sendMessage', {
        roomId:     selectedDoctor.roomId,
        senderId:   userId,
        senderName: userName,
        receiverId: selectedDoctor.id,
        message:    inputMessage,
      });
      setInputMessage('');
    }
  };


  const triggerChartRefresh = useCallback(() => {
    chartRef.current?.refresh();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 text-[#1F3A4B] dark:text-[#FAFDEE] font-roboto-slab overflow-x-hidden antialiased">
      <Header1 />

      <div
        className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{ willChange: 'filter' }}
      >
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px] dark:blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px] dark:blur-[100px]" />
      </div>

      {/* Main Header Row Tracker */}
      <header className="relative z-10 px-4 md:px-10 pt-4 md:pt-6 pb-2 flex items-center gap-4">
        <div className="p-1 rounded-full bg-gradient-to-tr from-[#1F3A4B] to-[#C2F84F] shrink-0 shadow-md">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white dark:bg-[#1F3A4B] flex items-center justify-center">
            <User size={26} className="text-[#1F3A4B] dark:text-[#C2F84F]" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-bold text-xs rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
            <Layers size={12} />
            {activeCount} / {maxAllowed} REQUESTS ACTIVE
          </span>
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      <main className="relative z-10 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-10 pb-24">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">

          {/* Top Status Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-[#1F3A4B] text-[#FAFDEE] shadow-2xl relative overflow-hidden group">
              <Stethoscope className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150" size={100} />
              <p className="text-xs font-bold uppercase text-[#C2F84F] mb-2 tracking-widest">PROGRESS</p>
              <h3 className="text-3xl md:text-5xl font-extrabold italic uppercase tracking-tighter font-sans leading-none">ON TRACK</h3>
            </div>

            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white dark:bg-white/5 border-2 border-[#1F3A4B]/10 dark:border-white/10 shadow-xl relative group">
              <Users size={32} className="text-[#1F3A4B] dark:text-[#C2F84F] mb-4 shadow-sm" />
              <p className="text-xs font-bold uppercase opacity-50 text-[#1F3A4B] dark:text-[#FAFDEE] tracking-widest">MY DOCTORS</p>
              <h3 className="text-4xl md:text-6xl font-extrabold italic uppercase leading-none mt-2 font-sans">
                {doctors.length}
              </h3>
            </div>
          </div>

          {/* Chart + Log Grid Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-4 border border-[#1F3A4B]/10 dark:border-white/5 shadow-2xl overflow-hidden">

              <DailyTaskCompletionChart ref={chartRef} />
            </div>
            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-4 border border-[#1F3A4B]/10 dark:border-white/5 shadow-2xl overflow-hidden">
              <DailyTaskLog onTaskUpdate={triggerChartRefresh} />
            </div>
          </div>

          {/* My Consultations Module Wrapper */}
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border border-[#1F3A4B]/10 dark:border-white/5 shadow-3xl overflow-hidden relative">
            <div className="relative z-10 w-full">
              <div className="flex justify-between items-center gap-2 mb-6 md:mb-10">
                <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tighter italic text-[#1F3A4B] dark:text-[#FAFDEE] uppercase font-sans leading-none">
                  MY CONSULTATIONS
                </h2>
                <Link
                  to="/book-appointment"
                  className="h-12 w-12 md:h-14 md:w-14 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shrink-0"
                  title="BOOK NEW CONSULTATION"
                >
                  <Plus size={22} className="md:size-6" />
                </Link>
              </div>

              <div className="w-full overflow-x-auto min-w-0">
                <CurrentAppointments refreshTrigger={appointmentRefreshKey} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Action Rail Blocks */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <Link
            to="/community-support"
            className="w-full py-8 md:py-12 px-6 md:px-10 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-[#1F3A4B] to-[#254d63] text-white flex justify-between items-center transition-all shadow-2xl border-2 border-transparent hover:border-[#C2F84F]"
          >
            <div className="text-left relative z-10">
              <h2 className="text-2xl md:text-4xl font-extrabold italic uppercase font-sans leading-none mb-1.5">COMMUNITY SUPPORT</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C2F84F]">CONNECT WITH OTHERS</p>
            </div>
            <ChevronRight size={24} />
          </Link>

          <div
            className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] bg-white dark:bg-white/5 border border-[#1F3A4B]/10 dark:border-white/5 flex flex-col items-center justify-center text-center gap-6 shadow-2xl cursor-pointer hover:border-[#C2F84F] border-2 border-transparent transition-all group"
            onClick={() => setChatView('doctorList')}
          >
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-[#1F3A4B] dark:bg-[#FAFDEE] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform">
              <MessageSquare size={36} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold italic text-[#1F3A4B] dark:text-[#FAFDEE] uppercase font-sans mb-1.5">
                CHAT WITH DOCTORS
              </h2>
              <p className="text-xs font-bold tracking-widest opacity-50 uppercase">
                {doctors.length > 0
                  ? `DIRECT MESSAGE (${doctors.length} CONFIRMED)`
                  : 'AVAILABLE AFTER PAYMENT CONFIRMATION'}
              </p>
            </div>
          </div>

          <HealthVideos />
        </div>
      </main>

      {/* ── Chat Side Panel Overlays ── */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] z-[100] transition-all duration-500 will-change-transform ${
          chatView === 'closed' ? 'translate-x-full invisible' : 'translate-x-0 visible'
        }`}
      >
        <div className="absolute inset-0 bg-white dark:bg-[#0d131b] border-l-4 border-[#1F3A4B] dark:border-[#C2F84F] shadow-2xl backdrop-blur-2xl" />
        <div className="h-full w-full p-6 md:p-8 flex flex-col relative z-10 text-[#1F3A4B] dark:text-[#FAFDEE]">
          
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-4">
              <span className="p-3 bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] rounded-2xl shadow-md">
                <Heart size={22} />
              </span>
              <h2 className="text-xl md:text-3xl font-extrabold italic uppercase font-sans leading-none">MESSAGES</h2>
            </div>
            <button
              onClick={() => setChatView('closed')}
              className="p-2.5 bg-[#1F3A4B]/5 dark:bg-white/5 hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white dark:hover:text-white transition-all rounded-full shadow-sm active:scale-95"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {chatView === 'doctorList' ? (
              <div className="space-y-4 pt-2 overflow-y-auto pr-1 flex-1">
                <p className="text-xs font-bold uppercase text-[#1F3A4B] dark:text-[#C2F84F] tracking-widest mb-4 ml-1">
                  CONFIRMED DOCTORS
                </p>
                {doctors.length === 0 ? (
                  <div className="text-center py-16 space-y-2">
                    <p className="italic opacity-50 text-base uppercase font-bold">NO CONFIRMED APPOINTMENTS YET.</p>
                    <p className="text-xs font-bold uppercase opacity-40 tracking-wider">
                      CHAT UNLOCKS AFTER PAYMENT CONFIRMATION.
                    </p>
                  </div>
                ) : (
                  doctors.map((dr) => (
                    <button
                      key={dr.id}
                      onClick={() => handleSelectDoctor(dr)}
                      className="w-full p-6 rounded-[2rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 dark:border-white/5 flex justify-between items-center hover:bg-[#1F3A4B] hover:text-[#C2F84F] transition-all shadow-sm group"
                    >
                      <div className="text-left">
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mb-1">DOCTOR</p>
                        <span className="text-lg md:text-xl font-extrabold italic font-sans uppercase">{dr.name.toUpperCase()}</span>
                      </div>
                      <ChevronRight size={20} className="transform group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
                <button
                  onClick={() => setChatView('doctorList')}
                  className="w-fit mb-5 text-xs font-bold uppercase text-[#1F3A4B] dark:text-[#C2F84F] border-b-2 border-current pb-1 flex items-center gap-2 tracking-wider"
                >
                  <ChevronRight size={12} className="rotate-180" /> BACK TO LIST
                </button>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0
                  [&::-webkit-scrollbar]:w-1.5
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:bg-[#1F3A4B]/20
                  dark:[&::-webkit-scrollbar-thumb]:bg-white/10"
                >
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`p-4 text-sm font-bold leading-relaxed max-w-[85%] rounded-[1.5rem] shadow-sm ${
                          m.sender === 'user'
                            ? 'bg-[#1F3A4B] text-[#FAFDEE] rounded-tr-none shadow-md'
                            : 'bg-[#C2F84F] text-[#1F3A4B] rounded-tl-none border border-transparent dark:border-white/5'
                        }`}
                      >
                        {m.messageType === 'file' ? (
                          <button
                            type="button"
                            onClick={() => handleFileDownload(m.fileUrl, m.fileName)}
                            className="flex items-center gap-2 underline font-extrabold uppercase text-xs tracking-wider border-0 bg-transparent p-0 cursor-pointer text-inherit"
                          >
                            <FileText size={16} />{m.fileName ? m.fileName.toUpperCase() : 'DOWNLOAD FILE'}
                          </button>
                        ) : (
                          <span className="uppercase tracking-wide">{m.text.toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {selectedFile && (
                  <div className="mt-3 px-5 py-3 bg-[#C2F84F]/20 rounded-xl flex items-center justify-between border border-[#C2F84F]/30 shadow-inner">
                    <span className="text-xs font-bold truncate text-[#1F3A4B] dark:text-[#C2F84F] uppercase tracking-wide">{selectedFile.name}</span>
                    <button
                      onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="ml-2 text-rose-500 hover:scale-105 transition-transform"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="mt-4 bg-[#1F3A4B]/5 dark:bg-white/5 p-1 rounded-full border-2 border-[#1F3A4B]/10 dark:border-white/10 flex items-center shadow-inner"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-12 w-12 rounded-full flex items-center justify-center text-[#1F3A4B]/50 dark:text-white/40 hover:text-[#1F3A4B] dark:hover:text-[#C2F84F] transition-all ml-1"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 outline-none font-bold text-sm uppercase tracking-wide placeholder:text-xs"
                    placeholder={selectedFile ? 'PRESS SEND TO UPLOAD FILE...' : 'TYPE A MESSAGE...'}
                    disabled={!!selectedFile}
                  />
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="h-12 w-12 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center transition-all disabled:opacity-50 shadow-md shrink-0 active:scale-95"
                  >
                    {isUploading
                      ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <Send size={18} />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {chatView === 'closed' && <AIChatButton />}
    </div>
  );
};

export default PatientPage;