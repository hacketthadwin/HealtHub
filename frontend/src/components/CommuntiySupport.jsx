import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Send, 
  MessageCircle, 
  HelpCircle, 
  User, 
  CheckCircle, 
  Activity, 
  XCircle,
  ArrowLeft
} from 'lucide-react';

import { API_URL } from "../config/api";

const API_BASE = `${API_URL}/api/v1`;

const token = localStorage.getItem('userToken');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const CommunitySupport = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [questionsList, setQuestionsList] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${API_BASE}/community/problems`);
        const initialized = response.data.map(item => ({
          ...item,
          isAnswering: false,
          newAnswerContent: ''
        }));
        setQuestionsList(initialized);
      } catch (error) {
        console.error('Error fetching questions:', error.response?.data || error.message);
      }
    };
    fetchQuestions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = question.trim();
    if (!text) return;

    try {
      const res = await axios.post(`${API_BASE}/community/problem`, { title: text });
      setQuestionsList(prev => [
        { ...res.data, isAnswering: false, newAnswerContent: '', answers: [] },
        ...prev
      ]);
      setQuestion('');
    } catch (err) {
      console.error('Error posting question:', err.response?.data || err.message);
    }
  };

  const toggleAnswerInput = (id) => {
    setQuestionsList(prev => prev.map(q =>
      q._id === id ? { ...q, isAnswering: !q.isAnswering } : q
    ));
  };

  const handleAnswerChange = (id, value) => {
    setQuestionsList(prev => prev.map(q =>
      q._id === id ? { ...q, newAnswerContent: value } : q
    ));
  };

  const submitAnswer = async (id) => {
    const questionObj = questionsList.find(q => q._id === id);
    const content = (questionObj.newAnswerContent || '').trim();
    if (!content) return;

    try {
      const res = await axios.post(`${API_BASE}/community/answer/${id}`, { content });
      const newAnswer = res.data;

      setQuestionsList(prev => prev.map(q => {
        if (q._id === id) {
          return {
            ...q,
            isAnswering: false,
            newAnswerContent: '',
            answers: [...(q.answers || []), newAnswer]
          };
        }
        return q;
      }));
    } catch (err) {
      console.error('Error submitting answer:', err.response?.data || err.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFDEE] dark:bg-[#0a111a] transition-all duration-500 font-roboto-slab pt-24 pb-24 px-4 md:px-6 relative overflow-x-hidden antialiased">
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>

      {/* Professional Back Button — Position adjusted for responsive alignment layout */}
      <button 
        onClick={() => navigate('/patient')} 
        className="absolute top-6 left-4 md:top-8 md:left-8 z-20 group flex items-center justify-center gap-3.5 h-12 w-12 md:h-auto md:w-auto md:px-6 md:py-3.5 rounded-full border border-neutral-200/40 dark:border-white/5 bg-white/40 dark:bg-neutral-950/20 backdrop-blur-md text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 text-sm font-bold tracking-widest transition-all duration-300 hover:text-emerald-600 dark:hover:text-[#C2F84F] hover:border-neutral-300/60 dark:hover:border-white/20 hover:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.05)] uppercase"
      >
        <ArrowLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
        <span className="hidden md:inline leading-none pt-[1px]">BACK</span>
      </button>

      <div className="max-w-5xl mx-auto relative z-10 mt-6 md:mt-10">
        {/* HEADER — Expanded Typography Scales */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-extrabold italic tracking-tighter uppercase leading-none text-[#1F3A4B] dark:text-[#FAFDEE] mb-4 font-sans">
            PEER <span className="text-[#1F3A4B]/40 dark:text-[#C2F84F]">HUB</span>
          </h1>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-70 text-[#1F3A4B] dark:text-[#FAFDEE]">
            VERIFIED COMMUNITY SUPPORT BASE
          </p>
        </div>

        {/* POST QUESTION BOX */}
        <form 
          onSubmit={handleSubmit} 
          className="flex flex-col sm:flex-row items-center mb-16 gap-4 bg-white dark:bg-white/5 backdrop-blur-2xl border-2 border-[#1F3A4B]/10 dark:border-white/5 p-4 rounded-[2rem] sm:rounded-[3rem] shadow-2xl"
        >
          <div className="flex-1 w-full flex items-center px-2 sm:px-4 gap-4">
            <HelpCircle className="text-[#1F3A4B] dark:text-[#C2F84F] opacity-40 shrink-0" />
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="ASK THE COMMUNITY ABOUT CLINICAL PROTOCOLS..."
              className="w-full bg-transparent py-4 text-[#1F3A4B] dark:text-white placeholder-[#1F3A4B]/30 dark:placeholder-white/30 font-bold outline-none text-base md:text-lg uppercase tracking-wide"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-10 py-5 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-bold italic rounded-[1.5rem] sm:rounded-[2rem] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-base tracking-wider uppercase shrink-0"
          >
            <Send size={18} />
            POST TO COMMUNITY
          </button>
        </form>

        {/* FEED */}
        <div className="space-y-8">
          {questionsList.map(q => (
            <div
              key={q._id}
              className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border-2 border-[#1F3A4B]/5 dark:border-white/5 p-6 md:p-10 shadow-3xl flex flex-col justify-between transition-all hover:border-[#1F3A4B]/20 dark:hover:border-white/20"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 w-full min-w-0">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="p-3 rounded-2xl bg-[#1F3A4B] text-[#C2F84F] shrink-0 shadow-lg">
                    <MessageCircle size={24}/>
                  </div>
                  {/* Forum titles mapped inside clear fonts */}
                  <p className="text-xl sm:text-3xl font-extrabold italic tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE] uppercase font-sans leading-tight truncate w-full flex-1">
                    {q.title.toUpperCase()}
                  </p>
                </div>
                <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs tracking-widest uppercase shrink-0 ${q.answers?.length > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'}`}>
                  {q.answers?.length > 0 ? <CheckCircle size={12}/> : <Activity size={12}/>}
                  {q.answers?.length > 0 ? 'VERIFIED' : 'UNRESOLVED'}
                </span>
              </div>

              {/* ANSWERS CONTAINER */}
              {q.answers?.length > 0 && (
                <div className="space-y-4 mb-8 border-l-4 border-[#C2F84F]/40 pl-4 md:pl-6">
                  {q.answers.map(ans => (
                    <div key={ans._id} className="relative p-4 rounded-2xl bg-[#1F3A4B]/5 dark:bg-white/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="opacity-40" />
                        <strong className="text-xs font-bold uppercase tracking-widest opacity-50 text-[#1F3A4B] dark:text-[#FAFDEE]">
                          {ans.author?.name ? ans.author.name.toUpperCase() : 'HUB_PEER'}
                        </strong>
                      </div>
                      <p className="text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 text-base font-bold leading-relaxed uppercase tracking-wide">
                        {ans.content.toUpperCase()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* INPUT AREA */}
              {q.isAnswering ? (
                <div className="space-y-4 pt-6 border-t-2 border-[#1F3A4B]/5 w-full">
                  <textarea
                    value={q.newAnswerContent}
                    onChange={e => handleAnswerChange(q._id, e.target.value)}
                    rows={3}
                    className="w-full p-5 md:p-6 bg-[#1F3A4B]/5 dark:bg-white/5 rounded-2xl md:rounded-3xl text-[#1F3A4B] dark:text-white font-bold outline-none border-2 border-transparent focus:border-[#C2F84F] transition-all text-base uppercase tracking-wide placeholder:text-sm"
                    placeholder="PROVIDE SUPPORTIVE KNOWLEDGE..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => submitAnswer(q._id)}
                      className="px-8 py-4 bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] font-bold rounded-xl md:rounded-2xl transition-all text-sm tracking-wider uppercase shadow-md"
                    >
                      SUBMIT
                    </button>
                    <button
                      onClick={() => toggleAnswerInput(q._id)}
                      className="px-8 py-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 font-bold rounded-xl md:rounded-2xl flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all text-sm tracking-wider uppercase shadow-md"
                    >
                      <XCircle size={16}/> CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-start">
                  <button
                    onClick={() => toggleAnswerInput(q._id)}
                    className="w-full sm:w-auto px-10 py-4 bg-[#C2F84F] text-[#1F3A4B] font-bold italic rounded-[1.5rem] sm:rounded-[2rem] hover:scale-105 active:scale-95 transition-all shadow-lg border border-[#1F3A4B]/10 text-base tracking-wider uppercase"
                  >
                    SEND MESSAGE
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunitySupport;