import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  MessageSquare, Users,
  Send, ChevronRight, X, Plus, User, Stethoscope, Heart, Paperclip, FileText
} from 'lucide-react';

import DailyTaskCompletionChart from './othercomps/DailyTaskCompletionChart';
import DailyTaskLog from './othercomps/DailyTaskLog';
import CurrentAppointments from './othercomps/CurrentAppointments';
import AIChatButton from './othercomps/AIChatButton';
import HealthVideos from './othercomps/HealthVideos';
import Header1 from './UIcomponents/Header1';
import { API_URL } from '../config/api';

const socket = io(`${API_URL}`);

const PatientPage = () => {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('User');
  const [userSubscription, setUserSubscription] = useState('Free');
  const [refreshChartKey, setRefreshChartKey] = useState(0);
  const [chatView, setChatView] = useState('closed');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchDoctors = useCallback(async (token) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/appointments/patient-doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const uniqueDoctorsMap = {};
      response.data.data.forEach((app) => {
        if (app.doctorId && app.doctorId._id) {
          uniqueDoctorsMap[app.doctorId._id] = {
            id: app.doctorId._id,
            name: app.doctorId.name || 'Unknown Doctor',
            meetLink: app.meetLink || null,
            roomId: [app.patientId || '', app.doctorId._id].sort().join('_'),
          };
        }
      });
      setDoctors(Object.values(uniqueDoctorsMap));
    } catch (err) {
      console.error('Error fetching accepted doctors:', err);
      setDoctors([]);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserName(decoded.name || 'User');
        setUserSubscription(decoded.subscription || 'Free');
        const patientId = decoded.id;
        setUserId(patientId);
        fetchDoctors(token);
      } catch (err) {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }

    socket.on('previousMessages', (prevMessages) => {
      const formattedMessages = prevMessages.map((msg) => ({
        text: msg.message || '',
        sender: msg.sender === userId ? 'user' : 'doctor',
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
          sender: messageData.senderId === userId ? 'user' : 'doctor',
          timestamp: messageData.timestamp,
          fileUrl: messageData.fileUrl || null,
          fileName: messageData.fileName || null,
          fileType: messageData.fileType || null,
          messageType: messageData.messageType || 'text',
        },
      ]);
    });

    return () => {
      socket.off('previousMessages');
      socket.off('receiveMessage');
    };
  }, [navigate, userId, fetchDoctors]);

  const handleSelectDoctor = (doctor) => {
    const roomId = [userId, doctor.id].sort().join('_');
    setSelectedDoctor({ ...doctor, roomId });
    setChatView('chatting');
    setMessages([]);
    if (userId) socket.emit('joinRoom', { roomId, userId, role: 'patient' });
  };

  // Handle file selection (Issue 5)
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Max 10MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('userToken');

    // File message (Issue 5)
    if (selectedFile && selectedDoctor) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const { data } = await axios.post(
          `${API_URL}/api/v1/upload/medical`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        socket.emit('sendMessage', {
          roomId: selectedDoctor.roomId,
          senderId: userId,
          senderName: userName,
          receiverId: selectedDoctor.id,
          message: '',
          fileUrl: data.url,
          fileName: data.fileName,
          fileType: data.fileType,
          messageType: 'file',
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        alert('File upload failed. Please try again.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Text message
    if (inputMessage.trim() && selectedDoctor) {
      socket.emit('sendMessage', {
        roomId: selectedDoctor.roomId,
        senderId: userId,
        senderName: userName,
        receiverId: selectedDoctor.id,
        message: inputMessage,
      });
      setInputMessage('');
    }
  };

  const triggerChartRefresh = useCallback(() => {
    setRefreshChartKey((prevKey) => prevKey + 1);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 text-[#1F3A4B] dark:text-[#FAFDEE] font-sans overflow-x-hidden">
      <Header1 />

      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px] dark:blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px] dark:blur-[100px]" />
      </div>

      {/* PAGE HEADER */}
      <header className="relative z-10 px-4 md:px-10 pt-4 md:pt-6 pb-2 flex items-center gap-4">
        <div className="p-1 rounded-full bg-gradient-to-tr from-[#1F3A4B] to-[#C2F84F] shrink-0">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white dark:bg-[#1F3A4B] flex items-center justify-center">
            <User size={26} className="text-[#1F3A4B] dark:text-[#C2F84F]" />
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
              <Stethoscope className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150" size={100} />
              <p className="text-[10px] font-black uppercase text-[#C2F84F] mb-2 tracking-widest">Progress</p>
              <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">On Track</h3>
            </div>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white dark:bg-white/5 border-2 border-[#1F3A4B]/10 dark:border-white/10 shadow-xl relative group">
              <Users size={30} className="text-[#1F3A4B] dark:text-[#C2F84F] mb-4" />
              <p className="text-[10px] font-black uppercase opacity-40 text-[#1F3A4B] dark:text-[#FAFDEE] tracking-widest">My Doctors</p>
              <h3 className="text-4xl md:text-6xl font-black italic uppercase leading-none mt-2">{doctors.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-8 border border-[#1F3A4B]/10 shadow-2xl">
              <DailyTaskCompletionChart key={refreshChartKey} />
            </div>
            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 border border-[#1F3A4B]/10 shadow-2xl">
              <DailyTaskLog onTaskUpdate={triggerChartRefresh} />
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border border-[#1F3A4B]/10 shadow-3xl overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <h2 className="text-2xl md:text-4xl font-black tracking-tighter italic text-[#1F3A4B] dark:text-[#FAFDEE]">UPCOMING APPOINTMENTS</h2>
                <Link to="/book-appointment" className="h-10 w-10 md:h-14 md:w-14 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-xl">
                  <Plus size={24} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <CurrentAppointments />
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <Link to="/community-support" className="w-full py-8 md:py-12 px-6 md:px-10 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-[#1F3A4B] to-[#254d63] text-white flex justify-between items-center transition-all shadow-2xl border-2 border-transparent hover:border-[#C2F84F]">
            <div className="text-left relative z-10">
              <h2 className="text-2xl md:text-4xl font-black italic uppercase">Community Support</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#C2F84F] mt-1">Connect with others</p>
            </div>
            <ChevronRight size={24} />
          </Link>

          <div
            className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] bg-white dark:bg-white/5 border border-[#1F3A4B]/10 flex flex-col items-center justify-center text-center gap-6 shadow-2xl cursor-pointer"
            onClick={() => setChatView('doctorList')}
          >
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-[#1F3A4B] dark:bg-[#FAFDEE] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center shadow-2xl">
              <MessageSquare size={36} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black italic text-[#1F3A4B] dark:text-[#FAFDEE]">CHAT WITH DOCTORS</h2>
              <p className="text-[10px] font-black tracking-widest opacity-40 uppercase">Direct Message ({doctors.length})</p>
            </div>
          </div>

          {/* Health Education Videos — Issue 3 */}
          <HealthVideos />
        </div>
      </main>

      {/* CHAT OVERLAY */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] z-[100] transition-all duration-500 will-change-transform ${chatView === 'closed' ? 'translate-x-full invisible' : 'translate-x-0 visible'}`}>
        <div className="absolute inset-0 bg-white dark:bg-[#0d131b] border-l-4 border-[#1F3A4B] shadow-2xl backdrop-blur-2xl" />
        <div className="h-full w-full p-6 md:p-8 flex flex-col relative z-10 text-[#1F3A4B] dark:text-[#FAFDEE]">
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-4">
              <span className="p-2 md:p-3 bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] rounded-2xl"><Heart size={20} /></span>
              <h2 className="text-lg md:text-2xl font-black italic">Messages</h2>
            </div>
            <button onClick={() => setChatView('closed')} className="p-2 bg-[#1F3A4B]/5 hover:bg-rose-600 hover:text-white transition-all rounded-full"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {chatView === 'doctorList' ? (
              <div className="space-y-4 pt-4 overflow-y-auto pr-1">
                <p className="text-[10px] font-black uppercase text-[#1F3A4B] dark:text-[#C2F84F] tracking-widest mb-4">Your Available Doctors</p>
                {doctors.map((dr) => (
                  <button key={dr.id} onClick={() => handleSelectDoctor(dr)} className="w-full p-6 rounded-[1.5rem] bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 flex justify-between items-center hover:bg-[#1F3A4B] hover:text-[#C2F84F] transition-all">
                    <div className="text-left">
                      <p className="text-[8px] opacity-40 font-black uppercase tracking-widest">Doctor</p>
                      <span className="text-lg font-black italic">{dr.name}</span>
                    </div>
                    <ChevronRight size={20} />
                  </button>
                ))}
                {doctors.length === 0 && <p className="text-center italic opacity-40 mt-10">No doctors assigned yet.</p>}
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden px-1">
                <button onClick={() => setChatView('doctorList')} className="w-fit mb-4 text-[10px] font-black uppercase text-[#1F3A4B] dark:text-[#C2F84F] border-b border-current pb-1 flex items-center gap-2">
                  <ChevronRight size={12} className="rotate-180" /> Back to list
                </button>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 text-[11px] font-bold leading-relaxed max-w-[85%] rounded-2xl ${m.sender === 'user' ? 'bg-[#1F3A4B] text-[#FAFDEE] rounded-tr-none shadow-md' : 'bg-[#C2F84F] text-[#1F3A4B] rounded-tl-none'}`}>
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
                    value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 outline-none font-bold text-xs"
                    placeholder={selectedFile ? 'Press send to upload file...' : 'Type a message...'}
                    disabled={!!selectedFile}
                  />
                  <button type="submit" disabled={isUploading}
                    className="h-10 w-10 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center transition-all disabled:opacity-50">
                    {isUploading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
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